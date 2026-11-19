# ARCHITECTURE.md — Bicara (Eyes-Free + Voiceprint 2FA)

## System Architecture (2026 Verified Topology)

```
┌──────────────────────────────────────────────────────────────────────┐
│              BLIND / EYES-FREE & LOW-LITERACY USER                   │
│   Tap-Anywhere Surface · Spoken Onboarding · Full Voice Navigation   │
└──────────────────────────────────┬───────────────────────────────────┘
                                   │ 16kHz PCM / .m4a (expo-audio)
                                   ▼
┌──────────────────────────────────────────────────────────────────────┐
│           SOLANA MOBILE APP (Expo Custom Dev Build / Seeker)         │
│                                                                      │
│  ┌──────────────────────────┐  ┌──────────────────────────────────┐  │
│  │ FACTOR 1: VOICEPRINT     │  │ ACCESSIBILITY & TACTILE LAYER    │  │
│  │ @picovoice/eagle-rn      │  │ - Tap-Anywhere Eyes-Free Canvas  │  │
│  │ User A ↔ owner_wallet    │  │ - Screen Curtain (Blind Demo)    │  │
│  │ (expo-secure-store)      │  │ - expo-haptics (4 pulse codes)   │  │
│  │ Score >= 0.75 → Pass     │  │ - AccessibilityInfo narrator     │  │
│  │ Score <  0.75 → Block    │  └──────────────────────────────────┘  │
│  └────────────┬─────────────┘                                        │
│               ▼                                                      │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │  lib/elevenlabs.ts + intent.ts  │  lib/solana.ts (MWA 2.0)     │  │
│  │  lib/contacts.ts (Supabase+PDA) │  TransferChecked + ATA guard │  │
│  └──────────────┬──────────────────┴──────────────┬───────────────┘  │
└─────────────────┼─────────────────────────────────┼──────────────────┘
                  │ HTTPS (no secrets on device)    │ MWA transact() + RPC
                  ▼                                 ▼
┌────────────────────────────────────┐   ┌─────────────────────────────┐
│    API PROXY (Vercel / Next.js)    │   │      SOLANA BLOCKCHAIN      │
│  Holds ELEVENLABS_API_KEY + LLM    │   │  solana:devnet / mainnet    │
│                                    │   │                             │
│  POST /api/stt                     │   │  ┌───────────────────────┐  │
│   └─ ElevenLabs scribe_v2          │   │  │ FACTOR 2: SEED VAULT  │  │
│      + keyterm_prompt (contacts +  │   │  │ Hardware Biometric    │  │
│        nav commands!)              │   │  │ Signs TransferChecked │  │
│                                    │   │  └───────────────────────┘  │
│  POST /api/intent                  │   │  ┌───────────────────────┐  │
│   └─ Unified Payment + Nav NLU     │   │  │ ContactRegistry (PDA) │  │
│      + Deterministic Regex Fallback│   │  │ Anchor (@anchor-lang) │  │
│                                    │   │  │ seeds: [contact,      │  │
│  POST /api/tts                     │   │  │  owner, name.lower()] │  │
│   └─ ElevenLabs eleven_flash_v2_5  │   │  └───────────────────────┘  │
└─────────────────┬──────────────────┘   └─────────────────────────────┘
                  ▼
┌────────────────────────────────────┐
│             SUPABASE               │
│  ├─ contacts (primary, fuzzy)      │
│  └─ transactions (history + audit) │
└────────────────────────────────────┘
```

---

## Security Architecture: Why Two-Factor Voiceprint + Seed Vault?

A common pitfall in voice-controlled crypto wallets is trusting voice recognition alone to move funds. Recorded audio replays or AI voice clones could spoof a voice-only wallet. Bicara solves this with **defense-in-depth**:

1. **Factor 1 — On-Device Voiceprint Gate (`@picovoice/eagle-react-native`)**:
   - Runs locally in ~15ms using 16kHz PCM audio frames; raw biometric profiles NEVER leave the phone.
   - Encrypted in `expo-secure-store` and bound directly to `owner_wallet` (`Base58` pubkey).
   - Blocks unauthorized speakers (`similarity < 0.75`) BEFORE reading private balances, transaction history, or triggering payment confirmations.
2. **Factor 2 — Hardware-Backed Signing (Solana Mobile MWA / Seeker Seed Vault)**:
   - Even after Voiceprint passes and user says `"Ya"`, cryptographic transaction signing ALWAYS happens inside MWA / Seeker Seed Vault (hardware fingerprint / device PIN).
   - Result: Blind users get seamless eyes-free navigation & privacy protection, AND funds remain mathematically unstealable by voice recordings.

---

## Unified Voice Routing & Screen Narration

Every voice utterance passes through the same unified router after Voiceprint verification:

| Intent Action | Example Indonesian / English Speech | App Behavior & Spoken Feedback |
|---------------|-------------------------------------|--------------------------------|
| `navigate` | `"Buka kontak"`, `"Buka riwayat"`, `"Kembali ke beranda"` | Switches active tab + speaks concise screen summary + light haptic tick |
| `check_balance` | `"Cek saldo"`, `"Berapa saldo aku?"` | Reads live USDC & SOL balance aloud from any screen |
| `list_contacts` | `"Baca kontak"`, `"Siapa saja kontak saya?"` | Navigates to Contacts and reads saved names + on-chain PDA count |
| `read_history` | `"Baca riwayat"`, `"Transaksi terakhir"` | Navigates to History and reads the 2 most recent confirmed transfers |
| `repeat` | `"Ulangi"`, `"Coba ulang"` | Replays `lastSpokenAnnouncement` immediately |
| `help` | `"Bantuan"`, `"Panduan"` | Reads concise Eyes-Free command list aloud |
| `confirm` / `cancel` | `"Ya"`, `"Konfirmasi"`, `"Batal"` | Confirms or cancels an active `TransactionConfirm` sheet |
| `send` | `"Kirim 5 dolar ke Ahmad"` | Resolves contact → opens mandatory confirmation sheet → speaks prompt |

---

## Tactile Haptic Language (`expo-haptics`)

Blind users rely on consistent vibration cues when the screen is off or in Screen Curtain mode:

| Event | `expo-haptics` Call | Meaning |
|-------|---------------------|---------|
| Listening started | `impactAsync(ImpactFeedbackStyle.Medium)` (1 pulse) | Mic is open — speak now |
| Tab / Onboarding milestone | `impactAsync(ImpactFeedbackStyle.Light)` (soft tick) | Navigation or enrollment chunk complete |
| Confirmation required | `notificationAsync(NotificationFeedbackType.Warning)` (2 pulses) | Listen carefully and confirm transfer |
| Transfer confirmed | `notificationAsync(NotificationFeedbackType.Success)` (long pulse) | USDC settled on Solana |
| Impostor / Error blocked | `notificationAsync(NotificationFeedbackType.Error)` (3 sharp pulses) | Voiceprint mismatch or failed check |
