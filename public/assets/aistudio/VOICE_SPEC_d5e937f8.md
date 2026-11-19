# VOICE_SPEC.md — Voice Layer Specification

## Overview

The voice layer has three parts:

```
1. STT  (Speech-to-Text)   → ElevenLabs  → raw transcript
2. NLU  (Natural Language)  → Claude API  → structured intent
3. TTS  (Text-to-Speech)   → ElevenLabs  → spoken feedback
```

---

## Part 1: Speech-to-Text (STT)

### API
```
Provider: ElevenLabs
Endpoint: POST /v1/speech-to-text
⚠️  Check elevenlabs.io/docs for current model names before using
```

### Implementation (`lib/elevenlabs.ts`)
```typescript
export async function transcribeAudio(audioUri: string): Promise<string> {
  // Read audio file from device
  const audioResponse = await fetch(audioUri)
  const audioBlob = await audioResponse.blob()

  const formData = new FormData()
  formData.append('file', audioBlob, 'recording.m4a')
  formData.append('model_id', 'scribe_v1')  // ⚠️ verify current model name

  const response = await fetch('https://api.elevenlabs.io/v1/speech-to-text', {
    method: 'POST',
    headers: {
      'xi-api-key': process.env.ELEVENLABS_API_KEY!,
    },
    body: formData,
  })

  if (!response.ok) {
    throw new Error(`STT failed: ${response.status}`)
  }

  const data = await response.json()
  return data.text as string
}
```

### Audio Recording Setup (`lib/audio.ts`)
```typescript
// ⚠️ Verify correct package for your Expo SDK version
// Might be expo-av OR expo-audio — check docs.expo.dev

import { Audio } from 'expo-av'  // verify this import

export async function startRecording(): Promise<Audio.Recording> {
  await Audio.requestPermissionsAsync()
  await Audio.setAudioModeAsync({
    allowsRecordingIOS: true,
    playsInSilentModeIOS: true,
  })

  const { recording } = await Audio.Recording.createAsync(
    Audio.RecordingOptionsPresets.HIGH_QUALITY
  )
  return recording
}

export async function stopRecording(
  recording: Audio.Recording
): Promise<string> {
  await recording.stopAndUnloadAsync()
  const uri = recording.getURI()
  if (!uri) throw new Error('No recording URI')
  return uri
}
```

### Language Support
```
Primary:   Bahasa Indonesia
Secondary: English
Mixed:     "kirim 5 dollars ke Ahmad" → works fine
Numbers:   "lima" = 5, "5" = 5, "five" = 5 — handle all formats
```

---

## Part 2: Intent Parsing (NLU)

### Why Claude API (not regex)?
```
Regex breaks on:
  "minta tolong transfer sepuluh ribu ke Ahmad ya"
  "bisa kirimin Ahmad dua puluh dollar gak?"
  "send Ahmad 15 bucks for the food"

Claude handles all of these correctly.
```

### System Prompt (exact — do not modify without testing)
```typescript
export const INTENT_SYSTEM_PROMPT = `
You are a payment intent parser for a voice payment app called Bicara.
Users speak in Indonesian, English, or mixed language.

Extract payment intent from the transcribed speech.
Return ONLY valid JSON. No explanation. No markdown. No code blocks.

Output schema:
{
  "action": "send" | "unknown",
  "amount": number | null,
  "currency": "USDC" | "SOL" | null,
  "recipient": string | null,
  "confidence": "high" | "low",
  "raw_amount_text": string | null
}

Rules:
- "dolar", "dollar", "USD", "$" → currency: "USDC"
- "SOL", "solana" → currency: "SOL"
- If no currency mentioned → default to "USDC"
- Written numbers: "lima" → 5, "dua puluh" → 20, "sepuluh ribu" → 10000
- Recipient: extract the name exactly as spoken, capitalize first letter
- If unclear amount or recipient → confidence: "low"
- Non-payment utterances → action: "unknown"

Examples:
Input: "kirim 5 dolar ke Ahmad"
Output: {"action":"send","amount":5,"currency":"USDC","recipient":"Ahmad","confidence":"high","raw_amount_text":"5 dolar"}

Input: "transfer dua puluh USDC ke Budi"
Output: {"action":"send","amount":20,"currency":"USDC","recipient":"Budi","confidence":"high","raw_amount_text":"dua puluh USDC"}

Input: "send 10 to Sarah"
Output: {"action":"send","amount":10,"currency":"USDC","recipient":"Sarah","confidence":"high","raw_amount_text":"10"}

Input: "cuaca hari ini bagaimana?"
Output: {"action":"unknown","amount":null,"currency":null,"recipient":null,"confidence":"high","raw_amount_text":null}

Input: "minta tolong kirim ke Ahmad"
Output: {"action":"send","amount":null,"currency":"USDC","recipient":"Ahmad","confidence":"low","raw_amount_text":null}
`.trim()
```

### Implementation (`lib/intent.ts`)
```typescript
export interface PaymentIntent {
  action: 'send' | 'unknown'
  amount: number | null
  currency: 'USDC' | 'SOL' | null
  recipient: string | null
  confidence: 'high' | 'low'
  raw_amount_text: string | null
}

export async function parseIntent(transcript: string): Promise<PaymentIntent> {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY!,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 200,
      system: INTENT_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: transcript }],
    }),
  })

  const data = await response.json()
  const text = data.content[0].text

  try {
    return JSON.parse(text) as PaymentIntent
  } catch {
    // Claude returned invalid JSON — fallback
    return {
      action: 'unknown',
      amount: null,
      currency: null,
      recipient: null,
      confidence: 'low',
      raw_amount_text: null,
    }
  }
}
```

### Validation After Parsing
```typescript
export function validateIntent(intent: PaymentIntent): {
  valid: boolean
  missingField: 'amount' | 'recipient' | null
  promptText: string | null
} {
  if (intent.action === 'unknown') {
    return {
      valid: false,
      missingField: null,
      promptText: 'Maaf, aku tidak mengerti. Coba: "Kirim 5 USDC ke Ahmad"',
    }
  }

  if (!intent.amount) {
    return {
      valid: false,
      missingField: 'amount',
      promptText: 'Berapa yang ingin dikirim?',
    }
  }

  if (!intent.recipient) {
    return {
      valid: false,
      missingField: 'recipient',
      promptText: 'Kepada siapa?',
    }
  }

  if (intent.confidence === 'low') {
    return {
      valid: false,
      missingField: null,
      promptText: `Konfirmasi: kirim ${intent.amount} ${intent.currency} ke ${intent.recipient}?`,
    }
  }

  return { valid: true, missingField: null, promptText: null }
}
```

---

## Part 3: Text-to-Speech (TTS)

### Voice Personality
```
Language: Indonesian (primary), switches to English if input is English
Tone:     Calm, clear, brief — not robotic, not over-enthusiastic
Speed:    Slightly slower than default for clarity
```

### Implementation (`lib/elevenlabs.ts` continued)
```typescript
export async function speak(text: string): Promise<void> {
  const response = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${process.env.EXPO_PUBLIC_ELEVENLABS_VOICE_ID}`,
    {
      method: 'POST',
      headers: {
        'xi-api-key': process.env.ELEVENLABS_API_KEY!,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text,
        model_id: 'eleven_multilingual_v2',  // ⚠️ verify current model name
        voice_settings: {
          stability: 0.75,
          similarity_boost: 0.75,
          speed: 0.95,
        },
      }),
    }
  )

  if (!response.ok) throw new Error('TTS failed')

  const audioBuffer = await response.arrayBuffer()

  // ⚠️ Verify correct playback API for your Expo SDK version
  const { sound } = await Audio.Sound.createAsync(
    { uri: `data:audio/mpeg;base64,${bufferToBase64(audioBuffer)}` },
    { shouldPlay: true }
  )
  await sound.playAsync()
}
```

### TTS Script Library
```typescript
// All spoken messages in one place for easy editing
export const VOICE_SCRIPTS = {
  // Confirmation
  confirmSend: (amount: number, currency: string, name: string) =>
    `Konfirmasi: kirim ${amount} ${currency} ke ${name}?`,

  // Success
  success: (amount: number, currency: string, name: string) =>
    `Berhasil. Kamu mengirim ${amount} ${currency} ke ${name}.`,

  // Errors
  contactNotFound: (name: string) =>
    `Kontak ${name} tidak ditemukan.`,

  insufficientBalance: (balance: number, currency: string) =>
    `Saldo tidak cukup. Kamu punya ${balance} ${currency}.`,

  networkError: () =>
    `Gagal terhubung. Coba lagi.`,

  unknownIntent: () =>
    `Maaf, aku tidak mengerti. Coba: kirim 5 USDC ke Ahmad.`,

  // Prompts
  askAmount: () =>
    `Berapa yang ingin dikirim?`,

  askRecipient: () =>
    `Kepada siapa?`,

  // Status
  processing: () =>
    `Memproses...`,
}
```

---

## Voice UX Flow States

```
IDLE
  → User sees: big mic button
  → User hears: nothing

RECORDING
  → User sees: waveform animation, "Bicara sekarang..."
  → User hears: nothing (recording)

PROCESSING
  → User sees: spinner, transcript text appears
  → User hears: nothing

CONFIRMING
  → User sees: TransactionConfirm modal with details
  → User hears: confirmation prompt (TTS)

SENDING
  → User sees: loading state, "Mengirim..."
  → User hears: nothing

SUCCESS
  → User sees: success animation, tx details
  → User hears: success message (TTS)

ERROR
  → User sees: error message, retry button
  → User hears: error message (TTS)
```

---

## Latency Budget

```
Target: < 10 seconds total (voice input to spoken confirmation)

STT (ElevenLabs):        ~1–2 seconds
Intent parsing (Claude): ~1–2 seconds
Contact resolve:         ~0.1s (Supabase) or ~0.5s (on-chain)
Build transaction:       ~0.1 seconds
Wallet sign:             ~1–3 seconds (user action)
Broadcast + confirm:     ~1–2 seconds (devnet)
TTS generation:          ~1 seconds
                         ─────────────
Total optimistic:        ~5–8 seconds
Total pessimistic:       ~12–15 seconds

Optimization: Show transcript text immediately after STT
              so user feels progress while Claude parses.
```

---

## Offline / Degraded Mode

```
If ElevenLabs STT is down:
  → Show text input field as fallback
  → "Voice unavailable. Type your command."

If Claude API is down:
  → Use simple regex fallback for basic patterns:
    /kirim (\d+) .* ke (\w+)/i
  → Works for 80% of common phrases
  → Label as "basic mode" in UI

If TTS is down:
  → Show text notification instead of speaking
  → App still functions, just silent
```
