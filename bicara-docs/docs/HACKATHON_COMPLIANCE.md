# HACKATHON_COMPLIANCE.md — Dev3pack Rules, Repo Hygiene & Work Split

## Event Overview

- **Hackathon**: [Dev3pack Global Hackathon](https://hack.dev3pack.xyz/)
- **Window**: Friday 27 November 2026 (kickoff) → Sunday 29 November 2026 (submission)
- **Known Rules**:
  - Open-source repository is **mandatory**.
  - Building on **Solana** is **required**.
  - Starting early on Solana-related exploration/prototyping is permitted in principle.

---

## Unverified Rules & Open Eligibility Questions (Human Action Required)

> Do NOT treat any item below as confirmed fact until verified directly with Dev3pack organizers.

1. **Pre-Existing Code Disclosure Rule — `UNVERIFIED`**:
   - A participant claimed that disclosing pre-hackathon code transparently in the README is sufficient.
   - **TODO (Human)**: Confirm the exact pre-existing code and commit-history policy directly with Dev3pack organizers before 27 Nov 2026.
2. **University Student Eligibility — `UNVERIFIED`**:
   - Dev3pack is a university student hackathon.
   - **TODO (Human)**: Confirm builder student eligibility status with Dev3pack organizers and record confirmation in `PROGRESS.md`.
3. **ElevenLabs Sponsor Track — `UNVERIFIED`**:
   - An ElevenLabs sponsor track is assumed to exist based on hackathon themes, but has not yet been officially announced.
   - **TODO (Human)**: Verify official sponsor track list at kickoff on 27 Nov and adjust submission metadata accordingly.

---

## Repository Hygiene Plan

1. **Public Repo & Open-Source License**:
   - Repository MUST be public under the **MIT License** (confirmed by builder).
   - Add a root `LICENSE` file (MIT) before submission.
2. **Kickoff Tag (`hackathon-start`)**:
   - Create an annotated git tag `hackathon-start` at the exact kickoff commit on **Friday 27 November 2026**:
     ```bash
     git tag -a hackathon-start -m "Dev3pack Global Hackathon kickoff (27 Nov 2026)"
     git push origin hackathon-start
     ```
3. **Honest Git History**:
   - **Never** backdate commits.
   - **Never** squash pre-hackathon commits to hide prior work.
   - Every commit after `hackathon-start` cleanly shows the net-new features built during the 72-hour hackathon window.
4. **Mandatory README Disclosure Section**:
   - The root `README.md` MUST contain an explicit section titled **"Built before the hackathon vs during the hackathon"** linking directly to the `hackathon-start` tag so judges can audit pre-kickoff de-risking vs. hackathon-window engineering in seconds.

---

## Compliance-Driven Work Split

### Reconciling the Old "Build Clean From Scratch" Rule
Earlier project docs said Phase 2 would "build clean from scratch" during the 72-hour window. Rebuilding native Android polyfills, Gradle NDK configs, and MWA boilerplate from scratch in 72 hours creates avoidable failure risk without adding judging value. Instead, Bicara follows a **transparent, verifiable split**:

| Window | Scope | Purpose & Transparency |
|--------|-------|------------------------|
| **Before Kickoff (20–26 Nov 2026 — Prototype & De-Risking)** | • Expo Custom Dev Build (`npx expo run:android`) + `mobile/polyfill.js` + `mobile/metro.config.js`<br>• MWA 2.0 connection on physical Android USB (`solana:devnet`)<br>• Picovoice Eagle spike & real score calibration<br>• Next.js voice proxy (`/api/health`, `/api/stt`, `/api/intent`, `/api/tts`)<br>• Basic voice → Devnet `TransferChecked` loop<br>• Initial Quote-Only Jupiter Swap V2 (`USDC ↔ SOL`) + price readout prototype<br>• Gate C Anchor `ContactRegistry` PDA spike *(only if Gate B passes)* | Eliminates hardware, NDK, MWA, and API-wiring risk before kickoff. Fully disclosed in README under *"Built before the hackathon"*. |
| **Reserved for Hackathon Window (27–29 Nov 2026 — Post `hackathon-start` Tag)** | • **Layer 2**: Runtime random spoken challenge (`"say 4-7-2"`)<br>• **Layer 3**: Risk policy engine (saved contacts default, biometric-gated contact edits, amount caps, daily limit, cooldown, verified token allowlist enforcement)<br>• **Layer 4**: Full `TxSummary` + ElevenLabs spoken transaction narration (runtime RPC fee/rent calculation, first-use stablecoin context, pre-sign swap re-quote drift check)<br>• **Red-Team Demo**: ElevenLabs self-voice clone test, measured scores, and live rehearsal<br>• **Architecture Extraction**: Extracting reusable `accessible-signing` module cleanly from the mobile reference app<br>• **Submission Polish**: Final README disclosure, demo video, and open-source MIT packaging | All differentiating accessibility-layer IP, security layers, red-team verification, and modularization are visibly authored in git history between `hackathon-start` and Sunday submission. |
