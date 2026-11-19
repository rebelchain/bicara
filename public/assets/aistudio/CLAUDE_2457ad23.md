# CLAUDE.md — Bicara

> Read this file at the start of EVERY session.
> Do NOT delete or rename this file.
> This is the single source of truth for the entire project.

---

## What Bicara Is

Bicara is a voice-powered USDC payment app on Solana Mobile.

User speaks in natural language → AI understands → USDC sent on-chain.
No complex UI. No copy-paste wallet addresses. Just talk.

```
"Kirim 5 dolar ke Ahmad"
         ↓ (~10 seconds)
"Berhasil. Kamu mengirim 5 USDC ke Ahmad."
```

**Built for**: Dev3pack Global Hackathon (Solana)
**Dates**: 27–29 November 2026
**Prizes targeted**: Best App Overall ($10,000) + Best Mobile App (Seeker Phones)

---

## Two Phases — Know Which Phase You Are In

### Phase 1: Prototype (Now → Nov 26)
Goal: Understand every connection between components.
NOT for perfection. NOT for production.
Success = full voice → USDC transfer flow works on devnet.

### Phase 2: Hackathon (Nov 27–29)
Goal: Build clean from scratch, fast, using everything learned in Phase 1.
Success = live demo works in front of judges without crashing.

**Current phase**: PROTOTYPE

---

## Tech Stack (Do Not Deviate)

| Layer | Technology | Why |
|-------|-----------|-----|
| Mobile framework | React Native + Expo (SDK 51+) | Fastest path to Solana Mobile |
| Wallet | Solana Mobile Wallet Adapter | Required for Seeker Phone prize |
| Voice input | ElevenLabs Speech-to-Text API | Sponsor tool — judges notice |
| Voice output | ElevenLabs Text-to-Speech API | Closes the voice loop |
| Intent parsing | Claude API (claude-sonnet-4-6) | Extract name + amount from free speech |
| On-chain transfers | SPL Token Program (existing) | USDC transfers — no need to write Rust |
| On-chain contacts | Anchor program — ContactRegistry | Only custom Rust needed |
| Contact storage | Supabase | Address book, cached contacts |
| Tx history | Supabase | Local history for UI |
| Network (prototype) | Solana Devnet | Free, fast, no real money |
| Network (hackathon) | Solana Devnet → Mainnet-beta | Switch before final demo |
| Token (prototype) | Devnet USDC mock | SPL token on devnet |
| Token (hackathon) | USDC (mainnet) or devnet USDC | Confirm before demo |

---

## Folder Structure

```
bicara/
├── CLAUDE.md                        ← YOU ARE HERE
├── docs/
│   ├── ARCHITECTURE.md              ← system overview + data flow
│   ├── VOICE_SPEC.md                ← ElevenLabs + intent parsing spec
│   ├── PROGRAM_SPEC.md              ← Anchor ContactRegistry spec
│   ├── MOBILE_SPEC.md               ← screens, components, navigation
│   └── PROJECT.md                   ← one-pager for judges
│
├── mobile/                          ← React Native + Expo app
│   ├── app/
│   │   ├── (tabs)/
│   │   │   ├── index.tsx            ← Home: big mic button
│   │   │   ├── contacts.tsx         ← Contact list + add contact
│   │   │   └── history.tsx          ← Transaction history
│   │   ├── _layout.tsx
│   │   └── +not-found.tsx
│   ├── components/
│   │   ├── MicButton.tsx            ← THE core component
│   │   ├── TransactionConfirm.tsx   ← "Send 5 USDC to Ahmad?" modal
│   │   ├── VoiceFeedback.tsx        ← animated voice waveform
│   │   ├── ContactCard.tsx
│   │   └── TxHistoryItem.tsx
│   ├── lib/
│   │   ├── elevenlabs.ts            ← STT + TTS wrappers
│   │   ├── intent.ts                ← parse voice → { recipient, amount }
│   │   ├── solana.ts                ← wallet + transfer helpers
│   │   ├── contacts.ts              ← Supabase contact helpers
│   │   └── supabase.ts              ← Supabase client
│   ├── constants/
│   │   └── config.ts                ← all env values, network config
│   ├── app.json
│   └── package.json
│
├── program/                         ← Anchor (Rust) — ContactRegistry
│   ├── programs/
│   │   └── contact-registry/
│   │       └── src/
│   │           └── lib.rs           ← register() + resolve() only
│   ├── tests/
│   │   └── contact-registry.ts
│   ├── Anchor.toml
│   └── Cargo.toml
│
└── .env.example                     ← NEVER commit .env
```

---

## The Core Flow (Read This Until You Can Recite It)

```
1. USER presses mic button
         ↓
2. ELEVENLABS STT transcribes speech → plain text
   "kirim 5 dolar ke Ahmad"
         ↓
3. INTENT PARSER (Claude API) extracts structured data
   { action: "send", amount: 5, currency: "USDC", recipient: "Ahmad" }
         ↓
4. CONTACT RESOLVER looks up "Ahmad"
   First: Supabase local contacts
   Then: ContactRegistry on-chain (Anchor program)
   Returns: { name: "Ahmad", wallet: "7xKp...mN3" }
         ↓
5. CONFIRMATION shown to user (visual + voice)
   "Kirim 5 USDC ke Ahmad (7xKp...mN3)? Ucapkan 'ya' untuk konfirmasi."
         ↓
6. USER says "ya" / taps confirm
         ↓
7. SOLANA TRANSACTION executes
   SPL Token transfer: 5 USDC → Ahmad's wallet
         ↓
8. ELEVENLABS TTS speaks result
   "Berhasil. Kamu mengirim 5 USDC ke Ahmad."
         ↓
9. SUPABASE logs transaction to history
```

---

## Hardcoded Rules — Never Break These

1. **Never commit `.env`** — only `.env.example` goes to git
2. **USDC has 6 decimals** — always use `new BN(amount * 1_000_000)`
3. **Always confirm before sending** — user must explicitly confirm (voice or tap)
4. **Never auto-send without confirmation** — even if voice says "ya" immediately
5. **Always show wallet address in confirm screen** — not just name
6. **ElevenLabs API key goes in `.env`** — never hardcode in source
7. **Prototype uses devnet only** — never use real USDC in prototype phase
8. **ContactRegistry Anchor program = read-only for now** — register via app only

---

## Environment Variables

```bash
# .env — NEVER commit this file

# Solana
EXPO_PUBLIC_SOLANA_NETWORK=devnet
EXPO_PUBLIC_SOLANA_RPC_URL=https://api.devnet.solana.com

# ElevenLabs
ELEVENLABS_API_KEY=your_key_here
EXPO_PUBLIC_ELEVENLABS_VOICE_ID=your_voice_id_here

# Supabase
EXPO_PUBLIC_SUPABASE_URL=your_project_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_anon_key

# Anchor Program (fill after deploy)
EXPO_PUBLIC_CONTACT_REGISTRY_PROGRAM_ID=FILL_AFTER_DEPLOY

# Claude API (for intent parsing)
ANTHROPIC_API_KEY=your_key_here
```

```bash
# .env.example — commit this

EXPO_PUBLIC_SOLANA_NETWORK=devnet
EXPO_PUBLIC_SOLANA_RPC_URL=https://api.devnet.solana.com
ELEVENLABS_API_KEY=YOUR_ELEVENLABS_KEY
EXPO_PUBLIC_ELEVENLABS_VOICE_ID=YOUR_VOICE_ID
EXPO_PUBLIC_SUPABASE_URL=YOUR_SUPABASE_URL
EXPO_PUBLIC_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
EXPO_PUBLIC_CONTACT_REGISTRY_PROGRAM_ID=FILL_AFTER_DEPLOY
ANTHROPIC_API_KEY=YOUR_ANTHROPIC_KEY
```

---

## Key APIs — Quick Reference

### ElevenLabs STT (Speech-to-Text)
```typescript
// POST https://api.elevenlabs.io/v1/speech-to-text
// Body: FormData with audio file
// Returns: { text: "kirim 5 dolar ke Ahmad" }

const formData = new FormData()
formData.append('file', audioBlob, 'recording.m4a')
formData.append('model_id', 'scribe_v1')

const response = await fetch('https://api.elevenlabs.io/v1/speech-to-text', {
  method: 'POST',
  headers: { 'xi-api-key': process.env.ELEVENLABS_API_KEY },
  body: formData,
})
const { text } = await response.json()
```

### ElevenLabs TTS (Text-to-Speech)
```typescript
// POST https://api.elevenlabs.io/v1/text-to-speech/{voice_id}
// Returns: audio/mpeg binary

const response = await fetch(
  `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`,
  {
    method: 'POST',
    headers: {
      'xi-api-key': process.env.ELEVENLABS_API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      text: "Berhasil. Kamu mengirim 5 USDC ke Ahmad.",
      model_id: 'eleven_multilingual_v2',
    }),
  }
)
const audioBuffer = await response.arrayBuffer()
// Play with expo-av
```

### Intent Parser (Claude API)
```typescript
// Always return JSON — no prose, no markdown
const systemPrompt = `
You are a payment intent parser for a voice payment app.
Extract payment intent from spoken Indonesian or English text.
Return ONLY valid JSON. No explanation. No markdown.

Output format:
{
  "action": "send" | "unknown",
  "amount": number | null,
  "currency": "USDC" | "SOL" | null,
  "recipient": string | null,
  "confidence": "high" | "low"
}

Examples:
Input: "kirim 5 dolar ke Ahmad"
Output: {"action":"send","amount":5,"currency":"USDC","recipient":"Ahmad","confidence":"high"}

Input: "transfer 10 USDC to Budi"
Output: {"action":"send","amount":10,"currency":"USDC","recipient":"Budi","confidence":"high"}

Input: "cuaca hari ini"
Output: {"action":"unknown","amount":null,"currency":null,"recipient":null,"confidence":"high"}
`
```

### Solana USDC Transfer
```typescript
import { 
  createTransferInstruction,
  getAssociatedTokenAddress,
  TOKEN_PROGRAM_ID 
} from '@solana/spl-token'
import { Connection, PublicKey, Transaction } from '@solana/web3.js'
import BN from 'bn.js'

// USDC mint addresses
const USDC_MINT_DEVNET  = new PublicKey('4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU')
const USDC_MINT_MAINNET = new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v')

const USDC_DECIMALS = 6  // always 6, never 18

// Amount: always multiply by 1_000_000
const rawAmount = new BN(5 * 1_000_000)  // 5 USDC
```

---

## Supabase Schema

```sql
-- Contacts table
create table contacts (
  id          uuid default gen_random_uuid() primary key,
  user_wallet text not null,          -- owner's wallet address
  name        text not null,          -- "Ahmad", "Budi", etc.
  wallet      text not null,          -- recipient's wallet address
  on_chain    boolean default false,  -- also registered on ContactRegistry?
  created_at  timestamp default now()
);

-- Unique: one name per user
create unique index on contacts (user_wallet, lower(name));

-- Transactions table
create table transactions (
  id              uuid default gen_random_uuid() primary key,
  user_wallet     text not null,
  recipient_name  text,
  recipient_wallet text not null,
  amount_usdc     numeric(12,6) not null,
  tx_signature    text not null,
  status          text default 'confirmed',  -- confirmed | failed
  created_at      timestamp default now()
);
```

---

## Anchor Program — ContactRegistry (Minimal Spec)

```rust
// Only two instructions needed:

// 1. register_contact(name: String, wallet: Pubkey)
//    PDA seeds: ["contact", user_pubkey, name_bytes]
//    Stores: name + wallet address

// 2. resolve_contact(name: String) → Pubkey
//    Read-only: returns wallet for given name

// That's it. No update. No delete. Keep it small.
// Deploy to devnet first. Test thoroughly before hackathon.
```

---

## Common Commands

```bash
# Mobile
cd mobile
npx expo start                  # start dev server
npx expo start --tunnel         # if local network issues
npx expo build                  # production build

# Anchor Program
cd program
anchor build                    # compile
anchor test                     # run tests
anchor deploy --provider.cluster devnet   # deploy to devnet

# Get devnet SOL (for gas)
solana airdrop 2 YOUR_WALLET_ADDRESS --url devnet

# Check wallet balance
solana balance YOUR_WALLET_ADDRESS --url devnet
```

---

## Demo Script (Memorize This for Hackathon)

```
Setup:
  - Two phones visible: sender (you) + recipient (Ahmad's wallet shown on screen)
  - App open on Home screen
  - Wallet connected, 20 USDC on devnet

Demo flow:
  1. "Ini Bicara — kirim USDC cukup dengan bicara."
  2. Tap mic button
  3. Say: "Kirim 5 dolar ke Ahmad"
  4. App shows: "5 USDC → Ahmad (7xKp...mN3)? Konfirmasi?"
  5. Say: "Ya"
  6. App speaks: "Berhasil. Kamu mengirim 5 USDC ke Ahmad."
  7. Show recipient phone: balance +5 USDC
  8. Show Solana Explorer: live transaction

Total time: ~45 seconds
```

---

## Prototype Build Checklist

```
Phase 1 — Environment
[ ] Expo project running on physical device
[ ] Solana wallet connected via Wallet Adapter
[ ] Devnet SOL received from faucet
[ ] Supabase project created + schema applied
[ ] ElevenLabs API key working (test via curl)

Phase 2 — Voice Layer
[ ] Record audio on device → send to ElevenLabs STT → get text
[ ] Send text to Claude API → get structured JSON intent
[ ] Handle "unknown" intent gracefully (not a payment command)

Phase 3 — Transaction Layer
[ ] Resolve contact name → wallet address (from Supabase)
[ ] Execute USDC transfer on devnet
[ ] Show transaction on Solana Explorer

Phase 4 — Full Loop
[ ] Voice → STT → Intent → Resolve → Confirm → Transfer → TTS
[ ] Error states handled (contact not found, insufficient balance)
[ ] Transaction logged to Supabase

Phase 5 — Anchor (if Phases 1–4 complete)
[ ] ContactRegistry program compiles
[ ] register_contact() works on devnet
[ ] resolve_contact() returns correct wallet
[ ] Mobile app can call program via @coral-xyz/anchor
```

---

## If Something Breaks During Demo

```
Problem: Mic not working
Fix: Have pre-recorded audio file as fallback
     Play it → app processes it as if live

Problem: ElevenLabs API slow/down
Fix: Show text transcription on screen while audio processes
     "I heard: kirim 5 dolar ke Ahmad"

Problem: Solana RPC timeout
Fix: Switch to backup RPC (Helius or QuickNode free tier)
     Keep backup RPC URL ready in config.ts

Problem: Wallet not connecting
Fix: Have a demo wallet with pre-loaded USDC
     Connect via private key directly (devnet only, never mainnet)
```
