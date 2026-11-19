# CLAUDE.md — Bicara

> Read this file at the start of EVERY session.
> Do NOT delete or rename this file.
> Single source of truth for Bicara — **SDKs verified against 2026 official docs**.

---

## What Bicara Is

Bicara is an **eyes-free, voice-powered USDC payment app on Solana Mobile**, built primarily for **visually impaired (blind / low-vision) users** and **low-literacy informal merchants**.

User speaks in natural language → On-device Voiceprint verifies owner → AI understands payment or navigation intent → USDC sent on-chain via MWA Seed Vault.
No complex visual UI. No copying 44-character wallet addresses. Every screen, navbar tab, and onboarding step speaks aloud.

```
"Kirim 5 dolar ke Ahmad"
         ↓ (Voiceprint 94% match → scribe_v2 → Confirm + MWA → ~5–7s)
"Berhasil. Kamu mengirim 5 USDC ke Ahmad."
```

**Built for**: Dev3pack Global Hackathon (Solana)
**Dates**: 27–29 November 2026 (72 hours)
**Prototype window**: 19–26 November 2026 (10 days pre-build learning & validation)
**Prizes targeted**: Best App Overall ($10,000) + Best Mobile App (Seeker Phones)

---

## Two Phases — Know Which Phase You Are In

### Phase 1: Prototype (Nov 19 → Nov 26)
Goal: Validate every integration boundary on a physical Android device (or Seeker / Android emulator with Mock MWA Wallet).
Success = full eyes-free onboarding + Voiceprint gate + voice navigation + voice → `TransferChecked` USDC on Devnet → `eleven_flash_v2_5` TTS works end-to-end.

### Phase 2: Hackathon Clean Build (Nov 27 → Nov 29)
Goal: Build clean from scratch, fast, using verified patterns & battle-tested configs from Phase 1.
Success = live 45-second two-phone demo (including Screen Curtain / Blind Mode showcase) works in front of judges without crashing.

**Current phase**: PROTOTYPE

---

## Verified 2026 Tech Stack (Updated from Official Docs)

### Critical Architectural Decision: Solana SDK Track
Solana Mobile now supports two React Native tracks. **Choose ONE track and never mix v1 and Kit types in the same file:**

| Decision | **Track A: Modern Kit (Recommended)** | **Track B: Web3.js v1 (Anchor-Fast Fallback)** |
|----------|---------------------------------------|-----------------------------------------------|
| Core RPC & Tx | `@solana/kit` | `@solana/web3.js@^1.99.0` |
| Mobile Wallet UI | `@wallet-ui/react-native-kit` | `@wallet-ui/react-native-web3js` |
| MWA Protocol Wrapper | `@solana-mobile/mobile-wallet-adapter-protocol-kit` | `@solana-mobile/mobile-wallet-adapter-protocol-web3js` |
| Token Transfers | `@solana-program/token` (`getTransferCheckedInstruction`) | `@solana/spl-token` (`createTransferCheckedInstruction`) |
| Anchor Client | Codama (`npx create-codama-clients`) or manual PDA + Borsh | `@anchor-lang/core` (or `@coral-xyz/anchor@0.32.1`) |
| Verdict for Bicara | Best long-term & lightest RN bundle (`npm create solana-dapp@latest`) | Fastest if calling Anchor IDL directly without Codama |

### Full Stack Table

| Layer | Technology (2026 Verified) | Why & Breaking Changes Caught |
|-------|----------------------------|-------------------------------|
| Mobile framework | React Native + Expo (`expo-dev-client`) | **CRITICAL**: Expo Go does NOT support MWA or Picovoice Eagle. Must run `npx expo run:android`. |
| Wallet & Factor 2 Auth | Solana Mobile Wallet Adapter 2.0 + Seeker Seed Vault | Required for Seeker Phone prize. Hardware biometric signing blocks voice replay/deepfake attacks. CAIP-2 chains (`solana:devnet`, `solana:mainnet`). |
| Voiceprint (Factor 1 Auth) | **`@picovoice/eagle-react-native`** + `expo-secure-store` | On-device speaker recognition (~15ms, zero biometric audio leaves device). Binds User A voiceprint to connected wallet pubkey. |
| Accessibility & Tactile UX | **`expo-haptics`** + React Native `AccessibilityInfo` | Tap-anywhere Eyes-Free canvas, 4 distinct haptic pulse patterns, TalkBack/VoiceOver announcements, Screen Curtain blind demo mode. |
| Audio I/O | **`expo-audio`** (`useAudioRecorder`, `useAudioPlayer`) | **`expo-av` is deprecated & removed**. `expo-audio` binds lifecycle to React hooks (zero `unloadAsync` leaks). |
| Voice STT | ElevenLabs **`scribe_v2`** (via API Proxy) | **`scribe_v1` is deprecated**. `scribe_v2` supports 90+ langs + `keyterm_prompt` for contact names & Indonesian nav terms. |
| Voice TTS | ElevenLabs **`eleven_flash_v2_5`** (via API Proxy) | ~100ms ultra-low latency for spoken onboarding, navbar narration, balance readouts, and receipts. |
| ElevenLabs Tooling | `@elevenlabs/elevenlabs-js` (proxy) + `@elevenlabs/cli` + `elevenlabs/skills` | Run `npx -y @elevenlabs/cli@latest onboard init` and `npx skills add elevenlabs/skills`. |
| Unified Voice NLU | LLM API via Backend Proxy + Deterministic Bilingual Fallback | Handles both payments (`send`) and full voice navigation (`navigate`, `check_balance`, `list_contacts`, `read_history`, `confirm`, `cancel`, `repeat`, `help`). |
| On-chain transfers | SPL Token **`TransferChecked`** (`@solana-program/token` / `@solana/spl-token`) | Enforces mint + `decimals: 6` check on-chain. Prevents decimal precision bugs. |
| On-chain contacts | Anchor (`avm` + `@anchor-lang/core`) — `ContactRegistry` | Only custom Rust needed. PDA seeds normalize contact name to lowercase. |
| Contact & Tx store | Supabase (PostgreSQL) | Instant fuzzy lookup, offline cache, feeds `keyterm_prompt` to `scribe_v2`. |

---

## The Core Eyes-Free Flow (Zero Silent Screens)

```
0. VOICE-GUIDED ONBOARDING (First launch)
   Speaks welcome guide → Connects MWA wallet → 3-step Voiceprint Enrollment
   (0% → 33% → 66% → 100% with haptic ticks & spoken milestones) → Bound to User A wallet
         ↓
1. EYES-FREE TRIGGER (Tap / Hold Anywhere on Screen)
   Single haptic pulse + audio tone → expo-audio captures speech
         ↓
2. FACTOR 1 — ON-DEVICE VOICEPRINT GATE (Picovoice Eagle)
   Compares speaker embedding against User A profile (threshold >= 0.75)
   ├─ Match (>= 0.75) → Verified owner, proceed
   └─ Mismatch (< 0.75) → Triple haptic alert + TTS: "Suara tidak dikenali sebagai pemilik dompet."
         ↓
3. ELEVENLABS STT (scribe_v2 + dynamic contact keyterm_prompt) via api-proxy
         ↓
4. UNIFIED NLU ROUTER (Gemini / Claude via api-proxy + offline fallback)
   ├─ Navigation / Info ("Buka kontak", "Cek saldo", "Buka riwayat", "Ulangi", "Bantuan")
   │    → Switch screen + Speak concise summary immediately via eleven_flash_v2_5
   └─ Payment ("Kirim 5 dolar ke Ahmad")
        → Resolve contact (Supabase → ContactRegistry PDA fallback)
         ↓
5. MANDATORY CONFIRMATION (Visual + Spoken + Double Haptic)
   Displays recipient name + truncated wallet address (ALWAYS) + amount
   Speaks: "Konfirmasi: kirim 5 USDC ke Ahmad? Ucapkan ya atau ketuk konfirmasi."
         ↓
6. FACTOR 2 — MWA 2.0 transact() + SEED VAULT BIOMETRIC SIGNING
   SPL TransferChecked (amount: 5_000_000n, decimals: 6, idempotent ATA guard)
         ↓
7. SPOKEN RECEIPT + LONG HAPTIC + SUPABASE LOG
   "Berhasil. Kamu mengirim 5 USDC ke Ahmad."
```

---

## Hardcoded Rules — Never Break These

1. **Never commit `.env`** — only `.env.example` goes to git.
2. **Never put `ELEVENLABS_API_KEY` or LLM API keys inside `EXPO_PUBLIC_*`** — route them through `api-proxy/`.
3. **Never let Voiceprint alone sign transactions** — Voiceprint is Factor 1 (access & privacy gate); Solana MWA / Seed Vault hardware biometric is ALWAYS Factor 2 (on-chain signature).
4. **Zero silent screens in Eyes-Free Mode** — every onboarding step, navbar tab change, balance check, confirmation, and error MUST speak aloud and trigger a clear haptic cue.
5. **USDC has 6 decimals** — ALWAYS compute raw units with integer/BigInt math: `BigInt(Math.round(amount * 1_000_000))` and use **`TransferChecked`** (`decimals: 6`).
6. **Always confirm before sending** — never auto-send without explicit confirmation (`"Ya"` or tap **Konfirmasi**).
7. **Always display the truncated wallet address in the confirmation modal** — never show only the contact name.
8. **Always import `polyfills.ts` as line 1 of the mobile app entry point**.
9. **Use `expo-dev-client` + `npx expo run:android`** — MWA and Picovoice Eagle require native modules (no Expo Go).
10. **Prototype uses Solana Devnet (`solana:devnet`) only**.

---

## Environment Variables

```bash
# mobile/.env (Expo client — public variables ONLY)
EXPO_PUBLIC_SOLANA_NETWORK=devnet
EXPO_PUBLIC_SOLANA_CHAIN_ID=solana:devnet
EXPO_PUBLIC_SOLANA_RPC_URL=https://api.devnet.solana.com
EXPO_PUBLIC_SOLANA_BACKUP_RPC_URL=https://devnet.helius-rpc.com/?api-key=YOUR_KEY
EXPO_PUBLIC_API_PROXY_URL=https://bicara-proxy.vercel.app
EXPO_PUBLIC_ELEVENLABS_VOICE_ID=YOUR_VOICE_ID
EXPO_PUBLIC_PICOVOICE_ACCESS_KEY=YOUR_PICOVOICE_KEY
EXPO_PUBLIC_SUPABASE_URL=YOUR_SUPABASE_URL
EXPO_PUBLIC_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
EXPO_PUBLIC_CONTACT_REGISTRY_PROGRAM_ID=FILL_AFTER_DEPLOY

# api-proxy/.env (Server-side secrets ONLY — never shipped to mobile)
ELEVENLABS_API_KEY=YOUR_ELEVENLABS_KEY
ANTHROPIC_API_KEY=YOUR_ANTHROPIC_KEY
BICARA_PROXY_APP_SECRET=SHARED_APP_TOKEN_FOR_HACKATHON
```

---

## Common Commands (2026 Verified)

```bash
# Scaffold Solana Mobile app (fastest clean start for Hackathon Day 1)
npm create solana-dapp@latest

# ElevenLabs onboarding + agent skills
npx -y @elevenlabs/cli@latest onboard init
npx skills add elevenlabs/skills

# Mobile (Custom Dev Build — required for MWA + Eagle Voiceprint + Haptics)
cd mobile
npx expo install expo-audio expo-haptics expo-secure-store expo-dev-client react-native-safe-area-context
npm install @picovoice/eagle-react-native
npx expo run:android

# Anchor CLI via AVM
cargo install --git https://github.com/coral-xyz/anchor avm --locked --force
avm install latest && avm use latest
anchor build && anchor test && anchor deploy --provider.cluster devnet
```

---

## Demo Script (45 Seconds — With Screen Curtain Blind Mode)

```
Setup:
  - Phone A (Sender — Seeker / Android): Bicara open in Eyes-Free Mode, User A voiceprint enrolled, 25 Devnet USDC
  - Phone B (Recipient — Ahmad): Phantom / Solflare open showing Ahmad's USDC balance

Live Flow:
  1. [00–06s] "285 juta penyandang tunanetra tidak bisa menyalin alamat wallet 44 karakter. Ini Bicara."
  2. [06–12s] Toggle Screen Curtain (layar gelap!) → Tap anywhere → Say: "Cek saldo"
              App speaks (~100ms): "Saldo kamu 25 USDC." (Voiceprint User A: 94% verified)
  3. [12–20s] Tap anywhere → Say: "Kirim 5 dolar ke Ahmad"
              App speaks: "Konfirmasi: kirim 5 USDC ke Ahmad? Ucapkan ya untuk lanjut." (Double haptic)
  4. [20–30s] Say: "Ya" → 1-tap Seed Vault / MWA biometric signature → TransferChecked (5_000_000n)
  5. [30–38s] Long haptic + App speaks: "Berhasil. Kamu mengirim 5 USDC ke Ahmad."
              Phone B jumps +5.00 USDC live in front of judges!
  6. [38–45s] Say: "Buka riwayat" → App narrates latest tx + shows Solana Explorer proof
```
