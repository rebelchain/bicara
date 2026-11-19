# ARCHITECTURE.md — Bicara (`accessible-signing` Layer & Five-Layer Security)

## System Architecture (2026 Verified Topology)

Bicara is structured around a **separable, reusable module (`accessible-signing`)** consumed by the Android Solana Mobile reference app. Both **Devnet USDC Transfers** and **Quote-Only Verified Swaps (`USDC ↔ SOL`)** flow through the exact same decoding, narration, risk-policy, and confirmation pipeline.

```
┌────────────────────────────────────────────────────────────────────────────┐
│            BLIND / LOW-VISION USER (GLOBAL · ENGLISH-FIRST)                │
│      Tap-Anywhere Canvas · TalkBack/VoiceOver · Screen Curtain Mode        │
└────────────────────────────────────┬───────────────────────────────────────┘
                                     │ Local microphone only (expo-audio)
                                     ▼
┌────────────────────────────────────────────────────────────────────────────┐
│               BICARA MOBILE REFERENCE APP (Android MWA)                    │
│               Entry: mobile/index.js → mobile/polyfill.js                  │
│                                                                            │
│  ┌────────────────────────────────┐  ┌──────────────────────────────────┐  │
│  │ LAYER 1: VOICEPRINT (Optional) │  │ ACCESSIBILITY & LOCALE SHELL     │  │
│  │ @picovoice/eagle-react-native  │  │ - English Locale Dictionary      │  │
│  │ Convenience & privacy ONLY     │  │ - expo-haptics (4 pulse codes)   │  │
│  │ (Not fund security)            │  │ - AccessibilityInfo Announcer    │  │
│  └───────────────┬────────────────┘  └──────────────────────────────────┘  │
│                  ▼                                                         │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │               REUSABLE MODULE: accessible-signing                    │  │
│  │  (Target boundary for extraction during Nov 27–29 hackathon window)  │  │
│  │                                                                      │  │
│  │  1. Name → Verified Address Resolver (Supabase + ContactRegistry)    │  │
│  │  2. Verified Token Allowlist (USDC, SOL) — blocks unknown mints      │  │
│  │  3. Transaction / Quote Decoder → unified TxSummary                  │  │
│  │     • Runtime RPC fee & ATA rent estimation (never hardcoded)        │  │
│  │     • Swap pre-authorization re-quote drift check                    │  │
│  │  4. Layer 2: Random Spoken Challenge (e.g., "say 4-7-2")             │  │
│  │  5. Layer 3: Risk Policy (saved contacts, caps, daily cap, cooldown) │  │
│  │  6. Layer 4: Spoken Narration Template + Explicit "Yes"/Tap Confirm  │  │
│  └───────────────┬──────────────────────────────────────┬───────────────┘  │
└──────────────────┼──────────────────────────────────────┼──────────────────┘
                   │ HTTPS (USB: adb reverse tcp:3000)    │ MWA 2.0 + RPC
                   ▼                                      ▼
┌──────────────────────────────────────┐   ┌─────────────────────────────────┐
│  NEXT.JS SERVER PROXY (Root app/api) │   │        SOLANA DEVNET RPC        │
│  Holds all server-only secrets:      │   │  Cluster: solana:devnet         │
│  GEMINI_API_KEY, ELEVENLABS_API_KEY, │   │                                 │
│  JUPITER_API_KEY (planned)           │   │ ┌─────────────────────────────┐ │
│                                      │   │ │ LAYER 5: HARDWARE SIGNING   │ │
│  GET  /api/health                    │   │ │ Wallet's Own Hardware-Backed│ │
│  POST /api/stt                       │   │ │ Biometric via MWA 2.0       │ │
│   └─ ElevenLabs scribe_v2            │   │ │ (Seed Vault on Seeker ONLY) │ │
│      + dynamic `keyterms`            │   │ │ • Send: signAndSendTx       │ │
│  POST /api/intent                    │   │ │ • Future Mainnet Swap:      │ │
│   └─ Gemini 4 Hydrogen               │   │ │   signTransactions→/execute │ │
│      + deterministic fallback        │   │ └─────────────────────────────┘ │
│  POST /api/tts                       │   │ ┌─────────────────────────────┐ │
│   └─ ElevenLabs eleven_flash_v2_5    │   │ │ ContactRegistry PDA (Gate C)│ │
│  GET  /api/swap/quote (Planned)      │   │ │ Verified Address Book       │ │
│   └─ Jupiter Swap V2 (Quote-Only)    │   │ │ Anchor (@anchor-lang/core)  │ │
│  GET  /api/prices (Planned)          │   │ └─────────────────────────────┘ │
│   └─ Verified token prices           │   └─────────────────────────────────┘
└──────────────────┬───────────────────┘
                   ▼
┌──────────────────────────────────────┐
│              SUPABASE                │
│  ├─ contacts (fast lookup + cache)   │
│  └─ transactions (history + audit)   │
└──────────────────────────────────────┘
```

---

## Module Boundary: `accessible-signing` (Decision D2)

To keep Bicara positioned as an **accessibility layer** rather than a monolithic wallet app, reusable signing-accessibility logic is separated cleanly from React Native screens:

| Responsibility | Inside `accessible-signing` (Reusable Layer) | Inside Mobile Reference App (UI & Platform Shell) |
|----------------|----------------------------------------------|---------------------------------------------------|
| **Address Resolution** | Resolves human names to owner-verified addresses + saved-vs-new classification | Contacts CRUD UI, biometric gate trigger for add/edit |
| **Transaction / Quote Decoding** | Decodes SPL `TransferChecked` instructions and Jupiter Swap V2 quotes into a normalized `TxSummary` | Fetches audio via `expo-audio`, invokes server proxy |
| **Runtime Fee & Rent Calculation** | Queries Solana RPC (`getFeeForMessage`, `getMinimumBalanceForRentExemption`) and checks destination ATA existence | Provides configured `@solana/kit` RPC client |
| **Risk Policy & Allowlist** | Enforces verified token allowlist, saved-contacts default, per-tx/daily limits, cooldowns, anomaly flags, and swap quote-drift threshold | Stores local policy state & renders accessible alert surfaces |
| **Spoken Narration & Confirmation** | Formats `TxSummary` using the locale dictionary + drives challenge/confirm state machine | Plays ElevenLabs `eleven_flash_v2_5` audio, fires `expo-haptics` & `AccessibilityInfo` |
| **Hardware Signing Handoff** | Exposes an abstract `SignerAdapter` callback once Layer 4 consent passes | Implements Android MWA (`@wallet-ui/react-native-kit`) signing |

---

## Unified `TxSummary` Pipeline & Flow

Both **Send** and **Verified Swap (Quote-Only)** pass through one typed `TxSummary` contract before any spoken prompt or signing request:

```typescript
export type TxActionType = 'send' | 'swap_quote';

export type TxAnomalyCode =
  | 'NEW_RECIPIENT'
  | 'UNUSUALLY_LARGE_AMOUNT'
  | 'UNKNOWN_MINT'
  | 'UNVERIFIED_TOKEN_BLOCKED'
  | 'NEW_TOKEN_ACCOUNT_RENT'
  | 'HIGH_PRICE_IMPACT'
  | 'QUOTE_DRIFT_DETECTED';

export interface TxSummary {
  action: TxActionType;
  executionMode: 'devnet_transfer' | 'quote_only_safe_mode';
  // Primary token & amount
  inputToken: { symbol: string; mint: string; decimals: number; verified: boolean; isFirstStablecoinUse?: boolean };
  inputAmount: number;
  // Send-specific fields
  recipient?: {
    displayName: string | null;
    address: string;
    last4: string;
    isSavedContact: boolean;
  };
  // Swap-specific fields (Quote-Only via Jupiter Swap V2)
  swap?: {
    direction: 'buy' | 'sell';
    outputToken: { symbol: string; mint: string; decimals: number; verified: boolean };
    quotedOutputAmount: number;
    priceImpactPct: number;
    priceImpactLevel: 'low' | 'moderate' | 'high';
    maxSlippageBps: number;
    routeLabel: string;
    quotedAtMs: number;
  };
  // Runtime-computed costs (NEVER hardcoded)
  networkFeeLamports: bigint;
  networkFeeUsdEstimate: number | null;
  createsNewAta: boolean;
  ataRentLamports: bigint;
  ataRentUsdEstimate: number | null;
  // Risk & anomalies
  anomalies: TxAnomalyCode[];
  blockedReason: string | null;
}
```

### Runtime Cost & Drift Rules
- **Network Fee**: Computed via Solana RPC at runtime (never hardcoded).
- **ATA Creation & Rent**: Check whether recipient ATA exists via RPC; if not, query `getMinimumBalanceForRentExemption(165)` at runtime and narrate the extra rent cost explicitly.
- **Pre-Authorization Swap Re-Quote**: For swaps, fetch a fresh Jupiter Swap V2 quote immediately before final confirmation; if output amount or price impact drifts beyond threshold, flag `QUOTE_DRIFT_DETECTED` and re-narrate before accepting `"yes"`.

---

## Signing Flow Distinction: Devnet Transfer vs. Future Mainnet Swap

| Action | Network | Execution Mode (Hackathon) | MWA Method | Why |
|--------|---------|----------------------------|------------|-----|
| **USDC Send (`TransferChecked`)** | `solana:devnet` | Live on-chain execution | `signAndSendTransactions()` | Wallet signs with hardware biometric and submits directly to Devnet RPC. |
| **Verified Swap (`USDC ↔ SOL`)** | Mainnet quote API (`api.jup.ag/swap/v2`) | **Quote-Only** (zero real money) | None (narrated quote only; preserves Rule 10) | Jupiter's hosted Swap V2 API natively targets Solana Mainnet with no official Devnet liquidity. |
| **Future Mainnet Swap (Post-Hackathon)** | `solana:mainnet` | Jupiter `/order` → `/execute` | **`signTransactions()`** (NOT `signAndSendTransactions`) | Jupiter Swap V2 `/order` returns a transaction to sign locally and submit back to `/execute`, which handles landing and routing. |

---

## Five-Layer Security Architecture (Summary)

**Core Principle: VOICE IDENTIFIES, HARDWARE AUTHORIZES.**

Bicara replaces naive voice-only security with five distinct layers (full threat model in `docs/SECURITY_MODEL.md`):
1. **Layer 1 — Optional Picovoice Eagle Voiceprint**: Convenience and privacy gate only (never fund security; project continues without it if native build or scores fail).
2. **Layer 2 — Runtime Random Spoken Challenge**: e.g., *"say 4-7-2"*; defeats static recordings and raises cloning friction, while honestly acknowledging it does not stop real-time voice conversion.
3. **Layer 3 — Risk Policy & Verified Token Allowlist**: Saved contacts only by default; adding/changing a contact requires physical hardware biometric; per-transaction cap, daily limit, and cooldown for large/new sends; verified token allowlist (`USDC`, `SOL`) hard-blocks unknown mints.
4. **Layer 4 — Spoken `TxSummary` Readback & Explicit Consent**: Full narration of what the transaction does + explicit `"yes"` or tap.
5. **Layer 5 — MWA Hardware-Backed Biometric Signing**: The real security boundary (Phantom/Solflare wallet biometric on any Android phone; Seed Vault strictly on Solana Seeker). Because audio enters only through the local device microphone (never over a network), a clone attacker must be physically near or holding the phone — where Layer 5 stops unauthorized fund movement.

---

## Unified English Voice Routing Table

Every utterance passes through the unified NLU router (`app/api/intent`, powered by Gemini 4 Hydrogen + deterministic fallback):

| Intent Action | Example English Speech | App Behavior & Spoken Feedback |
|---------------|------------------------|--------------------------------|
| `navigate` | `"open contacts"`, `"open history"`, `"go home"` | Switches active tab + speaks concise screen summary + light haptic tick |
| `check_balance` | `"check balance"`, `"what is my balance?"` | Reads live Devnet USDC & SOL balance aloud from any screen |
| `check_price` | `"check price"`, `"what is SOL price?"`, `"read portfolio"` | Read-only spoken token price & portfolio summary via `/api/prices` (zero signing) |
| `list_contacts` | `"read contacts"`, `"list my contacts"` | Navigates to Contacts and reads saved verified contact names aloud |
| `read_history` | `"read history"`, `"open history"`, `"last transaction"` | Navigates to History and reads the most recent confirmed transfers |
| `repeat` | `"repeat"`, `"say that again"` | Replays `lastSpokenAnnouncement` immediately |
| `help` | `"help"`, `"what can I say?"` | Reads concise Eyes-Free English command list aloud |
| `confirm` / `cancel` | `"yes"`, `"confirm"`, `"cancel"`, `"stop"` | Confirms or cancels an active `TransactionConfirm` sheet |
| `send` | `"send 5 USDC to Ahmad"` | Resolves verified contact → checks risk policy & challenge → narrates `TxSummary` → MWA sign |
| `swap_quote` | `"swap 10 USDC to SOL"`, `"buy SOL with 5 USDC"` | Checks verified token allowlist → fetches live Jupiter Swap V2 quote → narrates `TxSummary` (Quote-Only safe mode) |

---

## Tactile Haptic Language (`expo-haptics`)

Blind users rely on consistent vibration cues when the screen is obscured or in Screen Curtain mode:

| Event | `expo-haptics` Call | Meaning |
|-------|---------------------|---------|
| Listening started | `impactAsync(ImpactFeedbackStyle.Medium)` (1 pulse) | Mic is open — speak now |
| Tab / Onboarding milestone | `impactAsync(ImpactFeedbackStyle.Light)` (soft tick) | Navigation or enrollment chunk complete |
| Confirmation / Anomaly alert | `notificationAsync(NotificationFeedbackType.Warning)` (2 pulses) | Listen carefully to `TxSummary` and confirm |
| Transfer confirmed | `notificationAsync(NotificationFeedbackType.Success)` (long pulse) | Transaction settled on Solana Devnet |
| Blocked / Error / Unverified token | `notificationAsync(NotificationFeedbackType.Error)` (3 sharp pulses) | Policy block, unknown token, or failed check |
