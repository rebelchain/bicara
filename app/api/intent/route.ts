import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';
import { NextRequest, NextResponse } from 'next/server';
import {
  parseIntentFallback,
  type PaymentIntent,
  type PhoneTabId,
  type VoiceAction,
} from '@/lib/bicara-engine';

const INTENT_SYSTEM_INSTRUCTION = `
You are the unified voice command and payment intent parser for Bicara, an eyes-free Solana Mobile USDC wallet for visually impaired users and informal traders.
Users speak Indonesian, English, or mixed code-switching.
Return ONLY valid JSON matching the schema.

Supported actions:
- "send": transfer/pay USDC or SOL to a recipient ("kirim 5 dolar ke Ahmad", "transfer dua puluh USDC ke Budi")
- "navigate": switch tabs ("buka kontak" -> targetTab: "contacts", "buka riwayat" -> targetTab: "history", "kembali ke beranda" -> targetTab: "home")
- "check_balance": ask current wallet balance ("cek saldo", "berapa saldo saya")
- "list_contacts": read saved contacts aloud ("baca kontak", "daftar kontak") -> targetTab: "contacts"
- "read_history": read recent transaction history ("baca riwayat", "transaksi terakhir") -> targetTab: "history"
- "confirm": explicit confirmation ("ya", "konfirmasi", "setuju", "lanjut")
- "cancel": cancel current confirmation ("batal", "jangan", "cancel")
- "repeat": repeat last spoken announcement ("ulangi", "baca ulang")
- "help": ask for available voice commands ("bantuan", "panduan", "menu suara")
- "unknown": non-app chitchat ("cuaca hari ini bagaimana?")

Payment rules:
- "dolar", "dollar", "USD", "$", "bucks", "usdc" => currency: "USDC"
- "SOL", "solana" => currency: "SOL"
- Default currency for send commands => "USDC"
- Parse Indonesian and English spoken numbers ("lima" => 5, "dua puluh" => 20, "dua setengah" => 2.5)
- Capitalize recipient name cleanly ("ahmad" => "Ahmad")
- If send is missing amount or recipient => confidence: "low"
`.trim();

const VALID_ACTIONS = new Set<VoiceAction>([
  'send',
  'navigate',
  'check_balance',
  'list_contacts',
  'read_history',
  'confirm',
  'cancel',
  'repeat',
  'help',
  'unknown',
]);

const VALID_TABS = new Set<PhoneTabId>(['home', 'contacts', 'history']);

export async function POST(req: NextRequest) {
  const startedAt = Date.now();
  try {
    const body = (await req.json()) as {
      transcript?: string;
      mode?: 'ai' | 'fallback';
      contactNames?: string[];
    };

    const transcript = (body.transcript ?? '').trim();
    if (!transcript) {
      return NextResponse.json(
        { error: 'Transcript is required.' },
        { status: 400 }
      );
    }

    if (body.mode === 'fallback') {
      const intent = parseIntentFallback(transcript);
      return NextResponse.json({
        intent,
        engine: 'deterministic-fallback',
        latencyMs: Date.now() - startedAt,
      });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
      return NextResponse.json(
        {
          error:
            'GEMINI_API_KEY is not configured in server secrets. Switch NLU mode to Offline Fallback or configure GEMINI_API_KEY in Settings > Secrets.',
        },
        { status: 503 }
      );
    }

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

    const contactHint =
      Array.isArray(body.contactNames) && body.contactNames.length > 0
        ? `\nKnown user contacts (spelling hints only): ${body.contactNames.join(', ')}`
        : '';

    const response = await ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: `Spoken transcript: "${transcript}"${contactHint}`,
      config: {
        systemInstruction: INTENT_SYSTEM_INSTRUCTION,
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            action: {
              type: Type.STRING,
              enum: [
                'send',
                'navigate',
                'check_balance',
                'list_contacts',
                'read_history',
                'confirm',
                'cancel',
                'repeat',
                'help',
                'unknown',
              ],
            },
            targetTab: {
              type: Type.STRING,
              enum: ['home', 'contacts', 'history'],
              nullable: true,
            },
            amount: {
              type: Type.NUMBER,
              nullable: true,
            },
            currency: {
              type: Type.STRING,
              enum: ['USDC', 'SOL'],
              nullable: true,
            },
            recipient: {
              type: Type.STRING,
              nullable: true,
            },
            confidence: {
              type: Type.STRING,
              enum: ['high', 'low'],
            },
            raw_amount_text: {
              type: Type.STRING,
              nullable: true,
            },
          },
          required: ['action', 'confidence'],
        },
      },
    });

    const rawText = (response.text ?? '').trim();
    const parsed = JSON.parse(rawText) as Partial<PaymentIntent>;
    const action: VoiceAction =
      parsed.action && VALID_ACTIONS.has(parsed.action) ? parsed.action : 'unknown';

    const targetTab: PhoneTabId | null =
      parsed.targetTab && VALID_TABS.has(parsed.targetTab)
        ? parsed.targetTab
        : action === 'list_contacts'
          ? 'contacts'
          : action === 'read_history'
            ? 'history'
            : null;

    const intent: PaymentIntent = {
      action,
      targetTab,
      amount:
        typeof parsed.amount === 'number' && Number.isFinite(parsed.amount)
          ? parsed.amount
          : null,
      currency:
        parsed.currency === 'SOL'
          ? 'SOL'
          : parsed.currency === 'USDC'
            ? 'USDC'
            : action === 'send'
              ? 'USDC'
              : null,
      recipient:
        typeof parsed.recipient === 'string' && parsed.recipient.trim()
          ? parsed.recipient.trim()
          : null,
      confidence: parsed.confidence === 'low' ? 'low' : 'high',
      raw_amount_text:
        typeof parsed.raw_amount_text === 'string'
          ? parsed.raw_amount_text
          : null,
    };

    return NextResponse.json({
      intent,
      engine: 'gemini-4-hydrogen',
      latencyMs: Date.now() - startedAt,
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : 'Failed to parse voice intent';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
