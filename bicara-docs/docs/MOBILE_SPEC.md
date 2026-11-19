# MOBILE_SPEC.md — Eyes-Free Mobile App Specification (2026 Verified)

## Verified React Native & Expo Stack

```
Framework:      React Native + Expo (SDK 53+ with expo-dev-client)
Routing:        Expo Router (file-based tabs)
Wallet (2FA):   Solana Mobile Wallet Adapter 2.0 + Seeker Seed Vault
Audio:          expo-audio (useAudioRecorder + useAudioPlayer) — NO expo-av
Voiceprint:     @picovoice/eagle-react-native + expo-secure-store
Accessibility:  expo-haptics + React Native AccessibilityInfo (TalkBack / VoiceOver)
Polyfills:      react-native-get-random-values + @craftzdog/react-native-buffer
```

> **CRITICAL SETUP RULE**: Both Mobile Wallet Adapter and Picovoice Eagle require native Android modules. Always run `npx expo run:android` with `expo-dev-client` (never Expo Go).

---

## Eyes-Free Accessibility Architecture

### 1. Tap-Anywhere Voice Canvas (Mode Tunanetra)
When **Eyes-Free Mode** is active:
- The entire viewport body above the bottom tab bar acts as a **single giant accessible touch surface** (`accessible={true}`, `accessibilityRole="button"`, `accessibilityHint="Ketuk atau tahan di mana saja untuk mulai bicara"`).
- Users never need to locate a small icon or input box visually.
- Optional **Screen Curtain (Layar Gelap)** blanks the visual UI to privacy black while maintaining full touch responsiveness, audio narration, and haptic feedback — ideal both for real-world privacy for blind users and as a jaw-dropping live demo feature for judges!

### 2. Spoken Navbar & Zero-Silent-Screen Rule
Every tab in `(tabs)/` (`Home`, `Contacts`, `History`) announces itself automatically on focus via BOTH ElevenLabs `eleven_flash_v2_5` and `AccessibilityInfo.announceForAccessibility()`:
- **Home**: Speaks live USDC balance + ready hint.
- **Contacts**: Speaks total contact count + reads top contact names aloud.
- **History**: Speaks total transaction count + reads the most recent transfer aloud.
- All interactive elements enforce minimum `48px × 48px` hitboxes and descriptive Indonesian `accessibilityLabel` strings.

### 3. Voice-Guided Onboarding Screen (`app/onboarding.tsx`)
Zero silent screens on first launch:
1. Auto-speaks welcome instructions + explains tap-anywhere & haptic cues.
2. Connects Solana Mobile Wallet via MWA `authorize({ chain: 'solana:devnet' })` and speaks the last 4 wallet characters for verbal confirmation.
3. Walks through 3-phrase Voiceprint Enrollment (`0% → 33% → 66% → 100%`) using `EagleProfiler`, triggering light haptics + `AccessibilityInfo.announceForAccessibility` at every 33% milestone.
4. Saves encrypted voiceprint bound to wallet pubkey and reads the 4-command quick cheat sheet before transitioning to Home.

---

## Mandatory Confirmation Sheet (`<TransactionConfirm />`)
- **Visual**: Always renders recipient name, truncated wallet address (`7xKp4...3mN3`), amount (`5.00 USDC`), raw 6-decimal units, and explicit `Batal` / `Konfirmasi` buttons.
- **Eyes-Free Audio**: Immediately speaks `"Konfirmasi: kirim 5 USDC ke Ahmad? Ucapkan ya untuk lanjut atau batal untuk membatalkan."` with a double warning haptic pulse.
- **Dual Confirmation**: User can either tap **Konfirmasi** OR say `"Ya"` (which re-checks Voiceprint Factor 1 and immediately opens MWA Seed Vault Factor 2!).

---

## MVP Build Priority Ladder (Hackathon 72h Guardrail)
1. Custom Dev Client + polyfills + `MobileWalletProvider` + `expo-haptics`
2. MWA `authorize()` on physical Android / Seeker device
3. `expo-audio` capture + `api-proxy` (`scribe_v2` + unified NLU + `eleven_flash_v2_5`)
4. Tap-Anywhere Eyes-Free Canvas + Spoken Navbar (`Home`, `Contacts`, `History`)
5. Voice-Guided Onboarding + `@picovoice/eagle-react-native` Voiceprint Gate
6. `TransactionConfirm` (visual + spoken) + `TransferChecked` via MWA Seed Vault
7. Screen Curtain toggle for live judge demo
8. Contacts CRUD + History Explorer links + Anchor `ContactRegistry` PDA
