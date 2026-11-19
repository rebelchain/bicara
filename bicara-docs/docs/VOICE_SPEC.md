# VOICE_SPEC.md — Eyes-Free Voice, Voiceprint & NLU Specification (2026 Verified)

## Overview

The Bicara voice layer combines **five synchronized stages** so a visually impaired user can operate the entire app without ever looking at the screen:

```
0. Capture    → expo-audio (useAudioRecorder, replaces deprecated expo-av)
1. Voiceprint → @picovoice/eagle-react-native (on-device owner check, >= 0.75)
2. STT        → ElevenLabs scribe_v2 (+ contact & nav keyterm_prompt via api-proxy)
3. NLU        → Unified Payment + Navigation JSON parser (+ deterministic fallback)
4. TTS        → ElevenLabs eleven_flash_v2_5 (~100ms) + AccessibilityInfo + expo-haptics
```

---

## Part 1: On-Device Voiceprint Enrollment & Verification (Picovoice Eagle)

### Why On-Device Speaker Recognition?
- **Latency**: ~15ms locally on Android/Seeker CPU (zero network round-trip).
- **Privacy**: Biometric voice embeddings stay inside `expo-secure-store`, bound to the user's Solana wallet public key.
- **Accessible Enrollment**: Guided entirely by spoken Indonesian prompts + haptic milestones at `33%`, `66%`, and `100%` via `AccessibilityInfo.announceForAccessibility()`.

### Enrollment Flow (3 Guided Phrases During Onboarding)
1. Prompt 1 (`0% → 33%`): *"Ucapkan: Bicara adalah dompet suara saya."*
2. Prompt 2 (`33% → 66%`): *"Bagus, 33 persen. Sekarang ucapkan: Kirim lima dolar ke kontak saya."*
3. Prompt 3 (`66% → 100%`): *"Hampir selesai, 66 persen. Terakhir ucapkan: Cek saldo dompet Solana saya."*
4. Complete (`100%`): Export Eagle profile buffer → encrypt into `expo-secure-store` under key `bicara_voiceprint_${walletPubkey}` → Success haptic + TTS confirmation.

### Verification Gate Policy
- **Threshold**: Cosine/Eagle confidence score `>= 0.75` = Verified Owner (`User A`).
- **Protected Actions**: `send`, `confirm`, `check_balance`, `list_contacts`, `read_history`.
- **Unprotected Safe Actions**: `help`, `repeat` (so a user can still hear help instructions if voiceprint needs re-enrollment).
- **On Mismatch (`< 0.75`)**: Trigger Error Haptic (3 sharp pulses) + TTS `"Suara tidak cocok dengan pemilik dompet. Akses diblokir demi keamanan."`

---

## Part 2: Speech-to-Text (`scribe_v2` + Expanded `keyterm_prompt`)

Pass both contact names AND Indonesian navigation commands into `scribe_v2`'s `keyterm_prompt`:
```typescript
const keyterms = [
  'USDC', 'SOL', 'Solana', 'Bicara', 'dolar',
  'kirim', 'transfer', 'konfirmasi', 'batal',
  'buka kontak', 'buka riwayat', 'cek saldo', 'beranda', 'ulangi', 'bantuan',
  ...userContactNames,
];
```

---

## Part 3: Unified Payment + Navigation NLU Schema

```typescript
export type VoiceAction =
  | 'send'
  | 'navigate'
  | 'check_balance'
  | 'list_contacts'
  | 'read_history'
  | 'confirm'
  | 'cancel'
  | 'repeat'
  | 'help'
  | 'unknown';

export interface PaymentIntent {
  action: VoiceAction;
  targetTab?: 'home' | 'contacts' | 'history' | null;
  amount: number | null;
  currency: 'USDC' | 'SOL' | null;
  recipient: string | null;
  confidence: 'high' | 'low';
  raw_amount_text: string | null;
}
```

---

## Part 4: Eyes-Free Spoken Script Library (`eleven_flash_v2_5`, ~100ms)

```typescript
export const VOICE_SCRIPTS = {
  onboardingWelcome: () =>
    'Selamat datang di Bicara. Dompet USDC berbasis suara di Solana Mobile. Sentuh layar di mana saja untuk mulai bicara.',
  onboardingWalletReady: (shortWallet: string) =>
    `Dompet Solana terhubung dengan akhiran ${shortWallet}. Sekarang mari daftarkan sidik suara kamu dalam 3 langkah singkat.`,
  onboardingComplete: () =>
    'Sidik suara aktif dan terhubung ke dompet kamu. Kamu bisa ucapkan cek saldo, buka kontak, buka riwayat, atau kirim 5 dolar ke Ahmad.',
  navHome: (usdc: number) =>
    `Halaman Beranda. Saldo kamu ${usdc.toFixed(2)} USDC. Sentuh layar di mana saja lalu bicara.`,
  navContacts: (count: number, names: string[]) =>
    `Halaman Kontak. Kamu punya ${count} kontak: ${names.join(', ')}. Sebutkan nama untuk mengirim, atau ucapkan kembali ke beranda.`,
  navHistory: (count: number, latestSummary: string | null) =>
    latestSummary
      ? `Halaman Riwayat. Ada ${count} transaksi. Terakhir: ${latestSummary}.`
      : 'Halaman Riwayat. Belum ada transaksi terkirim.',
  balanceReadout: (usdc: number, sol: number) =>
    `Saldo kamu saat ini ${usdc.toFixed(2)} USDC dan ${sol.toFixed(2)} SOL untuk biaya jaringan.`,
  voiceprintBlocked: (scorePct: number) =>
    `Suara tidak cocok dengan pemilik dompet (${scorePct} persen). Transaksi diblokir demi keamanan.`,
  helpGuide: () =>
    'Panduan Bicara: ucapkan cek saldo, buka kontak, buka riwayat, ulangi, atau kirim 5 dolar ke Ahmad.',
};
```
