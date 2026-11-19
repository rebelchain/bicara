# PROJECT.md — Bicara

## One-liner
> Send USDC on Solana by speaking — no addresses, no UI complexity, just talk.

## The Problem
Crypto payments require copying 44-character wallet addresses.
For 1.4 billion people with low digital literacy — market vendors, gig workers,
informal traders — this is the wall that keeps them out of crypto.

## The Solution
Bicara ("speak" in Indonesian) replaces the address bar with your voice.

```
"Kirim 5 dolar ke Ahmad"  →  5 USDC sent to Ahmad's wallet
```

That's it. No addresses. No forms. No confusion.

## How It Works
```
1. Hold the mic button. Say who and how much.
2. ElevenLabs transcribes your voice.
3. AI extracts: recipient + amount.
4. App resolves contact name → wallet address.
5. You confirm once.
6. USDC sent on Solana.
7. App speaks back: "Done."
```

## Why Solana
Fast (< 2s), cheap (< $0.001/tx), mobile-native (Seeker Phone).
No other chain makes this UX possible at this cost.

## Sponsor Integration
```
ElevenLabs    → voice input (STT) + voice output (TTS)
Solana Mobile → Seeker Phone SDK, mobile wallet integration
Supabase      → contact address book + transaction history
Solana        → USDC settlement, on-chain ContactRegistry
```

## Who Uses This
Informal traders in Indonesia, Nigeria, Kenya — anywhere
people transact in cash today and want something better than pinjol or M-Pesa fees.

## Prizes Targeted
- Best App Overall on Solana ($10,000)
- Best Mobile App on Solana Mobile (Seeker Phones)

## Tech Stack
React Native + Expo · Solana Mobile Wallet Adapter
ElevenLabs STT/TTS · Claude API (intent parsing)
Anchor/Rust (ContactRegistry) · Supabase · SPL Token

## Hackathon
Dev3pack Global Hackathon · Nov 27–29, 2026
Built by: Azhar (solo, Indonesia)
