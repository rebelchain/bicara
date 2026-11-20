# PROJECT.md — Bicara

## One-Liner
> Before you sign anything on Solana, Bicara reads exactly what the transaction will do — built blind-first so if it works with zero screen, it works for everyone.

*(Fun fact: the name **Bicara** means "speak" in Bahasa Indonesia.)*

---

## The Problem

Self-custodial crypto wallets force users to approve opaque transactions they cannot meaningfully inspect before signing. Every day, sighted and non-sighted users alike face blind signing — comparing 44-character Base58 addresses, deciphering raw token approvals, and guessing what a DEX swap or smart-contract prompt will actually do. According to Chainalysis, approval phishing alone cost crypto users **$516.8 million in 2022** because wallets hide real transaction outcomes behind unreadable signing popups.

Blind and low-vision users are the most extreme case of this exact same failure — and therefore the strongest proof case. If a transaction verification layer works reliably with zero screen, it eliminates blind signing for everyone. Specifically, two core moments break completely when visual inspection is unavailable or untrustworthy:
1. **Address verification**: A user cannot visually compare a 44-character Base58 public key to be sure funds are going to the right person.
2. **Transaction comprehension before signing**: A user cannot read a wallet's signing popup — or a DEX swap breakdown (input/output tokens, price impact, slippage, fees, new token account rent, unknown mints) — to understand what a transaction will actually do before approving it.

### Evidence Base
- **Universal blind-signing loss (Chainalysis)**: Approval phishing — where users sign deceptive wallet prompts without understanding the real permissions granted — stole **$516.8 million** across crypto in 2022 alone.
  - Source: [Chainalysis — 2023 Crypto Crime Report (Approval Phishing)](https://www.chainalysis.com/blog/2023-crypto-crime-report-introduction/)
- **Global scale of vision impairment (WHO)**: Globally, **at least 2.2 billion people** have a near or distance vision impairment; in **at least 1 billion** of these cases, vision impairment could have been prevented or has yet to be addressed.
  - Source: [World Health Organization — Blindness and Vision Impairment Fact Sheet](https://www.who.int/news-room/fact-sheets/detail/blindness-and-visual-impairment)
- **Empirical wallet accessibility study**: Academic evaluation of MetaMask with blind and visually impaired users documents severe navigation barriers, inaccessible transaction confirmation flows, and inability to verify addresses and signing details independently.
  - Source: [Zhou et al., SOUPS 2023 — Accessibility of Crypto Wallets for Blind Users (MetaMask Study)](https://www.usenix.org/system/files/soups2023-zhou.pdf)
- **Why voice alone cannot secure funds**:
  - Replay attacks are a well-documented vulnerability against automatic speaker verification systems: [Kinnunen et al. (arXiv:1706.02101)](https://arxiv.org/pdf/1706.02101)
  - Replayed and re-recorded audio can also degrade or defeat modern audio deepfake detectors: [Replay Attacks Against Audio Deepfake Detectors (arXiv:2505.14862)](https://arxiv.org/pdf/2505.14862)
  - ElevenLabs' own AI Speech Classifier only detects ElevenLabs-generated audio (99% precision, 80% recall on unmodified audio) and is not a general-purpose liveness gate: [ElevenLabs AI Speech Classifier Docs](https://elevenlabs.io/docs/product-guides/audio-tools/ai-speech-classifier)

### User Validation Status (Honest Accounting)
- **Current real blind-user validation**: **ZERO** (0 sessions completed as of 20 Nov 2026).
- **TODO (Before 27 Nov 2026)**: Run hands-on testing with **2–3 real TalkBack or VoiceOver users**, test the spoken `TxSummary` clarity and wallet popup handoff, and record direct user quotes here before hackathon kickoff.

---

## The Solution

Bicara separates the reusable accessibility layer (**`accessible-signing`**) from the Android mobile reference app:
- **Verified Address Book**: Saved contact names resolve to owner-verified Solana addresses (Supabase fast lookup + on-chain Anchor `ContactRegistry` PDA in Gate C). Adding or editing any contact requires physical hardware biometric approval — never voice alone.
- **Spoken Transaction Narration (`TxSummary`)**: Before authorization, ElevenLabs `eleven_flash_v2_5` speaks **what the transaction will actually do** — computing network fees, new ATA rent costs, swap price impact, and slippage at runtime (never hardcoded).
- **Two Distinct Actions Proving the Layer**:
  1. **Send (Devnet USDC `TransferChecked`)**: Core payment flow with verified contact resolution and full spoken `TxSummary`.
  2. **Verified Swap (`USDC ↔ SOL`, Quote-Only via live Jupiter Swap API V2)**: Proves the exact same `accessible-signing` narration and risk-policy pipeline handles complex DEX quotes (direction, rate, price impact, max slippage, pre-sign quote drift check, verified token allowlist blocking unknown/scam mints) with zero real money spent.
  3. **Read-Only Price & Portfolio Readouts**: Fast spoken balance and token conversion checks (e.g., checking USDC/SOL needed for network fees) with zero signing friction.
- **Honest Five-Layer Security ("Voice Identifies, Hardware Authorizes")**: Optional on-device voiceprint (convenience/privacy only) → runtime random spoken challenge → risk policy & verified token allowlist → full spoken `TxSummary` confirmation → **MWA hardware-backed biometric signing** (Phantom/Solflare on any Android phone; Seed Vault on Solana Seeker).

```
Any Action (Send [Devnet] | Verified Swap [Quote-Only] | Price Readout)
        ↓
Build Transaction / Live Quote
        ↓
TxSummary (action, tokens, amount, recipient/route, runtime fee/rent, anomalies)
        ↓
ElevenLabs Spoken Narration: "what this transaction will actually do"
        ↓
Risk Policy + Verified Token Allowlist + Random Challenge → Explicit "Yes"
        ↓
Hardware-Backed Biometric Signing via MWA (Real Security Boundary)
```

---

## Prior Art & Honest Differentiation

| Project | What It Does | Gap Bicara Addresses |
|---------|--------------|----------------------|
| **WhisperPay** | Browser-based voice Solana Devnet wallet prototype | Visual browser wallet; not blind-first mobile, no spoken `TxSummary` transaction decoding, no layered hardware-biometric threat model. |
| **Orova / HeySolana** | Voice-controlled Solana assistant PWA supporting send, receive, and swap | Voice send/swap already exists here — **voice swap alone is NOT Bicara's differentiator**. Bicara differentiates on blind-first eyes-free UX, spoken `TxSummary` decoding (fees, ATA rent, anomalies, verified token blocks), on-chain verified address book, and honest hardware-authorized security. |
| **Wallety** | Accessible Bitcoin wallet exploring screen-reader usability | Bitcoin-focused; does not provide a Solana MWA `accessible-signing` layer with spoken DEX/token transaction decoding and red-team voice threat modeling. |
| **coinables/Voice-Wallet** | Early Bitcoin voice wallet concept | Proof-of-concept; lacks modern mobile hardware biometric signing, dynamic STT keyterms, and spoken transaction narration. |

> **Honesty Note**: This prior-art review is not exhaustive.
> **TODO**: Run **Colosseum Copilot** prior-art checks and review the **May 2026 Dev3pack hackathon submissions** before kickoff to verify no recent Solana accessibility layer was missed.

---

## Sponsor Integration Highlights

### ElevenLabs (Deep Accessibility & Red-Team Showcase)
1. **`scribe_v2` with Dynamic `keyterms`**: Built at runtime from saved contact names, verified token names (`USDC`, `SOL`, `Solana`), and English navigation/swap commands (refreshed whenever contacts change; batch limit: up to 1,000 keyterms, 50 chars / 5 words max per term).
2. **`eleven_flash_v2_5` Low-Latency Narration**: Powers Zero-Silent-Screen onboarding, spoken navigation, balance/price readouts, and full `TxSummary` transaction explanations.
3. **Spoken Transaction Narration**: Goes far beyond reading "5 USDC to Ahmad" — narrates stablecoin context on first use, saved vs. new recipient status, last 4 address chars, runtime RPC fees, ATA creation rent, swap price impact/slippage, and anomaly warnings.
4. **Honest Red-Team Demo (`docs/RED_TEAM_DEMO.md`)**: Uses ElevenLabs to clone **only the builder's own voice** and play adversarial commands (*"send 5 USDC to Ahmad"*, *"swap all my USDC to an unknown token"*) directly to the phone — demonstrating honestly that while cloned audio may open a voiceprint gate, verified token allowlists and physical hardware biometrics still protect funds.

### Solana & Solana Mobile
- **Solana Mobile Wallet Adapter (MWA 2.0)** via Track A (`@solana/kit@^8.6.0` + `@wallet-ui/react-native-kit@^4.4.1`): Works on any Android phone via Phantom or Solflare using the wallet's own hardware-backed biometric (and Seed Vault when running on Seeker).
- **SPL Token `TransferChecked`** (`@solana-program/token@^0.18.0`): Strict 6-decimal `BigInt` transfers on `solana:devnet`.
- **Anchor `ContactRegistry` PDA** (Gate C): Owner-authorized on-chain verified address book.
- **Jupiter Swap API V2** (`https://api.jup.ag/swap/v2`, Quote-Only): Real market routing, price impact, and slippage narration for verified `USDC ↔ SOL` swaps with zero real funds at risk.

---

## Target Tracks & Hackathon Info

- **Event**: [Dev3pack Global Hackathon](https://hack.dev3pack.xyz/) — university student hackathon, open source mandatory, Solana required, **27–29 November 2026** (submission Sunday 29 Nov).
- **License**: **MIT License**
- **Primary Target**: **Best App Overall on Solana**
- **Sponsor Target**: **ElevenLabs Sponsor Track** *(assumed to exist; **UNVERIFIED** until officially announced)*
- **Optional Track**: **Seeker / Best Mobile App** *(hardware-agnostic Android MWA first; Seed Vault claimed strictly on Seeker)*
- **Builder**: Azhar (Solo Builder)

---

## Post-Hackathon Production Roadmap

Everything in the gated Nov 20–29 plan (MWA Track A, Eyes-Free English navigation, Spoken Onboarding, physical `expo-haptics`, `scribe_v2` dynamic `keyterms`, `eleven_flash_v2_5` `TxSummary` narration, Quote-Only verified `USDC ↔ SOL` swap + price readout, five-layer security model + red-team demo, `accessible-signing` module extraction, and Gate C Anchor `ContactRegistry` PDA) is scoped for the hackathon. Post-hackathon production items:

1. **Mainnet-Beta Security Audit & Real Execution**: Independent audit of `ContactRegistry` PDA, server proxy hardening, and migrating verified swaps from Quote-Only to mainnet Jupiter Swap API V2 (`/order` → MWA `signTransactions` → `/execute`).
2. **Additional Languages via Locale Dictionary**: Add non-English locale packs on top of the shipped English dictionary architecture.
3. **Limit/Trigger Orders & Universal dApp Transaction Narrator**: Expand `accessible-signing` to Jupiter Trigger Order API V2 and arbitrary Solana dApp transaction decoding, plus Solana Seeker dApp Store publishing with hardware Seed Vault attestation.
