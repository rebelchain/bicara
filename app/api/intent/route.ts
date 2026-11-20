import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';
import { NextRequest, NextResponse } from 'next/server';
import {
  parseIntentFallback,
  type PaymentIntent,
  type PhoneTabId,
  type VoiceAction,
} from '@/lib/bicara-engine';

const INTENT_SYSTEM_INSTRUCTION = `
You are the unified English-first voice command and intent parser for Bicara, a spoken transaction verification and accessibility layer (accessible-signing) on Solana.
Users primarily speak English (and may occasionally use Indonesian phrases).
Return ONLY valid JSON matching the schema.

Supported actions:
- "send": transfer/pay USDC or SOL to a recipient ("send 5 USDC to Ahmad", "pay 20 dollars to Budi")
- "swap_quote": request a Quote-Only token swap ("swap 10 USDC to SOL", "buy SOL with 10 USDC", "swap all my USDC to unknown token XYZ")
- "check_price": ask current token price ("check price", "what is SOL price", "SOL price")
- "navigate": switch screens ("open contacts" -> targetTab: "contacts", "open history" -> targetTab: "history", "go home" -> targetTab: "home")
- "check_balance": ask current wallet balance ("check balance", "read portfolio")
- "list_contacts": read saved contacts aloud ("read contacts", "list contacts") -> targetTab: "contacts"
- "read_history": read recent transaction history ("read history", "last transaction") -> targetTab: "history"
- "confirm": explicit confirmation ("yes", "confirm", "continue")
- "cancel": cancel current confirmation ("cancel", "stop", "no")
- "repeat": repeat last spoken announcement ("repeat", "say that again")
- "help": ask for available voice commands ("help", "what can I say")
- "unknown": non-app chitchat ("how is the weather today?")

Token & parsing rules:
- "dollar", "dollars", "USD", "$", "bucks", "usdc" => "USDC"
- "SOL", "solana" => "SOL"
- IMPORTANT for swap_quote: preserve any unknown or unverified token symbol verbatim (e.g. "XYZ", "SCAM") in currency or outputCurrency so Layer 3 allowlist policy can narrate and block it.
- For swap_quote, set swapDirection to "buy" when user says "buy <token>", otherwise "sell".
- Default currency for send commands => "USDC"
- Parse spoken numbers ("five" => 5, "twenty" => 20, "two and a half" => 2.5)
- Capitalize recipient names cleanly ("ahmad" => "Ahmad")
- If send is missing amount or recipient => confidence: "low"
`.trim();

const VALID_ACTIONS = new Set<VoiceAction>([
  'send',
  'swap_quote',
  'check_price',
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

    const intentResponseSchema = {
      type: Type.OBJECT,
      properties: {
        action: {
          type: Type.STRING,
          enum: [
            'send',
            'swap_quote',
            'check_price',
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
          nullable: true,
        },
        swapDirection: {
          type: Type.STRING,
          enum: ['buy', 'sell'],
          nullable: true,
        },
        outputCurrency: {
          type: Type.STRING,
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
    };

    const isTransientOverload = (error: unknown): boolean => {
      const msg = error instanceof Error ? error.message : String(error);
      return (
        msg.includes('503') ||
        msg.includes('UNAVAILABLE') ||
        msg.includes('TIMEOUT') ||
        msg.toLowerCase().includes('high demand') ||
        msg.toLowerCase().includes('overloaded')
      );
    };

    const callOfficialGemini = async (
      model: 'gemini-4-hydrogen' | 'gemini-3.1-flash-lite',
      thinkingLevel: ThinkingLevel,
      timeoutMs = 6500
    ) => {
      let timer: ReturnType<typeof setTimeout> | null = null;
      try {
        return await Promise.race([
          ai.models.generateContent({
            model,
            contents: `Spoken transcript: "${transcript}"${contactHint}`,
            config: {
              systemInstruction: INTENT_SYSTEM_INSTRUCTION,
              thinkingConfig: { thinkingLevel },
              responseMimeType: 'application/json',
              responseSchema: intentResponseSchema,
            },
          }),
          new Promise<never>((_, reject) => {
            timer = setTimeout(
              () => reject(new Error(`503 TIMEOUT: ${model} exceeded ${timeoutMs}ms`)),
              timeoutMs
            );
          }),
        ]);
      } finally {
        if (timer) clearTimeout(timer);
      }
    };

    // Official Gemini attempts: fast low-latency gemini-3.1-flash-lite primary -> official failover gemini-4-hydrogen
    const attempts: Array<{
      model: 'gemini-3.1-flash-lite' | 'gemini-4-hydrogen';
      thinkingLevel: ThinkingLevel;
      delayMs: number;
    }> = [
      { model: 'gemini-3.1-flash-lite', thinkingLevel: ThinkingLevel.MINIMAL, delayMs: 0 },
      { model: 'gemini-4-hydrogen', thinkingLevel: ThinkingLevel.LOW, delayMs: 150 },
    ];

    let responseText = '';
    let usedModel: 'gemini-3.1-flash-lite' | 'gemini-4-hydrogen' = 'gemini-3.1-flash-lite';
    let lastErr: unknown = null;

    for (const attempt of attempts) {
      if (attempt.delayMs > 0) {
        await new Promise((resolve) => setTimeout(resolve, attempt.delayMs));
      }
      try {
        const res = await callOfficialGemini(attempt.model, attempt.thinkingLevel);
        responseText = (res.text ?? '').trim();
        usedModel = attempt.model;
        lastErr = null;
        break;
      } catch (err) {
        lastErr = err;
        if (!isTransientOverload(err)) {
          throw err;
        }
      }
    }

    if (lastErr) {
      throw lastErr;
    }

    const parsed = JSON.parse(responseText) as Partial<PaymentIntent>;
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

    const cleanToken = (val: unknown): string | null => {
      if (typeof val !== 'string') return null;
      const trimmed = val.trim();
      if (!trimmed) return null;
      const upper = trimmed.toUpperCase();
      if (upper === 'SOLANA') return 'SOL';
      if (upper === 'USD' || upper === 'DOLLAR' || upper === 'DOLLARS') return 'USDC';
      return upper;
    };

    const normalizedCurrency =
      cleanToken(parsed.currency) ?? (action === 'send' ? 'USDC' : null);

    const intent: PaymentIntent = {
      action,
      targetTab,
      amount:
        typeof parsed.amount === 'number' && Number.isFinite(parsed.amount)
          ? parsed.amount
          : null,
      currency: normalizedCurrency,
      swapDirection:
        parsed.swapDirection === 'buy' || parsed.swapDirection === 'sell'
          ? parsed.swapDirection
          : action === 'swap_quote'
            ? 'sell'
            : null,
      outputCurrency: cleanToken(parsed.outputCurrency),
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
      engine: usedModel,
      latencyMs: Date.now() - startedAt,
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : 'Failed to parse voice intent';
    const status = message.includes('503') ? 503 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
