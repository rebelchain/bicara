export interface SdkAuditEntry {
  id: string;
  layer: string;
  oldSpec: string;
  verified2026: string;
  impact: 'Breaking' | 'Latency' | 'Security';
  measuredStatus: string;
  summary: string;
  installCmd: string;
  snippetKit: string;
  snippetWeb3v1?: string;
}

export interface ProvenanceRow {
  bucket: 'Built Before Hackathon' | 'Built During Hackathon';
  window: string;
  scope: string;
  status: string;
}

export interface HardwareMeasurementRow {
  check: string;
  status: 'PASS' | 'MEASURED' | 'DEFERRED' | 'NEXT';
  measuredValue: string;
}

export interface KnownLimitationItem {
  title: string;
  reality: string;
  mitigation: string;
}

export interface SprintTask {
  id: string;
  phase:
    | 'Phase 1: Env & MWA'
    | 'Phase 2: Voice & Blind UX'
    | 'Phase 3: Solana Tx'
    | 'Phase 4: E2E & Polish'
    | 'Phase 5: Anchor PDA';
  dayTarget: string;
  title: string;
  exitCriteria: string;
  defaultDone?: boolean;
}

export interface DemoStep {
  step: number;
  secondMark: string;
  action: string;
  spokenLine: string;
  judgeSignal: string;
}

export interface EmergencyFallback {
  scenario: string;
  symptom: string;
  mitigation: string;
}

export const HACKATHON_PROVENANCE_ROWS: ProvenanceRow[] = [
  {
    bucket: 'Built Before Hackathon',
    window: 'Nov 19–26, 2026 (pre hackathon-start)',
    scope:
      'Architecture specs & threat model, Next.js 6-route API proxy, OPPO Android 16 Custom Dev Client (Gate A PASS), Gate B pure-JS Devnet transfer builder & Supabase schema, and 1:1 mobile-parity Web Interactive Demo.',
    status: 'Gate A PASS · Gate B Code Complete',
  },
  {
    bucket: 'Built During Hackathon',
    window: 'Nov 27–29, 2026 (post hackathon-start tag)',
    scope:
      'Layer 2 spoken challenge hardening, Layer 3 strict policy & token allowlist audit, Layer 4 swap re-quote drift check, ElevenLabs self-voice red-team demonstration, reusable accessible-signing package extraction, and final submission.',
    status: 'Scheduled for Kickoff Window',
  },
];

export const HARDWARE_MEASUREMENT_ROWS: HardwareMeasurementRow[] = [
  {
    check: 'Android 16 Custom Dev Client Boot + Polyfills',
    status: 'PASS',
    measuredValue:
      'OPPO CPH2631 (Android 16) booted cleanly with quick-crypto@1.1.2, quick-base64@2.2.2, nitro@0.35.0, expo-audio, and 5 expo-haptics patterns.',
  },
  {
    check: 'MWA Authorize on solana:devnet (Solflare)',
    status: 'PASS',
    measuredValue:
      'Connected Solflare on physical Android 16 via MWA Intent and returned truncated Devnet wallet address.',
  },
  {
    check: 'External Wallet Approval Popup Eyes-Free Audit',
    status: 'MEASURED',
    measuredValue:
      'Solflare connect/approve screen required sight (no biometric-only bypass). Screen Curtain is honestly scoped to Bicara screens only.',
  },
  {
    check: 'ElevenLabs scribe_v2 STT + Dynamic Contact Keyterms',
    status: 'PASS',
    measuredValue:
      '760–774ms live on OPPO over USB; accurately transcribed "Check price", "Swap 10 USDC to SOL", and "Send 5 USDC to Ahmad".',
  },
  {
    check: 'ElevenLabs eleven_flash_v2_5 On-Device TTS',
    status: 'PASS',
    measuredValue:
      '558–732ms warm (1296ms cold first request) via /api/tts -> expo-audio createAudioPlayer.',
  },
  {
    check: 'Jupiter Swap V2 Quote-Only (USDC ↔ SOL) + Scam Block',
    status: 'PASS',
    measuredValue:
      '724ms E2E on OPPO (322ms server, router: "metis", transaction: null); /api/prices 512ms; unverified token XYZ blocked with HTTP 403.',
  },
  {
    check: 'Optional Layer 1 Voiceprint (@picovoice/eagle-react-native)',
    status: 'DEFERRED',
    measuredValue:
      'Formally deferred post-Gate B to avoid Android 16 native rebuild risk. Defense relies on Layers 2–5 ("Voice Identifies, Hardware Authorizes").',
  },
  {
    check: 'Gate B Live Devnet Transfer + Supabase Sync on OPPO',
    status: 'NEXT',
    measuredValue:
      'Pure-JS TransferChecked + SOL builder & Supabase client complete; ready for physical Solflare signing & Explorer verification on OPPO.',
  },
];

export const HONEST_KNOWN_LIMITATIONS: KnownLimitationItem[] = [
  {
    title: 'Third-Party Wallet Popup Is Not Eyes-Free',
    reality:
      'Measured on OPPO Android 16: Solflare requires looking at the screen to tap Approve during MWA authorization.',
    mitigation:
      'Screen Curtain is scoped strictly to Bicara screens, and we disclose external wallet accessibility gaps honestly instead of hiding them.',
  },
  {
    title: 'Optional Layer 1 Voiceprint Is Deferred',
    reality:
      'Voices can be recorded or cloned; @picovoice/eagle-react-native is optional and deferred post-Gate B.',
    mitigation:
      'Security never claims voice alone stops deepfakes. Authorization relies on Layer 2 random 3-digit challenge, Layer 3 allowlists, Layer 4 full TxSummary, and Layer 5 wallet/hardware signing.',
  },
  {
    title: 'Zero Real Blind-User Sessions Completed Yet (0/3)',
    reality:
      'All testing so far is builder-conducted; no external TalkBack/VoiceOver user walkthroughs have been recorded yet.',
    mitigation:
      'Recruiting 2–3 real TalkBack or VoiceOver users before Nov 27 is tracked as a top open item in PROGRESS.md.',
  },
  {
    title: 'Swaps Are Strictly Quote-Only & Devnet-Only Execution',
    reality:
      'Jupiter Swap V2 omits taker (transaction: null) and all live transfers execute exclusively on solana:devnet.',
    mitigation:
      'Proves multi-action DEX narration and scam-token blocking (HTTP 403) with zero mainnet financial risk.',
  },
];

export const SDK_AUDIT_ENTRIES: SdkAuditEntry[] = [
  {
    id: 'mwa',
    layer: 'Solana Mobile Wallet Adapter (Android-Wide)',
    oldSpec: '@solana-mobile/mobile-wallet-adapter-protocol + Expo Go',
    verified2026:
      '@wallet-ui/react-native-kit@^4.4.1 + @solana-mobile/mobile-wallet-adapter-protocol-kit@^3.0.2 + expo-dev-client',
    impact: 'Breaking',
    measuredStatus: 'Verified on OPPO CPH2631 (Android 16)',
    summary:
      'MWA relies on native Android Intents and cannot run inside Expo Go. Uses Custom Dev Client (npx expo run:android), boots mobile/polyfill.js on line 1, and authorizes hardware-agnostic Android wallets on solana:devnet (Seed Vault claimed only on Seeker).',
    installCmd:
      'cd mobile && npm install && npx expo run:android',
    snippetKit: `// mobile/polyfill.js (imported as line 1 of index.js)
import 'react-native-get-random-values';
import { install } from 'react-native-quick-crypto';
install();

// mobile/app/(tabs)/index.tsx
import { useMobileWallet } from '@wallet-ui/react-native-kit';

const { account, connect, signAndSendTransaction } = useMobileWallet();
const [sig] = await signAndSendTransaction(compiledDevnetTx);`,
    snippetWeb3v1: `// Browser Interactive Demo (lib/solana-browser.ts)
import { Connection, SystemProgram, Transaction, PublicKey } from '@solana/web3.js';

const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
const tx = new Transaction().add(
  SystemProgram.transfer({ fromPubkey, toPubkey, lamports })
);
const { signature } = await window.phantom.solana.signAndSendTransaction(tx);`,
  },
  {
    id: 'security-layers',
    layer: '5-Layer "Voice Identifies, Hardware Authorizes" Defense',
    oldSpec: 'Claiming voiceprint alone blocks clones (with hardcoded 94% UI score)',
    verified2026:
      'Layers 2–5 enforced in code (3-digit challenge + allowlist + TxSummary + MWA/Wallet sign); Eagle Layer 1 optional & deferred',
    impact: 'Security',
    measuredStatus: 'Hardcoded 94% removed · Layers 2–5 active',
    summary:
      'Grounded in replay/deepfake research: voice handles intent and plain-English verification, never sole authorization. Every transfer requires a random 3-digit spoken challenge, verified recipient match, spoken fee/ATA disclosure, and explicit wallet approval.',
    installCmd: 'npx expo install expo-haptics expo-secure-store',
    snippetKit: `// Layer 2 Random 3-Digit Challenge + Layer 4 Spoken TxSummary
const challenge = generateSpokenChallenge(); // e.g. "4 - 8 - 2"
const summary = \`Review transfer: send \${amount} \${asset} to saved contact \${name},
  address ending in \${wallet.slice(-4)}. Network fee is 0.000005 SOL.
  Say \${challenge.spokenWords} to continue, then approve in your wallet.\`;`,
  },
  {
    id: 'audio',
    layer: 'Expo Audio Recording & Playback',
    oldSpec: 'expo-av (deprecated Audio.Recording & Audio.Sound)',
    verified2026: 'expo-audio (~0.4.0 — useAudioRecorder & createAudioPlayer)',
    impact: 'Breaking',
    measuredStatus: 'Verified on OPPO Android 16 (.m4a + playback)',
    summary:
      'Replaces deprecated expo-av with modern Expo Audio lifecycle hooks. Captures .m4a voice clips on Android 16 and plays eleven_flash_v2_5 audio streams cleanly alongside expo-haptics feedback.',
    installCmd: 'npx expo install expo-audio expo-haptics',
    snippetKit: `import { useAudioRecorder, RecordingPresets, requestRecordingPermissionsAsync } from 'expo-audio';

const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
const { granted } = await requestRecordingPermissionsAsync();
if (granted) {
  await recorder.prepareToRecordAsync();
  recorder.record();
}`,
  },
  {
    id: 'elevenlabs',
    layer: 'ElevenLabs Scribe v2 STT & Flash v2.5 TTS',
    oldSpec: 'scribe_v1 + eleven_multilingual_v2 + client-side API key',
    verified2026:
      'Server-side /api/stt (scribe_v2 + dynamic keyterms <=1,000) & /api/tts (eleven_flash_v2_5)',
    impact: 'Latency',
    measuredStatus: 'Measured: STT 760–774ms · TTS 558–732ms warm',
    summary:
      'Server proxy keeps ELEVENLABS_API_KEY off the client APK. Enforces verified scribe_v2 keyterm limits (up to 1,000 deduplicated terms, <=50 chars, <=5 words) so saved contact names and token symbols transcribe cleanly in English.',
    installCmd: '# Configure ELEVENLABS_API_KEY in server .env.local (never EXPO_PUBLIC_)',
    snippetKit: `// app/api/stt/route.ts
formData.append('model_id', 'scribe_v2');
formData.append('language_code', 'eng');
keyterms.slice(0, 1000).forEach((term) => formData.append('keyterm_prompt', term));

// app/api/tts/route.ts (measured 558-732ms warm on OPPO Android 16)
body: JSON.stringify({
  text: spokenSummary,
  model_id: 'eleven_flash_v2_5',
});`,
  },
  {
    id: 'jupiter',
    layer: 'Jupiter Swap API V2 (Quote-Only Safe Mode)',
    oldSpec: 'Single-action send-only prototype with no DEX verification',
    verified2026:
      'Server-side /api/swap/quote (GET api.jup.ag/swap/v2/order without taker) + strict USDC ↔ SOL allowlist',
    impact: 'Security',
    measuredStatus: 'Measured: 724ms E2E · Unverified token blocked (HTTP 403)',
    summary:
      'Demonstrates multi-action spoken verification (price impact, slippage, router) with zero mainnet risk by omitting taker (transaction: null). Any unverified token symbol (e.g. XYZ) is rejected at the server with HTTP 403 and narrated aloud.',
    installCmd: '# Configure JUPITER_API_KEY in server .env.local',
    snippetKit: `// app/api/swap/quote/route.ts
const ALLOWED_MINTS = { USDC: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', SOL: 'So11111111111111111111111111111111111111112' };
if (!ALLOWED_MINTS[inputToken] || !ALLOWED_MINTS[outputToken]) {
  return NextResponse.json({ error: 'Unverified token blocked by allowlist' }, { status: 403 });
}
// Omits taker -> Jupiter returns quote only (transaction: null)`,
  },
  {
    id: 'token',
    layer: 'Solana Devnet SPL TransferChecked & ATA Rent Check',
    oldSpec: 'Unchecked SPL transfer with hardcoded assumptions',
    verified2026:
      '@solana-program/token getTransferCheckedInstruction (mobile) + SPL opcode 12 TransferChecked (web)',
    impact: 'Security',
    measuredStatus: 'Implemented in /mobile & Web Demo · Ready for Gate B physical run',
    summary:
      'Validates mint address and 6 decimals on-chain via TransferChecked using exact BigInt integer units. Inspects recipient ATA before signing so any ~0.00204 SOL one-time account rent is spoken aloud before wallet approval.',
    installCmd: 'npm install @solana/web3.js   # Web Demo\ncd mobile && npm install @solana/kit @solana-program/token',
    snippetKit: `// Mobile Track A (@solana/kit + @solana-program/token)
const rawAmount = BigInt(Math.round(amountUsdc * 1_000_000));
const ix = getTransferCheckedInstruction({
  source: senderAta,
  mint: USDC_MINT_DEVNET,
  destination: recipientAta,
  authority: senderSigner,
  amount: rawAmount,
  decimals: 6,
});`,
    snippetWeb3v1: `// Browser Live Devnet (lib/solana-browser.ts)
// Opcode 12 = SPL Token TransferChecked (u64 LE amount + u8 decimals)
// Automatically prepends CreateAssociatedTokenAccountIdempotent if recipient lacks ATA.`,
  },
  {
    id: 'anchor',
    layer: 'Gate C Anchor ContactRegistry PDA (Queued Post-Gate B)',
    oldSpec: 'Mandatory Day-1 smart contract blocking mobile delivery',
    verified2026:
      'Gated behind Gate B pass · Verified Supabase address book + AsyncStorage cache live now',
    impact: 'Breaking',
    measuredStatus: 'Queued for Nov 25 (only if Gate B passes)',
    summary:
      'Reframed as an optional on-chain verified address book dual-writing with Supabase. Non-ASCII seed normalization decision is tracked openly in PROGRESS.md so core spoken transfer reliability is never risked.',
    installCmd: 'avm install latest && avm use latest  # Gate C only after Gate B passes',
    snippetKit: `// Gate C target PDA design (PROGRAM_SPEC.md)
#[account(
  init,
  payer = owner,
  space = 8 + 32 + (4 + 50) + (4 + 50) + 32 + 8 + 1,
  seeds = [b"contact", owner.key().as_ref(), normalized_name.as_bytes()],
  bump
)]
pub contact_record: Account<'info, ContactRecord>;`,
  },
];

export const INITIAL_SPRINT_TASKS: SprintTask[] = [
  {
    id: 'sp-1',
    phase: 'Phase 1: Env & MWA',
    dayTarget: 'Nov 20',
    title: 'Gate A: OPPO Android 16 Custom Dev Client + Polyfills + Solflare MWA',
    exitCriteria: 'App boots cleanly, /api/health OK over USB, Solflare Devnet authorizes.',
    defaultDone: true,
  },
  {
    id: 'sp-2',
    phase: 'Phase 2: Voice & Blind UX',
    dayTarget: 'Nov 20',
    title: 'Gate A: Measure scribe_v2 STT, eleven_flash_v2_5 TTS & Jupiter V2 Quote-Only',
    exitCriteria: 'STT 760–774ms, TTS 558–732ms warm, Jupiter 724ms E2E, scam token HTTP 403.',
    defaultDone: true,
  },
  {
    id: 'sp-3',
    phase: 'Phase 3: Solana Tx',
    dayTarget: 'Nov 23–24',
    title: 'Gate B: Execute Live Solana Devnet Transfer + Supabase Sync on OPPO',
    exitCriteria: 'Real Devnet SOL/USDC transfer signed via Solflare and verified on Solana Explorer.',
  },
  {
    id: 'sp-4',
    phase: 'Phase 5: Anchor PDA',
    dayTarget: 'Nov 25',
    title: 'Gate C (Conditional): Anchor ContactRegistry PDA after Gate B passes',
    exitCriteria: 'Deployed to Devnet or formally deferred with Supabase verified address book.',
  },
  {
    id: 'sp-5',
    phase: 'Phase 4: E2E & Polish',
    dayTarget: 'Nov 26–29',
    title: 'Rehearsal + Hackathon Window: Red-Team Demo & accessible-signing Extraction',
    exitCriteria: 'Timed rehearsal, self-voice red-team log, and clean MIT submission.',
  },
];

export const DEMO_SCRIPT_STEPS: DemoStep[] = [
  {
    step: 1,
    secondMark: 'TBD',
    action: 'Present anti-blind-signing problem ($516.8M Chainalysis; WHO 2.2B vision impairment)',
    spokenLine:
      '"If a Solana transaction can be understood safely with zero screen, blind signing disappears for everyone."',
    judgeSignal: 'Grounded in verified data with zero fabricated numbers.',
  },
  {
    step: 2,
    secondMark: 'TBD',
    action: 'Voice send & pre-sign TxSummary + Layer 2 random 3-digit challenge',
    spokenLine:
      '"Review transfer: send 0.01 SOL to Ahmad, address ending in 3mN3. Network fee is 0.000005 SOL. Say 4-8-2."',
    judgeSignal: 'Full human-readable pre-sign comprehension before any wallet popup.',
  },
  {
    step: 3,
    secondMark: 'TBD',
    action: 'Live Jupiter Swap V2 Quote-Only + unverified token XYZ block (HTTP 403)',
    spokenLine: '"Blocked: XYZ is not on Bicara’s verified token allowlist."',
    judgeSignal: 'Multi-action accessibility layer with verifiable scam-token protection.',
  },
];

export const EMERGENCY_FALLBACKS: EmergencyFallback[] = [
  {
    scenario: 'Noisy Demo Hall / Microphone Interference',
    symptom: 'Ambient crowd noise degrades live microphone recognition',
    mitigation: 'Use the built-in type-to-speak command bar or Quick Demo Scenarios.',
  },
  {
    scenario: 'External Wallet Approval Popup Not Eyes-Free',
    symptom: 'Solflare approval popup requires visual tap on Approve',
    mitigation: 'Keep Screen Curtain scoped strictly to Bicara screens and disclose honestly.',
  },
  {
    scenario: 'ElevenLabs Rate Limit or Network Lag',
    symptom: 'TTS response slows or returns 429 during judging',
    mitigation: 'Automatic fallback to native browser/OS speech synthesis + live spoken caption.',
  },
  {
    scenario: 'Public Devnet RPC Congestion',
    symptom: 'api.devnet.solana.com times out during blockhash fetch',
    mitigation: 'Configure EXPO_PUBLIC_SOLANA_BACKUP_RPC_URL or demonstrate via Instant Sandbox.',
  },
];
