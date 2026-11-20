# PROGRESS.md — Bicara Build & Gate Tracker

> UPDATE THIS FILE at the end of every session.
> Be specific — "working" is useless; "MWA authorized on Android 16 via Phantom Devnet; eleven_flash_v2_5 measured at 210ms on-device" is useful.
> Never mark unfinished items as done. Any failed gate triggers an explicit recorded fallback decision here — never silent scope drift.

---

## Current Phase

**PROTOTYPE — GATE A (Physical Android USB Validation)**
- **Today**: Friday 20 November 2026
- **Hackathon Kickoff**: Friday 27 November 2026 (tag `hackathon-start`)
- **Submission Deadline**: Sunday 29 November 2026

---

## Last Session

```
Date:        2026-11-20
What worked: Completed Narrative Reframe (Part 1) + full Code-Sync Backlog (Part 2A–2E),
             building on the verified Gate A.1 physical Android 16 PASS on OPPO CPH2631:
             - Part 1 (Docs): Reframed PROJECT.md and CLAUDE.md around universal anti-blind-signing
               verification (Chainalysis 2022 $516.8M approval phishing citation), positioning
               blind/low-vision users as the extreme proof case while preserving all existing
               evidence and validation accounting.
             - Part 2A (/app/api/stt): Switched default language_code to 'eng' and enforced
               verified scribe_v2 batch limits (up to 1,000 keyterms, <= 50 chars, <= 5 words).
             - Part 2B (/app/api/intent + /lib/bicara-engine.ts): Synced to English-first NLU,
               added swap_quote & check_price actions, removed hardcoded "94%" voiceprint score,
               and added TxSummary interface & skeleton formatter.
             - Part 2C (New Server Routes + .env.example): Added Quote-Only /api/swap/quote
               (verified Jupiter /swap/v2/order without taker + strict USDC<->SOL allowlist
               blocking unknown tokens with HTTP 403) and /api/prices (Jupiter Price V3 primary
               with CoinGecko fallback returning { solUsd, usdcUsd: 1.00 }), plus JUPITER_API_KEY
               placeholder in .env.example.
             - Part 2D (/mobile): Created mobile/src/i18n/en.ts (EN_VOICE_SCRIPTS verbatim from
               VOICE_SPEC.md) and migrated all mobile screens, speech (en-US), STT client (eng),
               and recorder error copy to English (JS-only; no APK rebuild needed).
             - Part 2E (Web Workbench): Synced Prototype, Architecture, Build Kit, and Sprint tab
               headings to the global English accessible-signing narrative.
Stopped at:  All 5 Code-Sync Backlog items completed and verified; Gate A.1 hardware checks
             (APK boot, /api/health via adb reverse, MWA Solflare Devnet, haptics, repeated
             spoken tabs) already PASS on OPPO CPH2631 Android 16.
Next step:   Run Gate A.2 on Azhar's physical OPPO CPH2631 Android 16 phone over USB:
             1) git pull and reload Metro (`r`) to verify English mobile TTS/copy on-device.
             2) Measure and log remaining Gate A rows: Picovoice Eagle genuine vs. impostor
                scores, scribe_v2 English + dynamic keyterms accuracy, eleven_flash_v2_5
                on-device TTS latency (ms), and live Jupiter Swap V2 Quote-Only (/api/swap/quote)
                plus /api/prices.
```

---

## Gated Schedule (Fri 20 Nov → Sun 29 Nov 2026)

| Gate / Window | Dates | Mandatory Exit Criteria (All Gate A Measurements Logged With Real Numbers) | Fallback Rule If Failed |
|---------------|-------|----------------------------------------------------------------------------|-------------------------|
| **Gate A** | **20–22 Nov** | Physical Android phone over USB:<br>1. Dev build boots; `/api/health` returns OK on phone (`adb reverse`).<br>2. MWA authorizes on `solana:devnet` with Phantom or Solflare.<br>3. Test whether wallet approval screen works eyes-free (TalkBack / biometric-only) and record Screen Curtain demo implication.<br>4. Eagle enroll & verify: log real genuine vs. impostor scores and set threshold from data.<br>5. `scribe_v2` English test with dynamic `keyterms`: log recognition accuracy.<br>6. `eleven_flash_v2_5` latency measured on-device (ms).<br>7. Verify live Jupiter Swap V2 Quote-Only (`USDC ↔ SOL`) response via server proxy. | Record exact failure & fallback here. If Eagle fails build/accuracy, drop Layer 1 (voiceprint is optional). If wallet popup is not eyes-free, scope Screen Curtain to Bicara screens and disclose honestly. |
| **Gate B** | **23–24 Nov** | End-to-end on physical phone: `voice → intent → confirm → TransferChecked on solana:devnet → spoken receipt`, PLUS Quote-Only verified `USDC ↔ SOL` swap narration and read-only price/portfolio readout. | Freeze Gate C (`ContactRegistry` PDA) and ship verified Supabase address book + biometric-gated contact edits so core loop + Quote-Only swap are 100% rock solid. |
| **Gate C** | **25 Nov** *(only if B passed)* | Anchor `ContactRegistry` PDA compiled, tested, deployed to Devnet, and dual-writing with Supabase (after resolving non-ASCII seed decision). | Skip on-chain PDA for demo; keep verified Supabase address book + document Gate C deferral honestly. |
| **Rehearsal** | **26 Nov** | Full physical-device rehearsal (`scrcpy` mirror), time the full demo (replace `TBD`), and record clean backup demo video. | Fix timing or UX rough edges before kickoff tag. |
| **Hackathon Window** | **27–29 Nov** *(post `hackathon-start` tag)* | Build & commit visibly in git history: Layer 2 random spoken challenge, Layer 3 risk policy + verified token allowlist enforcement, Layer 4 full `TxSummary` + pre-sign swap re-quote drift check, ElevenLabs self-voice red-team demo + measurement log, extraction of reusable `accessible-signing` module, and final MIT README disclosure. Submit Sunday 29 Nov. | Prioritize core Layer 3/4/5 + red-team + `accessible-signing` extraction over cosmetic extras. |

---

## Gate A Hardware Measurement Log (Fill With Real Numbers)

| Check | Status | Measured Value / Notes |
|-------|--------|------------------------|
| Dev build boots on Android 16 USB (`mobile/polyfill.js` clean) | `[x] PASS` | OPPO CPH2631 (Android 16) booted cleanly with zero crypto/polyfill crash (`quick-base64@2.2.2`, `quick-crypto@1.1.2`, `nitro@0.35.0`, `expo-asset`); `expo-audio` `.m4a` capture + 5 physical `expo-haptics` patterns + repeated Spoken Bottom Tabs (`await Speech.stop()` fix) all verified on hardware. |
| `/api/health` returns `200 OK` on phone via `adb reverse` | `[x] PASS` | Green `Connected` verified on OPPO CPH2631 over USB (`adb reverse tcp:3000 tcp:3000` -> root Next.js `npm run dev`). |
| MWA authorize on `solana:devnet` (Phantom / Solflare) | `[x] PASS` | Tapping Connect MWA launched Solflare on Android 16; approving returned and displayed truncated wallet address in top-right button. |
| Wallet approval screen eyes-free test (TalkBack / biometric-only) | `[x] MEASURED` | **Key finding**: Solflare approval screen showed no fingerprint/biometric prompt on connect and required looking at the screen to tap Approve. **Demo implication**: Scope Screen Curtain to Bicara's own screens and disclose external wallet popup accessibility limits honestly to judges. |
| Picovoice Eagle genuine vs. impostor scores & chosen threshold | `[ ] Pending` | — |
| `scribe_v2` English + dynamic `keyterms` accuracy | `[ ] Pending` | — |
| `eleven_flash_v2_5` on-device TTS latency (ms) | `[ ] Pending` | — |
| Jupiter Swap API V2 Quote-Only (`USDC ↔ SOL`) server proxy test | `[x] PASS` | Live `/api/swap/quote` via Jupiter `/swap/v2/order` (no `taker`): `10 USDC -> 0.144895 SOL` (`router: "metis"`, `transaction: null`, `feeBps: 2`, `322ms`); unverified token `XYZ` blocked with `HTTP 403`. |

---

## Code-Sync Completed (2026-11-20)

All 5 post-pivot code-sync backlog items are now synced to the global English narrative and `accessible-signing` architecture:
- [x] **2A (`/app/api/stt/route.ts`)**: Switched default `language_code` to `'eng'` and enforced verified ElevenLabs `scribe_v2` batch keyterm constraints (up to 1,000 deduplicated terms, max 50 chars and max 5 words each).
- [x] **2B (`/app/api/intent/route.ts` + `/lib/bicara-engine.ts`)**: Switched NLU prompts & fallback engine to English-first, added `swap_quote` and `check_price` actions, removed hardcoded `"94%"` voiceprint score logic, and added `TxSummary` interface & skeleton formatter.
- [x] **2C (`/app/api/swap/quote/route.ts` + `/app/api/prices/route.ts` + `/.env.example`)**: Added Quote-Only Jupiter Swap V2 route (`GET https://api.jup.ag/swap/v2/order` without `taker`, server-only `JUPITER_API_KEY`, strict `USDC ↔ SOL` allowlist returning `HTTP 403` for unverified tokens), SOL/USD price route (Jupiter Price V3 primary + CoinGecko fallback returning `{ solUsd, usdcUsd: 1.00 }`), and `JUPITER_API_KEY` placeholder in `/.env.example`.
- [x] **2D (`/mobile/src/i18n/en.ts` + `/mobile` screens/services)**: Added typed `EN_VOICE_SCRIPTS` dictionary verbatim from `VOICE_SPEC.md` and replaced hardcoded Indonesian mobile UI/speech/STT strings with English (`en-US` TTS, `'eng'` STT).
- [x] **2E (Web Workbench Tabs)**: Updated heading copy across `Prototype`, `Architecture`, `Build Kit`, and `Sprint` tabs (and removed `"94%"` display labels) to match the pivoted global English `accessible-signing` narrative.

---

## PIVOT LOG (20 Nov 2026)

| ID | Decision | Rationale |
|----|----------|-----------|
| **D1** | Global English audience everywhere; locale dictionary; remove Indonesia framing & unsourced 1.4B / outdated 285M claims; cite WHO 2.2B fact sheet | Aligns Bicara with a global Dev3pack judging audience and verified public health evidence. |
| **D2** | Reposition as a reusable accessibility layer (`accessible-signing`) consumed by the mobile reference app | Strengthens Best App Overall positioning beyond a single-purpose wallet app. |
| **D3** | Full spoken transaction narration (`TxSummary`) with runtime RPC fee, ATA rent, first-use USDC note, and anomaly flags | Solves blind-signing comprehension — speaking *what the transaction actually does*, not just amount and name. |
| **D4** | Dynamic `keyterms` for `scribe_v2` refreshed when contacts change (verified batch limit: 1,000 terms, 50 chars, 5 words) | Improves recognition of saved contact names, token symbols, and navigation/swap phrases. |
| **D5** | Honest ElevenLabs self-voice red-team demo (`docs/RED_TEAM_DEMO.md`); builder's own voice only | Turns ElevenLabs integration into an unforgettable, truthful security demonstration instead of hype. |
| **D6** | Target Best App Overall + assumed ElevenLabs track; hardware-agnostic Android MWA; claim Seed Vault only on Seeker | Prevents hardware lock-in and avoids inaccurate claims on standard Android phones. |
| **D7** | Gated schedule (Gates A, B, C) with measured numbers and explicit fallbacks | Prevents silent scope drift and forces early hardware de-risking. |
| **D8** | Compliance-driven split + MIT License + `hackathon-start` tag + transparent README disclosure | Keeps repository audit-ready and reconciles pre-kickoff prototyping with hackathon rules honestly. |
| **D9** | Anchor `ContactRegistry` reframed as verified address book, built only in Gate C after Gate B passes | Ties smart-contract scope directly to blind address verification without blocking core loop delivery. |
| **SEC** | Replace "Voiceprint 2FA blocks clones" with 5-layer **"Voice Identifies, Hardware Authorizes"** (`docs/SECURITY_MODEL.md`); Eagle optional; biometric required for contact edits; no hardcoded `"94%"` | Grounded in peer-reviewed replay/deepfake evidence; technically defensible under judge scrutiny. |
| **SWAP** | Add second action: Verified-Token Swap (`USDC ↔ SOL`, **Quote-Only** via Jupiter Swap API V2) + Price/Portfolio readout (prototyped pre-kickoff; zero real money; preserves Rule 10 Devnet-only execution) | Proves `accessible-signing` is a genuine multi-action accessibility layer (and tests harder DEX narration + scam-token blocking) with zero mainnet money risk. |
| **LIC** | Lock open-source license to **MIT License**; keep demo total duration marked **`TBD`** until timed | Resolves license ambiguity while avoiding invented demo timings before physical rehearsal. |

---

## Open Questions (Action Items for Human)

1. **Pre-Existing Code Rule (`UNVERIFIED`)**: Confirm with Dev3pack organizers whether transparent README disclosure + `hackathon-start` tag satisfies pre-existing code rules.
2. **Student Eligibility (`UNVERIFIED`)**: Confirm university student eligibility status with Dev3pack organizers.
3. **ElevenLabs Sponsor Track (`UNVERIFIED`)**: Confirm whether an official ElevenLabs sponsor track is announced at kickoff (27 Nov).
4. **Non-ASCII Contact Seed Normalization (`PROGRAM_SPEC.md`)**: Choose Option A (ASCII-only `normalized_name` seed + Unicode `display_name`) vs. Option B (canonical/hashed seed) before Gate C (25 Nov).
5. **Real Blind-User Validation (Currently ZERO)**: Recruit and test with **2–3 real TalkBack or VoiceOver users** before 27 Nov and record real quotes in `docs/PROJECT.md`.
6. **Prior-Art Verification**: Run **Colosseum Copilot** and review **May 2026 Dev3pack submissions** to confirm no overlooked Solana accessibility layer.
7. **Demo Total Timing (`TBD`)**: Measure full 4-act demo duration (including red-team segment) during 26 Nov rehearsal and replace `TBD` in `CLAUDE.md`.

---

## Risks & Mitigations

| Risk | Severity | Mitigation / Recorded Fallback |
|------|----------|--------------------------------|
| Phantom / Solflare MWA approval popup cannot be operated eyes-free | High | Test explicitly in Gate A. If sight is required on external wallet popup, limit Screen Curtain to Bicara screens and disclose the third-party wallet UX gap honestly to judges. |
| `@picovoice/eagle-react-native` native build or Android 16 accuracy fails | Medium | Layer 1 voiceprint is explicitly optional. Drop Eagle, log fallback here, and rely on Layers 2–5 (`VOICE IDENTIFIES, HARDWARE AUTHORIZES`). |
| Jupiter Swap API V2 requires API key / rate-limits during live demo | Medium | Keep `JUPITER_API_KEY` server-side in Next.js proxy (`/api/swap/quote`), verify in Gate A, and record backup video on 26 Nov. |
| Windows NDK / CMake / Gradle build issues with `react-native-quick-crypto` + Nitro | Medium | Project moved to space-free path (`D:\AboutCoding\bicara-prototype`), dependency matrix verified (`npm install` + `tsc --noEmit` passing). |
| Zero real blind-user feedback before judging | High | Schedule 2–3 short TalkBack/VoiceOver walkthroughs before 27 Nov and log verbatim feedback in `PROJECT.md`. |

---

## Verified 2026 SDK Compatibility Matrix (Reconciled With Real Codebase)

```
Audio I/O:               expo-audio (~0.4.0 — replaces deprecated expo-av)
Voiceprint (Optional):   @picovoice/eagle-react-native + expo-secure-store
Tactile & Screen Reader: expo-haptics (~14.1.0) + React Native AccessibilityInfo
Polyfills (Boot Line 1): mobile/polyfill.js (react-native-get-random-values +
                         react-native-quick-crypto@1.1.2 + react-native-quick-base64@2.2.2 +
                         react-native-nitro-modules@0.35.0) + mobile/metro.config.js
MWA (Track A - Kit):     @solana/kit@^8.6.0 + @wallet-ui/react-native-kit@^4.4.1 +
                         @solana-mobile/mobile-wallet-adapter-protocol-kit@^3.0.2
SPL Token:               @solana-program/token@^0.18.0 (getTransferCheckedInstruction)
Swap Quotes (Quote-Only):Jupiter Swap API V2 (https://api.jup.ag/swap/v2, server-side JUPITER_API_KEY)
NLU Proxy:               Next.js app/api/intent (@google/genai gemini-4-hydrogen + offline fallback)
ElevenLabs STT / TTS:    Next.js app/api/stt (scribe_v2 + dynamic keyterms) / app/api/tts (eleven_flash_v2_5)
Anchor CLI / Client:     avm latest / @anchor-lang/core + Codama (Gate C, post-Gate B)
Database:                @supabase/supabase-js (^2.49.0)
```
