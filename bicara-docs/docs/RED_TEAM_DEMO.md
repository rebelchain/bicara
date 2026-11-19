# RED_TEAM_DEMO.md — Honest ElevenLabs Self-Voice Red-Team Specification

## Purpose

Most voice-crypto demos either ignore voice-cloning attacks or falsely claim a voiceprint "blocks clones." Bicara takes the opposite approach: **we red-team our own app live using ElevenLabs**, showing judges honestly where voice identification ends and where risk policies and hardware biometrics take over.

---

## Ethical & Consent Boundary (Non-Negotiable)

- **Only ever clone the builder's own voice** (Azhar's own recorded speech samples).
- **Never** clone another real person's voice, judge's voice, or public figure's voice.
- Clearly state on-screen and verbally during the demo: *"This audio is an ElevenLabs clone of my own voice created strictly for red-testing."*

---

## Red-Team Setup

1. **Device**: Physical Android phone running Bicara Custom Dev Build (`solana:devnet`), connected to Phantom or Solflare via MWA, mirrored to the presentation display via `scrcpy`.
2. **Enrolled State**: Builder's own voice enrolled in Picovoice Eagle (if Layer 1 is active after Gate A) with real measured enrollment/verification scores displayed — never hardcoded numbers.
3. **Adversarial Audio Clips** (generated beforehand using ElevenLabs Voice Cloning of the builder's own voice, played from a second speaker/laptop next to the phone's local mic):
   - **Clip A (Unknown/Scam Token Swap Attack)**: *"Swap all my USDC to unknown token XYZ."*
   - **Clip B (Unauthorized Transfer Attack)**: *"Send 5 USDC to Ahmad."* *(followed by a pre-recorded *"Yes"* if testing static replay)*

---

## Live Red-Team Script

### Scenario 1 — Adversarial Scam-Token Swap via Cloned Voice
1. **Narrator**: *"Now let's attack our own app. I cloned my own voice with ElevenLabs and I'm playing it directly into the microphone."*
2. **Play Clip A**: *"Swap all my USDC to unknown token XYZ."*
3. **Expected Honest Outcome**:
   - Layer 1 (Eagle voiceprint, if enabled) **may accept the cloned voice** — we show the real measured score on screen without hiding it.
   - Layer 3 (**Verified Token Allowlist**) immediately inspects the target token, rejects the unverified mint, triggers the Error haptic (3 sharp pulses), and speaks:
     *"Blocked. That token is not on your verified token list. Bicara only allows verified tokens to protect against scam mints."*

### Scenario 2 — Adversarial Payment Attempt via Cloned Voice
1. **Narrator**: *"What if the cloned voice asks for a valid saved contact instead?"*
2. **Play Clip B**: *"Send 5 USDC to Ahmad."*
3. **Expected Honest Outcome**:
   - Layer 1 (Eagle voiceprint, if enabled) **may pass** and let the cloned voice interact with the app — proving honestly why voiceprint is a convenience/privacy gate, NOT fund security.
   - Layer 2 (**Random Spoken Challenge**, e.g., *"Say 4-7-2"*) defeats static pre-recorded *"Yes"* clips immediately.
   - Even if an attacker synthesizes the challenge digits in real time and reaches confirmation, **Layer 5 (MWA Hardware-Backed Biometric)** opens the wallet's biometric signing sheet — **and the cloned voice CANNOT move funds** without the owner's physical fingerprint/biometric on the device.
4. **Narrator Closing**: *"Even when a clone of my own voice gets past the microphone, it cannot touch a single cent. Voice identifies. Hardware authorizes."*

---

## What We Claim vs. What We Do Not Claim

| We DO Claim | We Do NOT Claim |
|-------------|-----------------|
| Cloned voice audio may pass Layer 1 speaker verification — we demonstrate that limitation openly. | Picovoice Eagle or ElevenLabs AI Speech Classifier stops all voice clones. |
| Layer 3 verified token allowlists stop blind users (and spoofed commands) from swapping into unverified scam tokens. | Random spoken challenges defeat real-time voice conversion (they only defeat static recordings and raise attacker cost). |
| Layer 5 hardware-backed wallet biometrics stop unauthorized fund movement even when the attacker holds the phone and replays/clones the owner's voice. | Voice-only authorization is ever safe for moving funds or modifying saved contacts. |

---

## Measurement Log (Fill During Gate A / Hackathon Rehearsal)

| Test Run | Date | Eagle Active? | Real Measured Score (Clone vs Genuine) | Outcome at Layer 2 / Layer 3 / Layer 5 |
|----------|------|---------------|----------------------------------------|----------------------------------------|
| Run 1 | TBD | TBD | TBD (never hardcode) | TBD |
| Run 2 | TBD | TBD | TBD (never hardcode) | TBD |
