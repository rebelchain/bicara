# VOICE_SPEC.md — English Eyes-Free Voice, Narration & NLU Specification (2026 Verified)

## Overview

Bicara's voice pipeline uses **English by default**, backed by a **locale dictionary** so additional languages can be added later while shipping English only. Every stage obeys **VOICE IDENTIFIES, HARDWARE AUTHORIZES**:

```
0. Capture         → expo-audio (local microphone only — never remote audio)
1. Identification  → Optional @picovoice/eagle-react-native (convenience/privacy ONLY)
2. STT             → ElevenLabs scribe_v2 via Next.js /api/stt (+ dynamic `keyterms`)
3. NLU             → Gemini 4 Hydrogen via Next.js /api/intent (+ deterministic fallback)
4. Risk & Challenge→ Layer 2 random spoken challenge + Layer 3 policy & verified token allowlist
5. Narration & TTS → TxSummary formatter + ElevenLabs eleven_flash_v2_5 via /api/tts
                     (+ AccessibilityInfo + expo-haptics; expo-speech offline fallback)
```

---

## Part 1: Voiceprint Identification Policy (Layer 1 — Optional)

- **Role**: Convenience and privacy gate only (reduces casual bystander access to balances and screens). **Never fund security.**
- **Honest Limits**: Voice verification does NOT prove a live human and does NOT stop replay attacks or AI voice clones (see `docs/SECURITY_MODEL.md`).
- **Threshold Calibration**: Never hardcode a demo score (such as `"94%"`). Enroll the builder's voice on physical hardware in Gate A, log real genuine vs. impostor scores, and set the threshold from measured data.
- **Fallback Policy**: If Eagle fails to build or performs poorly on Android, disable Layer 1 cleanly and record the decision in `PROGRESS.md`. The app still relies on Layers 2–5.

### Optional 3-Phrase English Enrollment Prompts (Locale Dictionary)
1. `0% → 33%`: *"Please say: Bicara is my voice accessibility wallet."*
2. `33% → 66%`: *"Good, 33 percent complete. Now say: Check my Solana balance and saved contacts."*
3. `66% → 100%`: *"Almost done, 66 percent. Finally say: Confirm my verified payment with hardware biometrics."*

---

## Part 2: Dynamic `keyterms` for ElevenLabs `scribe_v2` (Decision D4)

ElevenLabs `scribe_v2` batch transcription (`POST https://api.elevenlabs.io/v1/speech-to-text`) accepts keyterm prompting via the **`keyterms`** form field (note: the feature is called *keyterm prompting*; the wire parameter is `keyterms`).

### Verified ElevenLabs `scribe_v2` Keyterm Limits
- **Batch `scribe_v2` (used by `/api/stt`)**:
  - Up to **1,000 keyterms** per request
  - Maximum **50 characters** per individual keyterm
  - Maximum **5 words** per individual keyterm
- **Realtime `scribe_v2` (reference note if ever used)**: Tighter limits — up to **50 keyterms** and **20 characters** max per term.

### Runtime Assembly & Refresh Rules
Build `keyterms` dynamically at runtime from three sources and **refresh immediately whenever the saved contacts list changes**:
```typescript
export function buildDynamicKeyterms(savedContactNames: string[]): string[] {
  const staticTerms = [
    // Verified tokens & chain terms
    'USDC', 'SOL', 'Solana', 'Bicara', 'dollars',
    // Core actions & explicit swap directions
    'send', 'transfer', 'swap', 'buy', 'sell', 'quote',
    'confirm', 'yes', 'cancel', 'stop',
    // English navigation & read-only commands
    'open contacts', 'open history', 'go home',
    'check balance', 'check price', 'read portfolio',
    'read contacts', 'read history', 'repeat', 'help',
  ];

  const sanitizedContacts = savedContactNames
    .map((name) => name.trim())
    .filter((name) => name.length > 0 && name.length <= 50 && name.split(/\s+/).length <= 5);

  // Deduplicate and enforce verified batch scribe_v2 ceiling (1,000 terms)
  return Array.from(new Set([...staticTerms, ...sanitizedContacts])).slice(0, 1000);
}
```
> **Note**: Always pass `language_code: 'eng'` from the English locale dictionary to `/api/stt` once runtime code is synced to the English pivot.

---

## Part 3: Unified English NLU Schema (`app/api/intent`)

Backed by `@google/genai` (`gemini-4-hydrogen`, `ThinkingLevel.LOW`) + deterministic offline fallback:

```typescript
export type VoiceAction =
  | 'send'
  | 'swap_quote'
  | 'check_price'
  | 'navigate'
  | 'check_balance'
  | 'list_contacts'
  | 'read_history'
  | 'confirm'
  | 'cancel'
  | 'repeat'
  | 'help'
  | 'unknown';

export interface VoiceIntent {
  action: VoiceAction;
  targetTab?: 'home' | 'contacts' | 'history' | null;
  amount: number | null;
  currency: 'USDC' | 'SOL' | string | null; // Unknown token strings preserved so Layer 3 can narrate & block
  swapDirection?: 'buy' | 'sell' | null;
  outputCurrency?: 'USDC' | 'SOL' | string | null;
  recipient: string | null;
  confidence: 'high' | 'low';
  raw_amount_text: string | null;
}
```

### Swap STT Mistake Mitigation
Because mishearing an amount or direction (`buy` vs `sell`) is high-risk, Bicara ALWAYS echoes both the explicit direction and exact token pair in the spoken `TxSummary` before asking for confirmation, and injects token names into `scribe_v2` `keyterms`.

---

## Part 4: Runtime Random Spoken Challenge Flow (Layer 2 — Hackathon Window)

Before final confirmation on sensitive sends:
1. Generate a fresh 3-digit numeric challenge at runtime (e.g., `4-7-2`) — never reuse challenges across transactions.
2. Speak: *"Security check. Please say 4, 7, 2 to continue, or say cancel."*
3. Verify transcribed digits match the active challenge within a short timeout window (e.g., 15 seconds).
4. **Honest Scope**: Defeats static pre-recorded replay clips and raises cloning friction, but does **not** defeat real-time voice conversion — Layer 5 hardware biometrics remain the real security boundary.

---

## Part 5: Spoken Transaction Narration Templates (`TxSummary` — Decision D3)

All fees, rent costs, exchange outputs, and price impacts are computed dynamically at runtime from Solana RPC or Jupiter Swap API V2 — **never hardcoded**.

### Template A — Devnet USDC Send (`TxSummary`)
```
[First-use stablecoin note, spoken once per user]:
"USDC is a US-dollar stablecoin."

[Core send narration]:
"You are about to send {amount} {symbol} to {recipientLabel}, {contactStatus},
 wallet ending {last4}. The network fee is {formattedFee}."

[If createsNewAta === true]:
"This creates a new token account with a refundable rent deposit of {formattedRent}."

[If anomalies present]:
"Warning: {anomalyDescriptions}."

[Confirmation prompt]:
"Say yes to continue or cancel to stop."
```
**Concrete Example (Saved Contact, Existing ATA)**:
> *"You are about to send 5 USDC to Ahmad, a saved contact, wallet ending 3mN3. The network fee is under one cent. Say yes to continue or cancel to stop."*

### Template B — Verified Swap Quote (`USDC ↔ SOL`, Quote-Only)
```
"You are quoting a swap to sell {inputAmount} {inputSymbol} for about {outputAmount} {outputSymbol}.
 Price impact is {priceImpactLevel}. Maximum slippage is {maxSlippagePct} percent.
 Estimated fee is {formattedFee}. Quote-only Devnet safe mode is active; no mainnet funds will move.
 Say yes to re-check the live quote or cancel to stop."
```
**Concrete Example**:
> *"You are quoting a swap to sell 10 USDC for about 0.05 SOL. Price impact is low. Maximum slippage is 0.5 percent. Estimated fee is under 3 cents. Quote-only Devnet safe mode is active; no mainnet funds will move. Say yes to re-check the live quote or cancel to stop."*

**If Pre-Authorization Re-Quote Drifts**:
> *"Heads up: the quoted output changed from 0.050 SOL to 0.048 SOL. Say yes to accept the updated quote or cancel to stop."*

**If Target Token Is Unverified / Unknown (Layer 3 Hard Block)**:
> *"Blocked. {tokenName} is not on your verified token list. Bicara only allows verified tokens to protect against scam mints."*

---

## Part 6: English Locale Dictionary (`en` — Shipped Only Locale)

```typescript
export const EN_VOICE_SCRIPTS = {
  onboardingWelcome: () =>
    'Welcome to Bicara, an eyes-free accessibility layer for Solana payments. Tap anywhere on the screen to speak.',
  onboardingWalletReady: (last4: string) =>
    `Wallet connected, ending ${last4}. Every transfer and contact edit will still require your device hardware biometric.`,
  onboardingComplete: () =>
    'Setup complete. You can say check balance, check price, open contacts, open history, send 5 USDC to Ahmad, or swap 10 USDC to SOL.',
  navHome: (usdc: number, sol: number) =>
    `Home screen. Your balance is ${usdc.toFixed(2)} USDC and ${sol.toFixed(3)} SOL. Tap anywhere to speak.`,
  navContacts: (count: number, names: string[]) =>
    count > 0
      ? `Contacts screen. You have ${count} verified contacts: ${names.join(', ')}. Adding or changing a contact requires hardware biometric approval.`
      : 'Contacts screen. You have no saved contacts yet. Adding a contact requires hardware biometric approval.',
  navHistory: (count: number, latestSummary: string | null) =>
    latestSummary
      ? `History screen. ${count} transactions recorded. Most recent: ${latestSummary}.`
      : 'History screen. No transactions sent yet.',
  balanceReadout: (usdc: number, sol: number) =>
    `Your Devnet balance is ${usdc.toFixed(2)} USDC and ${sol.toFixed(3)} SOL.`,
  priceReadout: (solUsd: number) =>
    `SOL is currently around ${solUsd.toFixed(2)} US dollars. USDC is pegged to one US dollar.`,
  sendSuccess: (amount: number, symbol: string, recipient: string) =>
    `Sent. You sent ${amount} ${symbol} to ${recipient}.`,
  contactEditRequiresBiometric: () =>
    'Adding or changing a contact requires your hardware biometric. Voice alone cannot modify saved addresses.',
  challengePrompt: (digitsSpoken: string) =>
    `Security check. Please say ${digitsSpoken} to continue, or say cancel.`,
  unverifiedTokenBlocked: (tokenName: string) =>
    `Blocked. ${tokenName} is not on your verified token list. Bicara blocks unverified tokens to protect against scam mints.`,
  helpGuide: () =>
    'Available commands: check balance, check price, open contacts, read contacts, open history, go home, send 5 USDC to Ahmad, swap 10 USDC to SOL, repeat, or cancel.',
  cancelled: () => 'Action cancelled.',
};
```
