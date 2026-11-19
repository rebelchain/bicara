# CLAUDE.md — Bicara

> Read this file at the start of EVERY session.
> Do NOT delete or rename this file.
> Single source of truth for Bicara — **SDKs and APIs verified against 2026 official docs and the live repository**.

---

## What Bicara Is

Bicara *(a fun fact: the name means "speak" in Bahasa Indonesia)* is a **global accessibility layer for on-chain payments and verified token swaps**, built for **blind and low-vision users worldwide**. The Solana Mobile Android app is the reference implementation of that layer.

Blind and low-vision users face two fundamental barriers in self-custodial crypto:
1. They cannot visually verify a 44-character Base58 wallet address.
2. They cannot read a wallet's signing popup (or DEX swap breakdown) to know what a transaction will actually do before approving it.

Bicara solves both through a reusable module (**`accessible-signing`**): saved names resolve to owner-verified addresses, and the app **speaks what the transaction will actually do** (including runtime-computed fees, rent, slippage, price impact, and anomaly warnings) before the user authorizes it with hardware biometrics.

```
"Send 5 USDC to Ahmad"
   ↓ (Layer 1 optional voiceprint → scribe_v2 → Gemini NLU → Risk Policy → Spoken TxSummary)
"You are about to send 5 USDC to Ahmad, a saved contact, wallet ending 3mN3.
 The network fee is under one cent. Say yes to continue or cancel to stop."
   ↓ (Explicit "yes" + MWA hardware-backed biometric signing on solana:devnet)
"Sent. You sent 5 USDC to Ahmad."
```

The exact same `accessible-signing` pipeline also narrates **verified-token swaps (`USDC ↔ SOL`, Quote-Only via real Jupiter Swap API V2 quotes)** and read-only **price and portfolio readouts**, proving that Bicara is a reusable accessibility layer across distinct on-chain actions rather than a single-action payment app.

- **Built for**: Dev3pack Global Hackathon (`https://hack.dev3pack.xyz/`)
- **Dates**: 27–29 November 2026 (submit Sunday 29 Nov)
- **Pre-hackathon prototype & de-risking window**: 20–26 November 2026 (gated schedule)
- **License**: MIT License (public open-source repository)
- **Target tracks**: Best App Overall on Solana + ElevenLabs sponsor track *(assumed to exist; **UNVERIFIED** until officially listed)*. Seeker / Best Mobile App is optional; the app works on any Android phone via MWA (Phantom or Solflare).

---

## Security Principle — State This Everywhere

**VOICE IDENTIFIES, HARDWARE AUTHORIZES.**

- Voice verification (Picovoice Eagle) is an **optional convenience and privacy gate**, NEVER fund security.
- Never claim voice verification stops replay attacks, voice clones, or real-time voice conversion.
- See `docs/SECURITY_MODEL.md` for the complete five-layer defense model and threat boundaries.

---

## Two Phases — Compliance-Driven Split & Gates

Instead of a vague "build clean from scratch" rewrite, work is governed by **measurable gates** and a transparent **pre-kickoff vs. hackathon window split** documented in `docs/HACKATHON_COMPLIANCE.md` and `PROGRESS.md`:

### Phase 1: Prototype & De-Risking (Fri 20 Nov → Thu 26 Nov 2026)
- **Gate A (20–22 Nov, physical Android phone over USB)**: Dev build boots, `/api/health` returns OK on phone, MWA authorizes on `solana:devnet`, eyes-free usability of wallet approval popup tested, Eagle enroll/verify measured with real scores, `scribe_v2` English + dynamic `keyterms` accuracy logged, `eleven_flash_v2_5` latency measured on-device, and Jupiter Swap API V2 Quote-Only response verified.
- **Gate B (23–24 Nov)**: End-to-end Devnet loop (`voice → intent → confirm → TransferChecked → spoken receipt`) plus Quote-Only verified `USDC ↔ SOL` swap narration and price/portfolio readout.
- **Gate C (25 Nov, only if Gate B passes)**: Anchor `ContactRegistry` PDA verified address book + dual-write.
- **26 Nov**: Full physical-device rehearsal and backup demo video.

### Phase 2: Hackathon Window (Fri 27 Nov → Sun 29 Nov 2026)
- Tag `hackathon-start` at kickoff on **27 Nov** (never squash or backdate commits).
- **Reserved for the hackathon window**:
  1. Runtime random spoken challenge (Layer 2)
  2. Transaction risk policy & verified token allowlist enforcement (Layer 3)
  3. Full `TxSummary` + ElevenLabs spoken transaction narration & pre-sign swap re-quote drift check (Layer 4)
  4. ElevenLabs self-voice red-team demo & `docs/RED_TEAM_DEMO.md` evidence
  5. Extraction of the reusable `accessible-signing` module boundary
  6. Final README ("Built before the hackathon vs during the hackathon") and demo polish
- *(Note: Pre-existing code disclosure rules with Dev3pack organizers are currently **UNVERIFIED** — see `docs/HACKATHON_COMPLIANCE.md` TODOs.)*

**Current phase**: PROTOTYPE (Gate A — Fri 20 Nov 2026)

---

## Verified 2026 Tech Stack (Reconciled With Real Codebase)

### Locked Solana SDK Track: Track A (`@solana/kit`)
Do not mix `@solana/web3.js` v1 types and `@solana/kit` types in the same file.

| Layer | Technology (2026 Verified) | Codebase Reality & Notes |
|-------|----------------------------|--------------------------|
| Mobile framework | React Native 0.79 + Expo SDK 53 (`expo-dev-client`) | Expo Go does NOT support MWA or Picovoice Eagle. Always build with `npx expo run:android`. |
| Polyfills (Boot line 1) | `mobile/polyfill.js` (`react-native-get-random-values` + `react-native-quick-crypto` + `react-native-quick-base64` + `react-native-nitro-modules`) | Imported on line 2 of `mobile/index.js` before `expo-router/entry`, paired with `mobile/metro.config.js`. |
| Wallet & Layer 5 Auth | `@solana/kit@^8.6.0` + `@wallet-ui/react-native-kit@^4.4.1` + `@solana-mobile/mobile-wallet-adapter-protocol-kit@^3.0.2` | Works on any Android phone via Phantom/Solflare (**"the wallet's own hardware-backed biometric"**). Claim **"Seed Vault"** strictly on Solana Seeker devices. |
| Reusable Accessibility Core | `accessible-signing` module *(extraction reserved for Nov 27–29)* | Decodes transactions/quotes into `TxSummary`, resolves verified contacts, enforces risk policy, drives spoken narration & confirmation. |
| Voiceprint (Layer 1 — Optional) | `@picovoice/eagle-react-native` + `expo-secure-store` | Optional on-device convenience/privacy gate. If native build or accuracy fails, continue without it and log fallback in `PROGRESS.md`. |
| Accessibility & Tactile UX | `expo-haptics` + React Native `AccessibilityInfo` | Tap-anywhere Eyes-Free canvas, 4 haptic patterns, TalkBack/VoiceOver announcements, Screen Curtain privacy mode, English locale dictionary. |
| Audio I/O | `expo-audio` (`useAudioRecorder`, `useAudioPlayer`) | Replaces deprecated `expo-av`. |
| Server Voice & NLU Proxy | Root Next.js App Router (`app/api/health`, `/api/stt`, `/api/intent`, `/api/tts`, planned `/api/swap/quote`, `/api/prices`) | Holds all server secrets (`GEMINI_API_KEY`, `ELEVENLABS_API_KEY`, planned `JUPITER_API_KEY`). Reached over USB via `adb reverse tcp:3000 tcp:3000`. |
| Voice STT | ElevenLabs `scribe_v2` via `/api/stt` | Uses dynamic `keyterms` parameter (up to 1,000 terms, max 50 chars, max 5 words each for batch `scribe_v2`). |
| Voice TTS | ElevenLabs `eleven_flash_v2_5` via `/api/tts` | Low-latency spoken onboarding, navigation, `TxSummary` narration, and receipts (`expo-speech` fallback if key unavailable). |
| Unified Voice NLU | `@google/genai` (`gemini-4-hydrogen`, `ThinkingLevel.LOW`) via `/api/intent` + deterministic offline fallback | Parses send, quote-only swap, price/portfolio, navigation, confirm, cancel, repeat, and help intents. |
| On-Chain Transfers | `@solana-program/token@^0.18.0` (`getTransferCheckedInstruction`) | Enforces mint + `decimals: 6` check on-chain using `BigInt` raw units. Executed via MWA `signAndSendTransactions` on `solana:devnet`. |
| Verified Swap Quotes (Action 2) | Jupiter Swap API V2 (`https://api.jup.ag/swap/v2`) via server proxy (**Quote-Only**) | Mainnet-beta API only (no hosted Devnet liquidity). Locked to **Quote-Only** (live narration, zero real money). Future mainnet `/order` → `/execute` requires MWA `signTransactions` (not `signAndSendTransactions`). |
| Verified Address Book | Anchor `ContactRegistry` PDA (Gate C, post-Gate B) + Supabase cache | Owner-signed PDA (`["contact", owner, normalized_name]`) + Supabase fast lookup. |

---

## The Core Eyes-Free Flow (English-First, Five Security Layers)

```
0. VOICE-GUIDED ONBOARDING (First launch — English locale dictionary)
   Speaks welcome guide → Connects Android MWA wallet → Optional 3-phrase Eagle
   Voiceprint enrollment (0% → 33% → 66% → 100% with real measured scores)
         ↓
1. EYES-FREE TRIGGER (Tap Anywhere on Screen — local mic only)
   Single haptic pulse → expo-audio captures speech
         ↓
2. LAYER 1 — OPTIONAL ON-DEVICE VOICEPRINT (Convenience & privacy only)
   If enabled: checks speaker profile against data-driven threshold (never fund security)
         ↓
3. ELEVENLABS STT (scribe_v2 + dynamic keyterms: contacts + tokens + English nav commands)
         ↓
4. UNIFIED NLU ROUTER (app/api/intent — Gemini 4 Hydrogen + deterministic fallback)
   ├─ Navigation / Read-Only ("open contacts", "open history", "go home",
   │  "check balance", "read contacts", "check price", "repeat", "help")
   │    → Switch screen + speak concise summary via eleven_flash_v2_5
   ├─ Payment ("send 5 USDC to Ahmad")
   │    → Resolve verified contact (Supabase → ContactRegistry PDA fallback)
   │    → Fetch runtime RPC fee + ATA creation/rent check → build TxSummary
   └─ Verified Swap — Quote-Only ("swap 10 USDC to SOL")
        → Enforce verified token allowlist (block unknown tokens immediately!)
        → Fetch live Jupiter Swap V2 quote → build TxSummary (direction, rate,
          price impact, max slippage, fee, Quote-Only safe mode)
         ↓
5. LAYER 2 & LAYER 3 — RISK POLICY + RANDOM SPOKEN CHALLENGE (Hackathon Window)
   ├─ Enforces saved-contacts default, verified token allowlist, amount caps, cooldowns
   ├─ Adding/changing a contact ALWAYS requires physical hardware biometric
   └─ Random spoken challenge (e.g., "say 4-7-2") defeats static recordings
         ↓
6. LAYER 4 — SPOKEN TRANSACTION NARRATION (TxSummary) + EXPLICIT CONFIRMATION
   Speaks WHAT the transaction will do (and re-quotes swap if price drifted):
   "You are about to send 5 USDC to Ahmad, a saved contact, wallet ending 3mN3.
    The network fee is under one cent. Say yes to continue or cancel to stop."
   Visual sheet always displays truncated wallet address + Cancel / Confirm buttons.
         ↓
7. LAYER 5 — HARDWARE-BACKED BIOMETRIC SIGNING (Real Security Boundary)
   ├─ Send: MWA signAndSendTransactions → SPL TransferChecked on solana:devnet
   │  (Wallet's own hardware-backed biometric; Seed Vault on Seeker only)
   └─ Swap (Quote-Only): Narrates verified quote outcome without spending mainnet funds
         ↓
8. SPOKEN RECEIPT + SUCCESS HAPTIC + LOG
   "Sent. You sent 5 USDC to Ahmad."
```

---

## Hardcoded Rules — Never Break These

1. **Never commit `.env`** — only `.env.example` goes to git.
2. **Never put `ELEVENLABS_API_KEY`, `GEMINI_API_KEY`, or `JUPITER_API_KEY` inside `EXPO_PUBLIC_*`** — route all secret-bearing API calls through the Next.js server routes (`app/api/*`).
3. **Never let voice or voiceprint alone authorize transactions** — **Voice identifies, hardware authorizes**. MWA hardware-backed biometric signing is ALWAYS the true security boundary for moving funds.
4. **Never claim voice verification stops voice clones or deepfakes** — replay attacks and real-time voice conversion can defeat speaker verification; always document and demo this honestly.
5. **Adding or changing a contact requires physical hardware biometric** — never allow voice alone to add, edit, or overwrite a recipient address.
6. **Zero silent screens in Eyes-Free Mode** — every onboarding step, tab change, balance/price readout, confirmation, anomaly warning, and error MUST speak aloud via the locale dictionary and trigger the matching haptic cue.
7. **USDC has 6 decimals** — ALWAYS compute raw units with integer/BigInt math (`BigInt(Math.round(amount * 1_000_000))`) and use **`TransferChecked`** (`decimals: 6`). Never hardcode network fees or ATA rent; compute them from RPC at runtime.
8. **Always narrate `TxSummary` and require explicit confirmation before signing** — never auto-send without explicit `"yes"` or tap **Confirm**, and always display the truncated wallet address in the confirmation modal (never just a contact name).
9. **Always import `mobile/polyfill.js` before `expo-router/entry`** (`mobile/index.js` line 2) and build with `expo-dev-client` + `npx expo run:android` (no Expo Go).
10. **Devnet-only execution (zero real money)** — all on-chain transfers execute on `solana:devnet` only; Jupiter Swap API V2 operates strictly in **Quote-Only** mode with verified tokens only (unknown tokens are warned and blocked).

---

## Environment Variables (Reconciled With Real Repo)

```bash
# /.env (Root Next.js server secrets ONLY — never shipped to /mobile)
GEMINI_API_KEY=YOUR_GEMINI_API_KEY
ELEVENLABS_API_KEY=YOUR_ELEVENLABS_API_KEY
ELEVENLABS_VOICE_ID=YOUR_ELEVENLABS_VOICE_ID
JUPITER_API_KEY=YOUR_JUPITER_API_KEY          # Planned for /api/swap/quote & /api/prices
APP_URL=http://localhost:3000

# /mobile/.env (Expo client — public variables ONLY)
EXPO_PUBLIC_API_BASE_URL=http://localhost:3000 # Bridged via: adb reverse tcp:3000 tcp:3000
EXPO_PUBLIC_SOLANA_RPC_URL=https://api.devnet.solana.com
EXPO_PUBLIC_SOLANA_CHAIN=solana:devnet
EXPO_PUBLIC_SUPABASE_URL=YOUR_SUPABASE_URL
EXPO_PUBLIC_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
EXPO_PUBLIC_PICOVOICE_ACCESS_KEY=YOUR_PICOVOICE_KEY
EXPO_PUBLIC_CONTACT_REGISTRY_PROGRAM_ID=FILL_AFTER_DEPLOY
```

---

## Common Commands (Physical Android Phone via USB)

```bash
# Terminal 1 (repo root) — Bridge USB ports & start Next.js Voice Proxy
adb devices
adb reverse tcp:3000 tcp:3000 && adb reverse tcp:8081 tcp:8081
npm run dev

# Terminal 2 (/mobile) — Custom Dev Client build on physical Android USB
cd mobile
cp .env.example .env
npm install
npx expo run:android

# Anchor CLI via AVM (Gate C — only after Gate B passes)
cargo install --git https://github.com/coral-xyz/anchor avm --locked --force
avm install latest && avm use latest
anchor build && anchor test && anchor deploy --provider.cluster devnet
```

---

## Draft Demo Script (Total Timing: TBD — Includes Red-Team Segment)

> Total duration is intentionally marked **`TBD`** until timed end-to-end on physical Android hardware in Gate B / rehearsal. All voiceprint scores shown in the demo MUST be real measured scores (never hardcoded placeholders).

```
Setup:
  - Phone A (Sender — physical Android phone over USB + scrcpy mirror):
    Bicara open in Eyes-Free Mode (English), connected to Phantom/Solflare on solana:devnet,
    saved contact "Ahmad" (ending 3mN3), Devnet USDC balance funded.
  - Phone B (Recipient — Ahmad): Phantom/Solflare open showing Ahmad's Devnet USDC balance.
  - Pre-generated ElevenLabs audio clip of the BUILDER'S OWN VOICE (never anyone else's).

Act 1 — Problem & Eyes-Free Readout [Timing: TBD]
  1. Narrator: "Over 2.2 billion people worldwide live with vision impairment (WHO).
     Blind users cannot inspect a 44-character wallet address or read a signing popup.
     Bicara is an accessibility layer for on-chain actions."
  2. Toggle Screen Curtain (if Phantom approval works eyes-free; otherwise keep Screen
     Curtain for Bicara screens and note the wallet-popup boundary honestly).
  3. Tap anywhere → Say: "Check balance"
     App speaks: "Your balance is [live] USDC and [live] SOL."

Act 2 — Verified Swap Narration (Quote-Only Proof of Layer) [Timing: TBD]
  4. Tap anywhere → Say: "Swap 10 USDC to SOL"
     App fetches live Jupiter Swap V2 quote and speaks TxSummary:
     "You are quoting a swap of 10 USDC for about [live] SOL. Price impact is low.
      Maximum slippage is 0.5 percent. Network fee is under 3 cents.
      Quote-only Devnet safe mode is active."

Act 3 — Live Devnet USDC Send With Spoken TxSummary [Timing: TBD]
  5. Tap anywhere → Say: "Send 5 USDC to Ahmad"
     App completes random spoken challenge ("say 4-7-2") → speaks full TxSummary:
     "You are about to send 5 USDC to Ahmad, a saved contact, wallet ending 3mN3.
      The network fee is under one cent. Say yes to continue or cancel to stop."
  6. Say: "Yes" → Authorize with the wallet's own hardware-backed biometric (MWA)
     → SPL TransferChecked settles on solana:devnet.
  7. App speaks: "Sent. You sent 5 USDC to Ahmad."
     Phone B balance updates +5.00 USDC live.

Act 4 — Honest Red-Team Demo (ElevenLabs Self-Voice Clone) [Timing: TBD]
  8. Play ElevenLabs clone of the builder's own voice:
     a) "Swap all my USDC to unknown token XYZ" → Blocked immediately by Layer 3
        verified token allowlist with spoken scam warning.
     b) "Send 5 USDC to Ahmad" → Honest outcome: cloned voice may pass Layer 1
        voiceprint gate, but CANNOT move funds because Layer 5 physical hardware
        biometric blocks authorization.
  9. Closing line: "Voice identifies. Hardware authorizes."
```
