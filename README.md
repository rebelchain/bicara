# Bicara — Speak Before You Sign on Solana

**Bicara** is an open-source **spoken transaction verification and accessibility layer (`accessible-signing`)** for Solana, demonstrated through a high-contrast voice-first Android reference app and an identical live-Devnet web demo.

Before you sign any transfer or swap, Bicara translates raw addresses, fees, account rent, and risk flags into plain spoken English, verifies recipients against your saved address book, and requires a random 3-digit spoken challenge plus wallet/hardware authorization.

> Built for **Dev3pack Global Hackathon** (Nov 27–29, 2026) · **MIT License** · Solo Builder: **Azhar**

---

## Why Bicara Exists

- **Blind signing hurts everyone**: Chainalysis (2022) documented **$516.8M** lost to approval phishing alone. Even sighted users routinely click "Approve" on opaque hex addresses and unverified tokens.
- **Zero-screen accessibility is the ultimate proof case**: According to the WHO, **2.2 billion** people live with vision impairment worldwide. If a Solana payment flow can be understood and verified safely with zero screen, it eliminates blind signing for sighted users too.
- **Security principle — *"Voice Identifies, Hardware Authorizes"***: Voices can be recorded or cloned. Bicara never claims voice alone stops deepfakes; instead it uses a 5-layer defense where voice handles comprehension and intent, while your wallet/hardware signs the transaction.

---

## Transparent Hackathon Split (`Built Before` vs `Built During`)

To keep repository history 100% transparent and audit-ready for Dev3pack judges, we explicitly separate pre-hackathon prototyping from work committed after the `hackathon-start` tag on **Friday, November 27, 2026**.

| Scope Bucket | Time Window | What Is Included | Verification / Status |
| :--- | :--- | :--- | :--- |
| **Built Before Hackathon** *(Pre-Kickoff Prototype & Hardware De-Risking)* | Nov 19–26, 2026 *(pre `hackathon-start`)* | • Architecture specs & threat model (`bicara-docs/`)<br>• Next.js server-side voice & quote proxies (`/api/stt`, `/api/intent`, `/api/tts`, `/api/swap/quote`, `/api/prices`, `/api/health`)<br>• Expo Custom Dev Client (`/mobile`) verified on physical OPPO `CPH2631` (Android 16): polyfills, MWA connect, `expo-audio`, `expo-haptics`, spoken tabs<br>• Gate B pure-JS Solana Devnet transfer builder (`SOL` & `USDC TransferChecked`) + Supabase schema (`supabase/schema.sql`)<br>• Public Landing Page, 1:1 Mobile-parity Web Interactive Demo (Live Devnet + Sandbox), and Developers & Judges studio | **Gate A: PASS** (measured on OPPO Android 16)<br>**Gate B: Code Complete** (live physical OPPO transfer verification in progress)<br>**Gate C (Anchor PDA): Pending Gate B** |
| **Built During Hackathon** *(Post `hackathon-start` Tag)* | Nov 27–29, 2026 *(visible in git commits after kickoff tag)* | • Layer 2 random 3-digit spoken challenge hardening across all confirmation paths<br>• Layer 3 risk policy & strict verified token allowlist enforcement (`HTTP 403` narration)<br>• Layer 4 full `TxSummary` narration + pre-sign swap re-quote drift detection<br>• Ethical ElevenLabs self-voice clone red-team demonstration (`docs/RED_TEAM_DEMO.md`) & measured outcome log<br>• Extraction of reusable `accessible-signing` TypeScript module consumed by both mobile and web<br>• Final rehearsal timing & submission package | **Scheduled for Nov 27–29, 2026** |

> *Open compliance check*: Pre-existing code disclosure format and student eligibility are flagged as `UNVERIFIED` in `bicara-docs/PROGRESS.md` pending confirmation with Dev3pack organizers at kickoff.

---

## Hardware Gate Tracker (Real Measured Numbers)

All measurements below were captured on a physical **OPPO `CPH2631` (Android 16)** over USB (`adb reverse tcp:3000 tcp:3000`). No simulated numbers or hardcoded scores.

| Gate | Target Window | Status | Measured Result / Recorded Decision |
| :--- | :--- | :--- | :--- |
| **Gate A — Hardware & Voice De-Risk** | Nov 20–22 | **PASS** *(with 1 recorded deferral)* | • Android 16 Custom Dev Client boots cleanly (`quick-crypto@1.1.2`, `quick-base64@2.2.2`, `nitro@0.35.0`)<br>• `/api/health` returns `200 OK` over USB<br>• MWA authorizes `solana:devnet` via Solflare<br>• `scribe_v2` English STT + dynamic contact `keyterms`: **`760–774ms`**<br>• `eleven_flash_v2_5` on-device TTS: **`558–732ms` warm** (`1296ms` cold)<br>• Jupiter Swap V2 Quote-Only (`USDC ↔ SOL`): **`724ms` E2E** (`322ms` server; unverified token blocked with `HTTP 403`)<br>• `/api/prices`: **`512ms`**<br>• **Recorded Fallback**: Optional Layer 1 (`@picovoice/eagle-react-native`) formally deferred post-Gate B to avoid native rebuild risk |
| **Gate B — Live Devnet Transfer + Supabase** | Nov 23–24 | **Code Complete — Physical Test Next** | Pure-JS SOL + Circle Devnet USDC `TransferChecked` builder, pre-sign `TxSummary` + ATA rent check, Layer 2 random 3-digit challenge, and Supabase + AsyncStorage sync are implemented in `/mobile`. Next step: execute live Devnet transfer on OPPO via Solflare and log Explorer tx signature. |
| **Gate C — Anchor `ContactRegistry` PDA** | Nov 25 *(only if B passes)* | **Queued** | Deferred strictly until Gate B passes on physical hardware. If frozen, verified Supabase address book remains primary with honest disclosure. |
| **Rehearsal & Demo Timing** | Nov 26 | **Pending** | Full 4-act demo duration remains `TBD` until timed live on physical hardware (`scrcpy`). |

---

## Honest Known Limitations

We prefer engineering honesty over pitch hype:

1. **External Wallet Approval Popup (Measured on Android 16)**: Solflare's MWA authorization screen required looking at the screen to tap Approve (no biometric-only bypass on connect). Therefore, Bicara's **Screen Curtain** mode is scoped strictly to Bicara's own screens, and third-party wallet UI accessibility limits are disclosed openly.
2. **Optional Voiceprint Layer 1 Deferred**: `@picovoice/eagle-react-native` is optional and deferred post-Gate B. Security relies on Layers 2–5 (random spoken challenge, address book + token allowlist policy, full spoken `TxSummary`, and wallet/hardware signing).
3. **Real Blind-User Testing (`0/3` Completed So Far)**: No real TalkBack/VoiceOver user walkthroughs have been conducted yet; recruiting 2–3 real screen-reader users before Nov 27 is an active priority tracked in `bicara-docs/PROGRESS.md`.
4. **Quote-Only Swaps**: Jupiter Swap V2 integration intentionally omits `taker` (`transaction: null`) so swaps are **Quote-Only** with zero mainnet funds at risk. All on-chain execution is strictly **`solana:devnet`**.

---

## Judge Quickstart (2 Ways to Test)

### Option 1 — Browser Interactive Demo (2 Minutes, Real Solana Devnet or Sandbox)

1. Run the Next.js app locally or open the deployed preview URL:
   ```bash
   cp .env.example .env.local
   # Add GEMINI_API_KEY, ELEVENLABS_API_KEY, and JUPITER_API_KEY (optional for fallback mode)
   npm install
   npm run dev
   ```
2. Open `http://localhost:3000` and click **Try Live Demo** (or **Sandbox**).
3. **To execute a real Solana Devnet transaction**:
   - Switch to **Live Solana Devnet** at the top of the Demo page.
   - Connect **Phantom** or **Solflare** (switched to **Solana Devnet** in wallet developer settings).
   - Need test SOL? Click the Devnet Faucet link or run `solana airdrop 1 <YOUR_ADDRESS> --url devnet`.
   - Use **Contacts → Add My Wallet as Test Contact** (or add any Devnet address), then tap **Send** or speak `"Send 0.001 SOL to <Name>"` → review the spoken `TxSummary` + 3-digit challenge → sign in your wallet → verify the live transaction on **Solana Explorer Devnet**.
4. **No browser wallet installed?** Switch to **Instant Sandbox** to test every voice command, 2-step send flow, live Jupiter Swap V2 quote, unknown-recipient blocking, and Screen Curtain mode immediately.

### Option 2 — Physical Android Phone (Expo Custom Dev Client over USB)

> Expo Go cannot run Android Mobile Wallet Adapter intents. Use `expo-dev-client`.

```bash
# 1. Verify USB debugging & bridge Next.js voice proxy + Metro over USB
adb devices
adb reverse tcp:3000 tcp:3000 && adb reverse tcp:8081 tcp:8081

# 2. Configure mobile env (Supabase optional — falls back to AsyncStorage automatically)
cd mobile
cp .env.example .env
npm install

# 3. Compile & launch Custom Dev Client on physical Android phone
npx expo run:android
```

---

## Project Structure & Documentation

- **`/` (Next.js 15 App)**: Public Landing Page, 1:1 Mobile-parity Interactive Demo (Live Devnet + Sandbox), Developers & Judges studio (`Architecture`, `Build Kit`, `Docs`), and server-side API proxies (`/api/stt`, `/api/intent`, `/api/tts`, `/api/swap/quote`, `/api/prices`, `/api/health`).
- **`/mobile` (Expo Custom Dev Client)**: Physical Android app (`@solana/kit`, `@wallet-ui/react-native-kit`, `expo-audio`, `expo-haptics`, Supabase + AsyncStorage sync).
- **`/supabase/schema.sql`**: Verified `contacts` and `transactions` tables with validation constraints and RLS policies.
- **`/bicara-docs/`**: Full engineering specs — `CLAUDE.md`, `PROGRESS.md`, `PROJECT.md`, `ARCHITECTURE.md`, `SECURITY_MODEL.md`, `RED_TEAM_DEMO.md`, `HACKATHON_COMPLIANCE.md`, `MOBILE_SPEC.md`, `VOICE_SPEC.md`, and `PROGRAM_SPEC.md`.

---

## License

Released under the **MIT License**. See repository license headers and `bicara-docs/docs/HACKATHON_COMPLIANCE.md` for full attribution and open-source terms.
