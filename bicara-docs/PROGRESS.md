# PROGRESS.md — Bicara Build Tracker

> UPDATE THIS FILE at the end of every session.
> Be specific — "working" is useless; "Eagle voiceprint rejects Impostor B at 0.28 score on Android" is useful.

---

## Current Phase
**PROTOTYPE (Pre-Hackathon Prep: Nov 19 → Nov 26, 2026)**
Hackathon kickoff: **Nov 27, 2026** (72 hours — ends Nov 29, 2026)

---

## Last Session
```
Date:        2026-11-19
What worked: Completed Step 1 of the 4-Step Full-Scope Hackathon Build (Physical Android USB):
             - Scaffolded real `/mobile` Expo Custom Dev Build (Track A: @solana/kit +
               @wallet-ui/react-native-kit + @solana-program/token + expo-dev-client)
             - Wired boot-first WebCrypto polyfills (`mobile/polyfill.js` -> `mobile/index.js`)
             - Built physical `expo-haptics` 4-code accessibility engine + Zero-Silent-Screen speech
             - Built modern `expo-audio` recording hook + Spoken Bottom Tab Navigator + Tap-Anywhere Home
             - Added Next.js server Voice Proxy APIs: `GET /api/health`, `POST /api/stt` (scribe_v2),
               `POST /api/tts` (eleven_flash_v2_5), alongside `POST /api/intent` (Gemini 4 Hydrogen)
             - Added interactive `Build Kit` tab with Physical Android USB runbook (JDK 17 + Android SDK,
               no emulator), live proxy diagnostics, live `/mobile` file viewer, and 3-item Production Roadmap
Stopped at:  Step 1 scaffold & voice proxy APIs ready for physical USB install (`npx expo run:android`).
Next step:   Step 2 — Verify APK on physical Android phone via USB (`adb reverse tcp:3000 tcp:3000`),
             connect Phantom Devnet MWA, read live Devnet USDC balance, and wire Supabase contacts.
```

---

## 10-Day Pre-Hackathon Prototype Schedule (Nov 19 → Nov 26)

| Days | Focus | Concrete Exit Criteria |
|------|-------|------------------------|
| **Nov 19–20** | **Step 1**: Expo Dev Client + MWA + Physical Haptics + Proxy | `npx expo run:android` boots on USB Android phone; MWA opens Phantom Devnet; 4 physical haptics & `/api/health` pass |
| **Nov 21–22** | **Step 2**: Live Devnet Balance + Supabase + Spoken Onboarding | Live Devnet USDC balance readout + Supabase contacts + full spoken onboarding flow on physical phone |
| **Nov 23–24** | **Step 3**: Live Voice Payment Loop + Picovoice Eagle Voiceprint | `expo-audio` → `/api/stt` → `/api/intent` → Eagle User A (94%) / Impostor B blocked → voice `"Ya"` → `TransferChecked` via MWA → `/api/tts` |
| **Nov 25** | **Step 4**: Anchor `ContactRegistry` PDA (Devnet) | `avm use latest`, `anchor build`, `anchor test`, deploy to devnet, dual-write Supabase + lowercase PDA resolve |
| **Nov 26** | Blind-Mode Rehearsal & Backup Video | Rehearse 45s demo on physical Android phone (`scrcpy` mirror) WITH Screen Curtain enabled; record crisp backup video |

---

## Build Checklist

### Step 1 — Environment, Physical Android USB, Polyfills & Voice Proxy
- [x] Real `/mobile` Expo Custom Dev Build scaffolded (Track A `@solana/kit` + `expo-dev-client`, NO Expo Go)
- [x] Boot-first WebCrypto polyfills (`mobile/polyfill.js` → `mobile/index.js`) wired before `expo-router/entry`
- [x] Physical `expo-haptics` 4 tactile patterns + `AccessibilityInfo.announceForAccessibility` + `expo-audio` hook created
- [x] Next.js Voice Proxy endpoints created (`/api/health`, `/api/stt`, `/api/tts`, `/api/intent`) with server-only keys
- [ ] Run `adb devices` → `adb reverse tcp:3000 tcp:3000` → `npx expo run:android` on physical Android phone via USB
- [ ] Verify MWA `connect()` opens Phantom/Solflare (Devnet mode) and `/api/health` returns `Connected` on phone

### Phase 2 — Voice Onboarding, Voiceprint & Full Voice Navigation
- [ ] Voice-Guided Onboarding speaks welcome, wallet setup, and 3-phrase enrollment (`0% → 100%`)
- [ ] `@picovoice/eagle-react-native` enrolls User A profile into `expo-secure-store` bound to `owner_wallet`
- [ ] Speaker verification accepts User A (`>= 0.75`) and blocks unrecognized voices with triple haptic + TTS alert
- [ ] Tap-Anywhere Eyes-Free Canvas + Screen Curtain mode working cleanly
- [ ] Full voice navigation works: `"Buka kontak"`, `"Buka riwayat"`, `"Kembali ke beranda"`, `"Cek saldo"`, `"Baca kontak"`, `"Ulangi"`, `"Bantuan"`
- [ ] Every tab change narrates concise screen summary aloud via `eleven_flash_v2_5` (~100ms)

### Phase 3 — Transaction Layer (`TransferChecked` + Seed Vault 2FA)
- [ ] Read live Devnet USDC balance and speak it naturally (`"25 USDC"`)
- [ ] Resolve contact name from Supabase (fallback: `ContactRegistry` PDA)
- [ ] Confirmation modal speaks recipient + wallet + amount; accepts voice `"Ya"` or tap
- [ ] Build `TransferChecked` (`BigInt(Math.round(amount * 1_000_000))`, `decimals: 6`) + idempotent ATA guard
- [ ] Sign via MWA `signAndSendTransactions` (Seed Vault hardware biometric Factor 2) + log to Supabase

### Phase 4 — Anchor `ContactRegistry` (Do AFTER Phases 1–3 Pass)
- [ ] `avm install latest && avm use latest` verified
- [ ] `contact-registry` compiles, passes tests, deployed to Devnet, Program ID updated in `config.ts`

---

## Verified 2026 SDK Compatibility Matrix

```
Audio I/O:              expo-audio (replaces deprecated expo-av)
Voiceprint (Factor 1):  @picovoice/eagle-react-native + expo-secure-store
Tactile & Screen Reader: expo-haptics + React Native AccessibilityInfo
MWA (Track A - Kit):    @wallet-ui/react-native-kit + @solana-mobile/mobile-wallet-adapter-protocol-kit + @solana/kit
MWA (Track B - v1):     @wallet-ui/react-native-web3js + @solana-mobile/mobile-wallet-adapter-protocol-web3js + @solana/web3.js@^1.99.0
SPL Token:              @solana-program/token (TransferChecked) / @solana/spl-token (createTransferCheckedInstruction)
Anchor CLI / Client:    avm latest / @anchor-lang/core + Codama
ElevenLabs STT / TTS:   scribe_v2 (+ keyterm_prompt) / eleven_flash_v2_5 (~100ms) / @elevenlabs/elevenlabs-js
Database:               @supabase/supabase-js
```
