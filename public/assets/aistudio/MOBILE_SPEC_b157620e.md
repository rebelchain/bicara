# MOBILE_SPEC.md — Mobile App Specification

## Stack
```
React Native + Expo (SDK — check docs.expo.dev for latest)
Expo Router (file-based routing)
NativeWind (Tailwind for React Native) OR StyleSheet
React Native Reanimated (animations)
Solana Mobile Wallet Adapter (⚠️ check docs.solanamobile.com for latest)
```

---

## Navigation Structure

```
(tabs)/
  index.tsx      ← Tab 1: Home (mic button) — DEFAULT
  contacts.tsx   ← Tab 2: Contacts
  history.tsx    ← Tab 3: History

Tab bar:
  Home     → mic icon
  Contacts → person icon
  History  → clock icon

No header on Home tab.
Minimal header on Contacts and History.
```

---

## Screen 1: Home (`app/(tabs)/index.tsx`)

**Purpose**: The main screen. One job: record voice.

```
Layout (full screen):

┌─────────────────────────────┐
│  Bicara          [wallet]   │  ← top bar
│  ─────────────────────────  │
│                             │
│      Balance: 20.00 USDC    │  ← live balance
│                             │
│                             │
│           ⠿⠿⠿              │  ← waveform (shows when recording)
│                             │
│                             │
│         [  🎤  ]            │  ← BIG mic button (center)
│                             │
│   "Tekan dan bicara"        │  ← hint text
│                             │
│  ─────────────────────────  │
│  [Home]  [Contacts] [History]│ ← tab bar
└─────────────────────────────┘
```

**States**:
```
IDLE:
  - Mic button: solid green circle
  - Hint: "Tekan dan bicara"
  - Waveform: hidden

RECORDING:
  - Mic button: pulsing red circle
  - Hint: "Bicara sekarang..."
  - Waveform: animated

PROCESSING:
  - Mic button: spinner
  - Transcript appears as text below waveform
  - Hint: "Memproses..."

CONFIRMING:
  - TransactionConfirm modal appears (see components)
```

---

## Screen 2: Contacts (`app/(tabs)/contacts.tsx`)

**Purpose**: Manage address book. Add, view, delete contacts.

```
Layout:

┌─────────────────────────────┐
│  ← Contacts      [+ Add]    │
│  ─────────────────────────  │
│  🔍 Cari kontak...          │
│  ─────────────────────────  │
│                             │
│  A                          │
│  ┌────────────────────────┐ │
│  │ 👤 Ahmad               │ │
│  │    7xKp...mN3  [copy]  │ │
│  │    ● On-chain verified │ │
│  └────────────────────────┘ │
│                             │
│  B                          │
│  ┌────────────────────────┐ │
│  │ 👤 Budi                │ │
│  │    9mXr...pQ2  [copy]  │ │
│  └────────────────────────┘ │
│                             │
└─────────────────────────────┘
```

**Add Contact modal**:
```
Name: [____________]
Wallet address: [________________________]
            or
[Scan QR Code]

[Save Contact]  [Save + Register On-chain]
```

---

## Screen 3: History (`app/(tabs)/history.tsx`)

**Purpose**: Transaction history. Sent payments.

```
Layout:

┌─────────────────────────────┐
│  ← History                  │
│  ─────────────────────────  │
│                             │
│  Today                      │
│  ┌────────────────────────┐ │
│  │ ↗ Ahmad          -5 USDC│
│  │   "kirim 5 dolar ke..." │
│  │   2:34 PM · Confirmed   │
│  │   [View on Explorer →]  │
│  └────────────────────────┘ │
│                             │
│  Yesterday                  │
│  ┌────────────────────────┐ │
│  │ ↗ Budi         -20 USDC│
│  │   3:12 PM · Confirmed  │
│  └────────────────────────┘ │
│                             │
└─────────────────────────────┘
```

---

## Components

### `<MicButton />`
```typescript
interface MicButtonProps {
  onRecordStart: () => void
  onRecordStop: (audioUri: string) => void
  state: 'idle' | 'recording' | 'processing'
}

// Behavior:
// - Press and hold to record
// - Release to stop
// - Shows pulsing animation while recording
// - Shows spinner while processing
// - Minimum hold time: 500ms (prevent accidental taps)
```

### `<TransactionConfirm />`
```typescript
interface TransactionConfirmProps {
  amount: number
  currency: 'USDC' | 'SOL'
  recipientName: string
  recipientWallet: string
  onConfirm: () => void
  onCancel: () => void
  visible: boolean
}

// Layout:
// ┌─────────────────────────┐
// │  Konfirmasi Pengiriman  │
// │  ─────────────────────  │
// │  Kepada:  Ahmad         │
// │  Wallet:  7xKp...mN3   │  ← always show wallet
// │  Jumlah:  5.00 USDC    │
// │  ─────────────────────  │
// │  [Batal]  [Konfirmasi]  │
// └─────────────────────────┘
//
// RULE: Always show full wallet address (truncated)
// RULE: Never auto-confirm — user must always tap or say "ya"
```

### `<VoiceFeedback />`
```typescript
interface VoiceFeedbackProps {
  isRecording: boolean
  transcript: string | null  // shows as it comes in
}

// Animated waveform bars while recording
// Transcript text fades in after STT returns
```

### `<WalletButton />`
```typescript
// Top right of Home screen
// Connected: shows truncated address + SOL balance
// Disconnected: shows "Connect Wallet"
// Uses Solana Mobile Wallet Adapter
// ⚠️ Check solanamobile.com for latest connect implementation
```

### `<ContactCard />`
```typescript
interface ContactCardProps {
  name: string
  wallet: string
  isOnChain: boolean  // shows verified badge if registered on ContactRegistry
  onPress: () => void
  onDelete: () => void
}
```

### `<TxHistoryItem />`
```typescript
interface TxHistoryItemProps {
  recipientName: string | null
  recipientWallet: string
  amount: number
  currency: string
  timestamp: Date
  txSignature: string
  status: 'confirmed' | 'failed'
  voiceTranscript: string | null  // what the user said
}
```

---

## Design Tokens

```typescript
export const COLORS = {
  // Backgrounds
  bgPrimary:   '#0F0F0F',  // almost black — dark mode
  bgSecondary: '#1A1A1A',  // card backgrounds
  bgTertiary:  '#252525',  // input backgrounds

  // Brand
  green:       '#22C55E',  // primary action, success
  greenDark:   '#16A34A',  // button pressed state
  greenGlow:   'rgba(34,197,94,0.2)',  // mic button glow

  // Text
  textPrimary:   '#FFFFFF',
  textSecondary: '#9CA3AF',
  textMuted:     '#6B7280',

  // Semantic
  error:   '#EF4444',
  warning: '#F59E0B',
  success: '#22C55E',

  // Border
  border: '#2D2D2D',
}

export const FONTS = {
  // Use system font stack for performance
  regular: 'System',
  medium:  'System',
  bold:    'System',
}

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
}

export const RADIUS = {
  sm: 8,
  md: 12,
  lg: 16,
  full: 9999,
}
```

---

## Mic Button — The Most Important UI Element

This is the ONLY thing that matters visually for the demo.
Spend 50% of UI time on this one component.

```
Size: 100px × 100px minimum (easy tap target)
Position: Exact center of screen
Color: Green (#22C55E) idle, Red (#EF4444) recording

Animations:
  Idle:      Subtle breathing scale (1.0 → 1.03 → 1.0, 3s loop)
  Recording: Pulsing ring expands outward (green → transparent)
  Processing: Rotating spinner overlay

Sound:
  On press:   Subtle click (haptic feedback)
  On release: Subtle click (haptic feedback)
  
Minimum hold: 500ms — ignore taps shorter than this
```

---

## Wallet Connection

```typescript
// ⚠️ This is the most platform-specific part
// Solana Mobile Wallet Adapter API changes between versions
// Always check: docs.solanamobile.com before implementing

// General flow (verify exact API):
// 1. Check if wallet app installed on device
// 2. If yes: use MWA to connect
// 3. If no: show "Install a Solana wallet" prompt
// 4. After connect: get publicKey
// 5. Store publicKey in app state

// For demo/prototype without Seeker Phone:
// Use a keypair stored in SecureStore as fallback
// NEVER do this in production
```

---

## MVP Screen Priority

```
Build in this order:

1. Home screen skeleton (layout only, no functionality)
2. Wallet connect (can't do anything without this)
3. MicButton records audio (just saves file, no processing)
4. STT integration (audio → text displayed on screen)
5. Intent parsing (text → JSON displayed on screen)
6. Balance display (read USDC balance)
7. TransactionConfirm modal (UI only, no actual send)
8. Actual USDC transfer
9. TTS feedback
10. Contacts screen
11. History screen

Stop at step 9 if running out of time.
Steps 10-11 are nice-to-have for hackathon.
Steps 1-9 are the demo.
```
