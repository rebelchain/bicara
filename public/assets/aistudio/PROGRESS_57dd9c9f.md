# PROGRESS.md — Bicara Build Tracker

> UPDATE THIS FILE at the end of every session.
> Claude Code reads this at the start of each session to know where we left off.
> Be specific — "working" is useless, "STT returns text on physical device" is useful.

---

## Current Phase
**PROTOTYPE** (Goal: understand all connections before hackathon)

---

## Last Session
```
Date:        [fill after each session]
What worked: [fill]
What broke:  [fill]
Stopped at:  [fill — exact point, e.g. "STT returns text but audio recording crashes on iOS"]
Next step:   [fill — the FIRST thing to do next session]
```

---

## Build Checklist

### Environment Setup
- [ ] Expo project created and runs on physical device
- [ ] Solana Mobile Wallet Adapter installed
      ⚠️ Check docs.solanamobile.com for latest version + install steps
- [ ] Wallet connects on device (not just simulator)
- [ ] Devnet SOL received from faucet
- [ ] ElevenLabs API key working (tested via curl or Postman)
- [ ] Supabase project created
- [ ] Supabase schema applied (contacts + transactions tables)
- [ ] .env file set up (never committed)
- [ ] All packages resolve without errors

### Voice Layer
- [ ] Audio recording works on physical device (hold → release)
- [ ] Audio file saved to device storage
- [ ] STT call returns transcript text
- [ ] Transcript displays on screen
- [ ] Intent parser returns valid JSON for "kirim 5 dolar ke Ahmad"
- [ ] Intent parser handles "unknown" action gracefully
- [ ] TTS plays audio on device speaker
- [ ] Full voice loop: speak → text → JSON → spoken response

### Transaction Layer
- [ ] Read USDC balance from connected wallet
- [ ] Resolve contact name from Supabase → wallet address
- [ ] Build USDC transfer transaction
- [ ] User signs transaction via Wallet Adapter
- [ ] Transaction broadcasts to devnet
- [ ] Transaction confirmed and signature received
- [ ] Transaction logged to Supabase

### Full E2E Flow
- [ ] Speak → STT → Intent → Resolve → Confirm screen appears
- [ ] User confirms → USDC sent → TTS success
- [ ] Error: contact not found → TTS error message
- [ ] Error: insufficient balance → TTS error message
- [ ] Error: network issue → graceful fallback

### UI
- [ ] Home screen with MicButton (layout)
- [ ] MicButton records (hold) and releases
- [ ] Recording animation (waveform)
- [ ] TransactionConfirm modal
- [ ] Success animation
- [ ] Contacts screen (view + add)
- [ ] History screen (list of past txs)
- [ ] Wallet button (connect/disconnect + balance)

### Anchor Program (do LAST)
- [ ] Anchor CLI installed
- [ ] Program compiles (anchor build)
- [ ] Tests pass (anchor test)
- [ ] Deployed to devnet
- [ ] Program ID updated in CLAUDE.md and config.ts
- [ ] Mobile app can register a contact on-chain
- [ ] Mobile app can resolve a contact from on-chain

---

## Known Issues & Blockers

```
[Date] - [Issue] - [Status: open/resolved]

Example:
2026-11-19 - expo-av crashes on Android when recording > 10s - OPEN
2026-11-20 - ElevenLabs STT returns empty string for Indonesian - RESOLVED (switched to scribe_v1_turbo)
```

---

## SDK Versions Confirmed Working

```
Fill this in as you verify each package works:

expo:                      [fill]
expo-av OR expo-audio:     [fill]
@solana/web3.js:           [fill]
@solana-mobile/...:        [fill — full package name]
@solana/spl-token:         [fill]
@coral-xyz/anchor:         [fill]
@supabase/supabase-js:     [fill]
elevenlabs (npm package):  [fill — or "using fetch directly"]
```

---

## Decisions Made

```
[Date] - [Decision] - [Reason]

Example:
2026-11-19 - Using fetch() for ElevenLabs instead of SDK - SDK had peer dep conflict with Expo
2026-11-20 - Supabase as primary contact store, on-chain as fallback - RPC latency too high for primary
```

---

## Prototype → Hackathon Handoff Notes

```
Fill this in by Nov 26 (day before hackathon):

Things that WORK and can be copy-pasted:
  → [fill]

Things that NEED to be rewritten from scratch:
  → [fill]

Biggest time sinks to avoid:
  → [fill]

Demo script rehearsed: [ ]
Backup video recorded: [ ]
Devnet wallet funded:  [ ]
```

---

## Hackathon Daily Log

### Day 1 — Nov 27
```
Goal: Full voice → USDC transfer working on devnet
Done: [fill]
Blocked: [fill]
```

### Day 2 — Nov 28
```
Goal: Polish + ContactRegistry on devnet
Done: [fill]
Blocked: [fill]
```

### Day 3 — Nov 29
```
Goal: Final polish + submit
Submit by: 23:59 UTC (check exact deadline)
Submitted: [ ]
```
