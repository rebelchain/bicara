# SECURITY_MODEL.md — Bicara Threat Model & Five-Layer Defense

## Core Principle

> **VOICE IDENTIFIES, HARDWARE AUTHORIZES.**

Voice cannot prove a live human. Automatic speaker verification is vulnerable to replay attacks ([Kinnunen et al., arXiv:1706.02101](https://arxiv.org/pdf/1706.02101)), and replayed or re-recorded audio can also degrade or defeat audio deepfake detectors ([arXiv:2505.14862](https://arxiv.org/pdf/2505.14862)). Even ElevenLabs' own AI Speech Classifier only detects ElevenLabs-generated audio — with 99% precision and 80% recall on unmodified audio — and is not a general liveness or anti-spoofing gate ([ElevenLabs AI Speech Classifier Docs](https://elevenlabs.io/docs/product-guides/audio-tools/ai-speech-classifier)).

Therefore, Bicara **never claims that voice verification stops voice clones, replays, or deepfakes**. Instead, Bicara uses five distinct layers where **Layer 5 (hardware-backed biometric signing)** is the real security boundary for funds.

---

## Physical & Input Threat Model

- **Local Microphone Only**: Bicara accepts voice commands exclusively from the phone's local microphone via `expo-audio` — never over a phone call, network socket, or remote voice channel.
- **Physical Proximity Requirement**: To launch a voice-clone or replay attack, an attacker must either be physically near the unlocked phone or physically holding it.
- **What Happens When an Attacker Plays a Cloned Voice**: Even if the attacker plays a high-quality clone of the owner's voice next to the device, Layer 3 blocks unknown recipients/unverified tokens and **Layer 5 stops fund movement** because the attacker cannot satisfy the device's hardware-backed biometric prompt.

---

## The Five Security Layers

### Layer 1 — On-Device Voiceprint (Picovoice Eagle) — *Optional Convenience & Privacy Gate*
- **Role**: Convenience and privacy gate only (helps prevent casual bystanders from querying private balances or opening payment flows). **NOT fund security.**
- **Data Handling**: Speaker profile stays locally encrypted in `expo-secure-store`, bound to the connected wallet public key.
- **Threshold Policy**: Threshold MUST be set from measured genuine vs. impostor scores recorded on physical hardware during Gate A (never invent or hardcode a `"94%"` demo score).
- **Explicit Optionality / Fallback**: If `@picovoice/eagle-react-native` fails native compilation or performs poorly in Gate A, the project continues without Layer 1 because voiceprint is not the fund security boundary. Any fallback decision must be recorded in `PROGRESS.md`.

### Layer 2 — Runtime Random Spoken Challenge
- **Mechanism**: Before confirming a sensitive transfer, the app generates a short random spoken challenge at runtime (e.g., *"Say 4-7-2 to continue"*).
- **What It Defeats**: Pre-recorded static replay clips (old recordings of the owner saying *"Send 5 USDC to Ahmad"* or *"Yes"*).
- **What It Does NOT Defeat (Honest Limit)**: It raises the operational cost of voice cloning, but it **does NOT stop real-time voice conversion** or live synthesis. Never claim otherwise.

### Layer 3 — Transaction Risk Policy & Verified Token Allowlist
- **Saved Contacts Default**: Sending is restricted to saved, owner-verified contacts by default. Sending to a brand-new address triggers explicit anomaly warnings and stricter confirmation.
- **Biometric-Protected Address Book**: **Adding or changing a contact ALWAYS requires physical hardware biometric confirmation — never voice alone.** This prevents an attacker (or STT misrecognition) from silently swapping a contact's destination address.
- **Limits & Cooldowns**: Configurable per-transaction amount threshold, daily cumulative send cap, and mandatory cooldown window for unusually large transfers or new recipients.
- **Verified Token Allowlist (Swap Defense)**: Swaps are strictly limited to a curated verified token allowlist (`USDC`, `SOL` in MVP). Any request targeting an unverified or unknown token mint triggers a spoken warning and is **hard-blocked** before quoting or signing — protecting blind users who cannot inspect fake token logos or spoofed tickers.

### Layer 4 — Spoken Transaction Narration (`TxSummary`) & Explicit Consent
- **Anti-Blind-Signing Defense**: Before handing off to the wallet, the app speaks **what the transaction will actually do** using runtime RPC data (action, token, amount, recipient name, saved vs. new status, last 4 address characters, runtime network fee, ATA creation & rent cost, swap price impact/slippage, and anomalies).
- **Re-Quote Drift Check (Swaps)**: Re-fetches the Jupiter quote right before confirmation; if output or price impact shifted beyond tolerance, Bicara re-narrates before allowing confirmation.
- **Explicit Consent**: Requires explicit `"yes"` / `"confirm"` or tapping **Confirm** on a modal that always displays the truncated wallet address.

### Layer 5 — MWA Hardware-Backed Biometric Signing — *The Real Security Boundary*
- **Mechanism**: Every on-chain transaction is signed inside the user's Android wallet via Solana Mobile Wallet Adapter (MWA 2.0).
- **Hardware Terminology Discipline**:
  - On **Solana Seeker** hardware: authorized by **Seed Vault** hardware biometrics.
  - On **any other Android phone** (Phantom, Solflare, etc.): authorized by **the wallet's own hardware-backed biometric** (Android Keystore / fingerprint / face unlock / device PIN).
- **Hard Invariant**: Private keys never enter Bicara. Voice commands can construct and narrate a transaction, but **cannot sign or broadcast it**.

---

## Server-Side Secret Isolation

- Secret API keys (`GEMINI_API_KEY`, `ELEVENLABS_API_KEY`, planned `JUPITER_API_KEY`) exist exclusively in the root Next.js server environment (`app/api/*`).
- Zero secret keys are ever shipped in `mobile/.env` or `EXPO_PUBLIC_*`.

---

## What We Claim vs. What We Do Not Claim

| We DO Claim | We Do NOT Claim |
|-------------|-----------------|
| Voice makes wallet navigation, address verification, and transaction comprehension eyes-free. | Voice verification proves a live human or stops AI voice clones. |
| Random spoken challenges defeat static pre-recorded replays. | Random spoken challenges defeat real-time voice conversion. |
| Verified token allowlists and biometric-gated contacts stop address/token spoofing by voice alone. | Blind users are protected if an attacker also compromises their physical fingerprint/PIN. |
| Hardware-backed wallet biometrics (MWA) remain the true fund authorization boundary. | Seed Vault is available on non-Seeker Android phones. |
