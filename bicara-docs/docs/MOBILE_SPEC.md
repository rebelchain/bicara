# MOBILE_SPEC.md — Eyes-Free Android Reference App Specification (2026 Verified)

## Verified React Native & Expo Stack (Reconciled With `mobile/package.json`)

```
Framework:       React Native 0.79.2 + Expo SDK 53 (~53.0.23) with expo-dev-client
Routing:         Expo Router (~5.0.0, file-based tabs)
Entry & Boot:    mobile/index.js → imports ./polyfill (mobile/polyfill.js) BEFORE expo-router/entry
Crypto Polyfill: react-native-get-random-values + react-native-quick-crypto (^1.1.10)
                 + react-native-quick-base64 (^3.0.2) + react-native-nitro-modules (0.35.0)
                 + mobile/metro.config.js ('crypto' -> 'react-native-quick-crypto')
Wallet (Layer 5):@solana/kit (^8.6.0) + @wallet-ui/react-native-kit (^4.4.1)
                 + @solana-mobile/mobile-wallet-adapter-protocol-kit (^3.0.2)
                 + @solana-program/token (^0.18.0)
Audio I/O:       expo-audio (~0.4.0 — useAudioRecorder, useAudioPlayer; NO expo-av)
Voiceprint (Opt):@picovoice/eagle-react-native + expo-secure-store (Layer 1 — optional)
Accessibility:   expo-haptics + React Native AccessibilityInfo (TalkBack / VoiceOver)
Core Module:     accessible-signing (reusable narration, verification & policy layer)
```

> **CRITICAL BUILD RULE**: MWA and native crypto/voiceprint modules require a Custom Dev Build. Always run `npx expo run:android` on a physical Android phone over USB (never Expo Go).

---

## Hardware & Wallet Support Policy (Decision D6)

- **Android-Wide MWA Compatibility**: Bicara must work on **any Android device** running Phantom or Solflare via Solana Mobile Wallet Adapter (MWA 2.0) on `solana:devnet`.
- **Biometric Terminology Rule**:
  - Claim **"Seed Vault"** **ONLY** when running on Solana Seeker hardware.
  - On all other Android phones (Phantom, Solflare, etc.), describe signing strictly as **"the wallet's own hardware-backed biometric"**.
- **Gate A Eyes-Free Wallet Popup Check**: During Gate A (20–22 Nov), test on the physical phone whether Phantom/Solflare's MWA approval screen can be operated eyes-free (via TalkBack or biometric-only). If the external wallet popup requires sight, document the exact demo implication for **Screen Curtain** mode honestly in `PROGRESS.md`.

---

## Internationalization & Locale Dictionary Requirement (Decision D1)

- **Default & Shipped Language**: **English only** across all spoken scripts, UI labels, button text, error messages, and `accessibilityLabel` / `accessibilityHint` props.
- **Locale Dictionary Architecture**: All spoken strings and UI accessibility copy MUST live inside a typed locale dictionary (e.g., `src/i18n/en.ts` exported via a `getLocaleStrings(locale)` helper) — never hardcoded inline across screens — so additional languages can be added post-hackathon without touching business logic.
- **Zero Non-English Copy**: No Indonesian UI strings, regional payment framing, or non-English demo commands in the mobile specification or shipped app.

---

## Eyes-Free Accessibility Architecture

### 1. Tap-Anywhere Voice Canvas
When **Eyes-Free Mode** is active:
- The main viewport above the bottom tab bar acts as a **single large accessible touch target** (`accessible={true}`, `accessibilityRole="button"`, `accessibilityLabel="Start speaking"`, `accessibilityHint="Tap anywhere on this area to speak a payment, swap, or navigation command"`).
- Users never need to visually hunt for small buttons or text inputs.
- **Screen Curtain Privacy Mode**: Blanks visual UI to solid black while preserving full touch responsiveness, ElevenLabs audio narration, TalkBack announcements, and `expo-haptics` cues. *(Respect the Gate A finding on external wallet popup visibility).*

### 2. Spoken Bottom Navbar & Zero-Silent-Screen Rule
Every tab in `(tabs)/` (`Home`, `Contacts`, `History`) announces itself automatically on focus via ElevenLabs `eleven_flash_v2_5` (with `expo-speech` offline fallback) and `AccessibilityInfo.announceForAccessibility()`:
- **Home**: Speaks live Devnet USDC & SOL balance plus tap-anywhere prompt.
- **Contacts**: Speaks verified contact count and reads saved contact names aloud. Adding or editing a contact **requires physical hardware biometric confirmation — never voice alone**.
- **History**: Speaks transaction count and reads the latest confirmed Devnet transfer aloud.
- All interactive elements enforce minimum **`48px × 48px`** touch targets and clear English `accessibilityLabel` strings.

### 3. Voice-Guided Onboarding (`app/onboarding.tsx`)
Zero silent screens on first launch (all prompts pulled from the English locale dictionary):
1. Speaks welcome instructions and demonstrates the haptic pulse codes.
2. Connects Android wallet via MWA `authorize({ chain: 'solana:devnet' })` and speaks the last 4 wallet characters for confirmation.
3. Optional Layer 1 Voiceprint Enrollment (`0% → 33% → 66% → 100%`) using `EagleProfiler` with light haptic ticks and `AccessibilityInfo` milestone announcements. *(Skipped gracefully if Eagle is disabled in Gate A fallback).*
4. Speaks the quick English command summary (`"check balance"`, `"open contacts"`, `"send 5 USDC to Ahmad"`, `"swap 10 USDC to SOL"`, `"help"`) before navigating to Home.

---

## Mandatory Confirmation Sheet (`<TransactionConfirm />`)

Consumes a `TxSummary` from `accessible-signing` for both **Send** and **Verified Swap (Quote-Only)**:

### For Send (`devnet_transfer`)
- **Visual**: Displays recipient name, **saved vs. NEW recipient badge**, **truncated wallet address** (`7xKp4...3mN3` — ALWAYS shown), amount (`5.00 USDC`), runtime-computed network fee, ATA creation rent (if applicable), anomaly warnings, and explicit **`Cancel`** / **`Confirm`** buttons.
- **Audio + Haptics**: Fires double Warning haptic and speaks the complete `TxSummary` narration (including first-use explanation that USDC is a US-dollar stablecoin).
- **Confirmation**: Accepts spoken `"yes"` / `"confirm"` (after Layer 2 random spoken challenge in hackathon window) or tapping **Confirm**, then invokes Layer 5 MWA hardware-backed biometric signing (`signAndSendTransactions`).

### For Verified Swap (`quote_only_safe_mode`)
- **Visual**: Displays explicit direction (`Sell 10.00 USDC → Buy ~X.XX SOL`), verified token status, price impact level, max slippage (`0.5%`), runtime fee estimate, **`Quote-Only (Devnet Safe Mode)`** label, and **`Cancel`** / **`Re-Quote`** controls.
- **Audio + Haptics**: Speaks the full swap `TxSummary` narration, re-checks quote drift before final confirmation, and hard-blocks unverified tokens with Error haptic (3 sharp pulses) and spoken warning.

---

## Gate-Aligned Build Priority Ladder

1. **Gate A (20–22 Nov — Physical Android USB)**: Custom Dev Client boots cleanly (`mobile/polyfill.js` + `metro.config.js`), `/api/health` OK over `adb reverse`, MWA `authorize()` on `solana:devnet` (Phantom/Solflare), test eyes-free usability of wallet approval screen, measure real Eagle genuine vs. impostor scores, measure `scribe_v2` English + dynamic `keyterms`, measure `eleven_flash_v2_5` latency, verify live Jupiter Swap V2 Quote-Only proxy response.
2. **Gate B (23–24 Nov — End-to-End Core + Quote-Only Swap)**: Live Devnet USDC/SOL balance readout, Supabase contacts CRUD (biometric-gated edits), full `voice → intent → confirm → TransferChecked → spoken receipt` on Devnet, plus Quote-Only `USDC ↔ SOL` swap narration and read-only price/portfolio readout.
3. **Gate C (25 Nov — Only If Gate B Passes)**: Anchor `ContactRegistry` PDA verified address book + dual-write with Supabase.
4. **Hackathon Window (27–29 Nov — Post `hackathon-start`)**: Layer 2 random spoken challenge, Layer 3 risk policy & verified token allowlist enforcement, full Layer 4 `TxSummary` narration + swap pre-sign re-quote drift check, ElevenLabs self-voice red-team demo, and extraction of the reusable `accessible-signing` module.
