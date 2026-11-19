# PROJECT.md — Bicara

## One-Liner
> The first fully eyes-free USDC payment app on Solana Mobile — built for blind users and everyday traders so anyone can navigate, verify, and pay purely by voice.

## The Problem
Every crypto wallet assumes perfect eyesight and high digital literacy: copying 44-character Base58 addresses, visually verifying signing popups, and tapping cluttered DeFi navigation bars.
- **285 million visually impaired (blind / low-vision) people** worldwide are effectively locked out of self-custodial crypto.
- **1.4 billion informal traders and low-literacy mobile users** across Indonesia, Southeast Asia, and Africa face the exact same visual address wall.

## The Solution
**Bicara** ("speak" in Bahasa Indonesia) turns Solana Mobile into a **zero-vision, voice-native USDC wallet**:
- **Zero Silent Screens**: Voice-guided onboarding, spoken navbar narration, balance readouts, and contact/history summaries via ElevenLabs `eleven_flash_v2_5` (~100ms).
- **Tap-Anywhere Eyes-Free UX**: Full-screen touch canvas + 4 distinct haptic pulse patterns + Screen Curtain privacy mode.
- **Two-Factor Voiceprint + Seed Vault Security**: On-device Voiceprint (`@picovoice/eagle-react-native`) verifies User A is the wallet owner before exposing balances or transfers; Solana Mobile MWA / Seeker Seed Vault signs the `TransferChecked` USDC transaction with hardware biometrics (blocking voice replay attacks).

```
[Screen Curtain ON — Layar Gelap]
User taps anywhere: "Kirim 5 dolar ke Ahmad"
        ↓ (Voiceprint 94% User A → scribe_v2 → Confirm "Ya" → MWA Seed Vault)
"Berhasil. Kamu mengirim 5 USDC ke Ahmad."  (< 7 seconds)
```

## Sponsor Integration Highlights
- **Solana Mobile**: Native MWA 2.0 + Seed Vault biometric Factor 2, custom Android Dev Client engineered for Seeker.
- **ElevenLabs**: Full accessibility audio loop combining `scribe_v2` (dynamic `keyterm_prompt`) and `eleven_flash_v2_5` (~100ms spoken UI narration & receipts).
- **Solana & Anchor**: Safe 6-decimal `TransferChecked` USDC transfers + owner-protected `ContactRegistry` PDA address book.
- **Supabase**: Low-latency contact book + voice-audited transaction history.

## Target Prizes
- **Best App Overall on Solana** ($10,000)
- **Best Mobile App on Solana Mobile** (Seeker Phones)

## Production Roadmap (Post-Hackathon — Ultra-Lean 3 Items)
Everything core (MWA Track A, Eyes-Free Full-Voice Navigation, Spoken Onboarding, real physical `expo-haptics`, ElevenLabs `scribe_v2` + `eleven_flash_v2_5`, Picovoice Eagle Voiceprint, Supabase Contacts, and Anchor `ContactRegistry` PDA on Devnet) is built for the hackathon demo. Only 3 production hardening items remain post-hackathon:
1. **Mainnet-Beta Security Audit & Real USDC Launch** — independent audit of `ContactRegistry` PDA and proxy rate-limiting.
2. **Solana Seeker dApp Store & Hardware Seed Vault Attestation** — signed store release targeting Seeker devices.
3. **Offline On-Device STT, Wake-Word ("Halo Bicara") & Regional Dialects** — Java/Sunda accent support for low-connectivity areas.

## Hackathon
**Dev3pack Global Hackathon** · November 27–29, 2026
Built by **Azhar** (Solo Builder, Indonesia)
