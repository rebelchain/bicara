# ARCHITECTURE.md — Bicara

## System in One Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                     USER (speaks)                           │
│           "Kirim 5 dolar ke Ahmad"                          │
└───────────────────────┬─────────────────────────────────────┘
                        │ audio recording
                        ▼
┌─────────────────────────────────────────────────────────────┐
│                  MOBILE APP (Expo)                          │
│                                                             │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │  MicButton  │  │ VoiceFeedback│  │ TransactionConfirm│  │
│  │  (record)   │  │  (waveform)  │  │    (modal)        │  │
│  └──────┬──────┘  └──────────────┘  └────────┬─────────┘  │
│         │                                     │            │
│         ▼                                     ▼            │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                    lib/                             │   │
│  │  elevenlabs.ts → STT → raw text                     │   │
│  │  intent.ts    → Claude API → structured intent      │   │
│  │  contacts.ts  → resolve name → wallet address       │   │
│  │  solana.ts    → build + send transaction            │   │
│  └─────────────────────────────────────────────────────┘   │
└───────────┬────────────────────────────┬────────────────────┘
            │                            │
            ▼                            ▼
┌───────────────────────┐   ┌────────────────────────────────┐
│   EXTERNAL SERVICES   │   │         SOLANA CHAIN           │
│                       │   │                                │
│  ElevenLabs           │   │  Devnet / Mainnet-beta         │
│  ├─ STT (audio→text)  │   │                                │
│  └─ TTS (text→audio)  │   │  ┌──────────────────────────┐ │
│                       │   │  │  SPL Token Program        │ │
│  Claude API           │   │  │  (existing — USDC         │ │
│  └─ Intent parsing    │   │  │   transfers)              │ │
│     (text→JSON)       │   │  └──────────────────────────┘ │
│                       │   │                                │
│  Supabase             │   │  ┌──────────────────────────┐ │
│  ├─ contacts table    │   │  │  ContactRegistry          │ │
│  └─ transactions table│   │  │  (Anchor program)         │ │
│                       │   │  │  register() + resolve()   │ │
└───────────────────────┘   │  └──────────────────────────┘ │
                            └────────────────────────────────┘
```

---

## Full Data Flow: Voice to Confirmation

### Step 1 — Record Audio
```
User holds MicButton
  → expo-av starts recording (m4a format)
User releases MicButton
  → recording stops
  → audio blob ready in memory
```

### Step 2 — Speech to Text
```
audio blob
  → POST to ElevenLabs STT API
  → returns: "kirim 5 dolar ke Ahmad"
  → display on screen while processing
```

### Step 3 — Intent Parsing
```
raw text: "kirim 5 dolar ke Ahmad"
  → POST to Claude API with system prompt
  → returns JSON:
    {
      "action": "send",
      "amount": 5,
      "currency": "USDC",
      "recipient": "Ahmad",
      "confidence": "high"
    }

If action = "unknown":
  → TTS: "Maaf, aku tidak mengerti. Coba lagi."
  → Return to mic screen
```

### Step 4 — Contact Resolution
```
recipient: "Ahmad"
  → Check Supabase contacts (fast, local)
  → If found: return { name: "Ahmad", wallet: "7xKp...mN3" }
  → If not found: check ContactRegistry on-chain
  → If still not found:
    → TTS: "Kontak Ahmad tidak ditemukan."
    → Show: "Add Ahmad to contacts?"
```

### Step 5 — Confirmation
```
Show TransactionConfirm modal:
  "Kirim 5 USDC ke Ahmad?
   Wallet: 7xKp...mN3
   
   [Konfirmasi]  [Batal]"

Simultaneously:
  → TTS: "Konfirmasi pengiriman 5 USDC ke Ahmad?"

User says "ya" OR taps Konfirmasi
  → proceed to Step 6

User says "batal" OR taps Batal
  → return to mic screen
```

### Step 6 — Execute Transaction
```
Build Solana transaction:
  → Get sender's ATA (Associated Token Account) for USDC
  → Get recipient's ATA for USDC
  → Create SPL transfer instruction (5 USDC = 5_000_000 raw)
  → Sign via Solana Mobile Wallet Adapter

Broadcast to Solana:
  → Send transaction to RPC
  → Wait for confirmation (commitment: "confirmed")
  → Get transaction signature
```

### Step 7 — Feedback + Logging
```
On success:
  → TTS: "Berhasil. Kamu mengirim 5 USDC ke Ahmad."
  → Show success animation
  → Log to Supabase transactions table
  → Update balance display

On failure:
  → TTS: "Gagal. [reason]. Coba lagi?"
  → Show error with retry button
  → Log error to Supabase (for debugging)
```

---

## Component Dependency Map

```
MicButton
  → uses: elevenlabs.ts (STT)
  → uses: intent.ts (parsing)
  → triggers: TransactionConfirm

TransactionConfirm
  → uses: contacts.ts (resolve)
  → uses: solana.ts (transfer)
  → uses: elevenlabs.ts (TTS)
  → triggers: success/error state

contacts.ts
  → reads: Supabase contacts table
  → reads: ContactRegistry on-chain (fallback)

solana.ts
  → uses: Solana Mobile Wallet Adapter
  → calls: SPL Token Program
  → calls: ContactRegistry program (for register)
```

---

## Two On-Chain Programs

### Program 1: SPL Token (not written by us)
```
Already exists on Solana.
We just call it to transfer USDC.
Nothing to deploy.
```

### Program 2: ContactRegistry (written by us — Anchor/Rust)
```
Purpose: on-chain address book
Two instructions only:

register_contact(name: String, wallet: Pubkey)
  → PDA: ["contact", user_pubkey, name_hash]
  → Stores: name + wallet address
  → Cost: ~0.002 SOL rent (one-time)

resolve_contact(name: String) → Pubkey
  → Read-only
  → Derives PDA → reads wallet address
  → Returns: wallet pubkey
```

---

## Why Two Storage Systems (Supabase + On-Chain)?

```
Supabase (fast, free):
  ✓ Instant reads — no RPC latency
  ✓ Fuzzy name matching ("ahm" finds "Ahmad")
  ✓ Transaction history
  ✓ Works offline for reads
  ✗ Centralized — if Supabase goes down, app breaks

ContactRegistry on-chain (slow, permanent):
  ✓ No central point of failure
  ✓ Anyone can verify on explorer
  ✓ "Proof" for hackathon judges: fully on-chain
  ✗ ~500ms RPC latency
  ✗ Costs SOL to register

Strategy: Supabase is primary. On-chain is fallback + prestige.
```

---

## Network Configuration

```typescript
// Prototype phase
const NETWORK = {
  cluster:    'devnet',
  rpcUrl:     'https://api.devnet.solana.com',
  usdcMint:   '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU', // devnet USDC
  explorerUrl: 'https://explorer.solana.com/?cluster=devnet',
}

// Hackathon phase (switch before demo)
const NETWORK = {
  cluster:    'mainnet-beta',
  rpcUrl:     'https://api.mainnet-beta.solana.com',  // or Helius
  usdcMint:   'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', // real USDC
  explorerUrl: 'https://explorer.solana.com',
}
```

---

## Error States Map

```
Voice errors:
  Mic permission denied → show permission dialog
  Audio too short (<1s) → "Coba lagi, terlalu singkat"
  STT API error         → "Suara tidak terdeteksi. Coba lagi."

Intent errors:
  action = "unknown"    → "Maaf, tidak mengerti. Contoh: kirim 5 USDC ke Ahmad"
  amount = null         → "Berapa yang ingin dikirim?"
  recipient = null      → "Kepada siapa?"
  confidence = "low"    → show text, ask user to confirm what they said

Contact errors:
  Not found anywhere    → "Kontak [name] tidak ditemukan. Tambah sekarang?"
  Multiple matches      → show list to choose from

Transaction errors:
  Insufficient balance  → "Saldo tidak cukup. Kamu punya X USDC."
  RPC timeout           → "Koneksi lambat. Coba lagi?"
  User rejected         → silent return to mic screen
  ATA not found         → "Ahmad belum punya USDC wallet. Tidak bisa kirim."
```
