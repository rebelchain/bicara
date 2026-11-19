export interface SdkAuditEntry {
  id: string;
  layer: string;
  oldSpec: string;
  verified2026: string;
  impact: 'Breaking' | 'Latency' | 'Security';
  summary: string;
  installCmd: string;
  snippetKit: string;
  snippetWeb3v1?: string;
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

export const SDK_AUDIT_ENTRIES: SdkAuditEntry[] = [
  {
    id: 'mwa',
    layer: 'Solana Mobile Wallet Adapter + Seed Vault',
    oldSpec: '@solana-mobile/mobile-wallet-adapter-protocol + Expo Go',
    verified2026:
      '@wallet-ui/react-native-kit + @solana-mobile/mobile-wallet-adapter-protocol-kit + expo-dev-client',
    impact: 'Breaking',
    summary:
      'MWA relies on native Android Intents and will NOT run inside Expo Go. Must use expo-dev-client (npx expo run:android), load crypto/Buffer polyfills as line 1, and pass CAIP-2 chains (solana:devnet) inside transact() as Factor 2 hardware signing.',
    installCmd:
      'npm create solana-dapp@latest  # choose Solana Mobile\nnpx expo install expo-dev-client react-native-safe-area-context',
    snippetKit: `import 'react-native-get-random-values';
import { Buffer } from '@craftzdog/react-native-buffer';
global.Buffer = global.Buffer || Buffer;

import { KitMobileWallet, transact } from '@solana-mobile/mobile-wallet-adapter-protocol-kit';

const signature = await transact(async (wallet: KitMobileWallet) => {
  const auth = await wallet.authorize({
    chain: 'solana:devnet',
    identity: { name: 'Bicara', uri: 'https://bicara.app', icon: 'favicon.ico' },
    auth_token: cachedAuthToken,
  });
  const [sig] = await wallet.signAndSendTransactions({ transactions: [txMessage] });
  return sig;
});`,
    snippetWeb3v1: `import { MobileWalletProvider, useMobileWallet } from '@wallet-ui/react-native-web3js';

// Wrap root layout:
<MobileWalletProvider cluster="devnet" appIdentity={{ name: 'Bicara', uri: 'https://bicara.app', icon: 'favicon.ico' }}>
  <App />
</MobileWalletProvider>

// In Home screen:
const { account, connect, disconnect } = useMobileWallet();`,
  },
  {
    id: 'voiceprint',
    layer: 'On-Device Voiceprint & Eyes-Free Haptics',
    oldSpec: 'No speaker identity gate or blind accessibility layer',
    verified2026:
      '@picovoice/eagle-react-native + expo-haptics + expo-secure-store + AccessibilityInfo',
    impact: 'Security',
    summary:
      'Enrolls User A voiceprint locally in 3 spoken steps (bound to wallet pubkey in expo-secure-store) and verifies speaker identity in ~15ms on-device before exposing balances or transfers. Pairs with expo-haptics milestone pulses and AccessibilityInfo TalkBack announcements.',
    installCmd:
      'npx expo install expo-haptics expo-secure-store\nnpm install @picovoice/eagle-react-native',
    snippetKit: `import { AccessibilityInfo } from 'react-native';
import * as Haptics from 'expo-haptics';
import { EagleProfiler } from '@picovoice/eagle-react-native';

// Guided milestone feedback for blind users during 0% -> 100% enrollment
const announceMilestone = (pct: number) => {
  if (pct >= 100) {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  } else {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }
  AccessibilityInfo.announceForAccessibility(\`Sidik suara \${Math.round(pct)} persen terekam.\`);
};`,
  },
  {
    id: 'audio',
    layer: 'Expo Audio Recording & Playback',
    oldSpec: 'expo-av (Audio.Recording & Audio.Sound)',
    verified2026: 'expo-audio (useAudioRecorder & useAudioPlayer)',
    impact: 'Breaking',
    summary:
      'expo-av has been deprecated and removed in modern Expo SDK. expo-audio replaces it with React lifecycle hooks that eliminate manual unloadAsync() memory leaks.',
    installCmd: 'npx expo install expo-audio',
    snippetKit: `import {
  useAudioRecorder,
  useAudioPlayer,
  RecordingPresets,
  requestRecordingPermissionsAsync,
} from 'expo-audio';

const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);

const startRecording = async () => {
  const { granted } = await requestRecordingPermissionsAsync();
  if (!granted) return;
  await recorder.prepareToRecordAsync();
  recorder.record();
};

const stopRecording = async () => {
  await recorder.stop();
  return recorder.uri; // send to api-proxy/stt
};`,
  },
  {
    id: 'elevenlabs',
    layer: 'ElevenLabs STT, TTS & CLI',
    oldSpec: 'scribe_v1 + eleven_multilingual_v2 + client-side API key',
    verified2026:
      'scribe_v2 (with contact + nav keyterm_prompt) + eleven_flash_v2_5 (~100ms) + @elevenlabs/elevenlabs-js',
    impact: 'Latency',
    summary:
      'scribe_v1 is deprecated. Upgrading to scribe_v2 unlocks keyterm_prompt (biasing ASR toward Ahmad, Budi, buka kontak, cek saldo, USDC) while eleven_flash_v2_5 drops TTS wait from ~1000ms to ~100ms so spoken navbar narration feels instant.',
    installCmd:
      'npx -y @elevenlabs/cli@latest onboard init\nnpx skills add elevenlabs/skills\nnpm install @elevenlabs/elevenlabs-js',
    snippetKit: `// Server proxy: api-proxy/api/stt.ts
const formData = new FormData();
formData.append('file', audioFile, 'recording.m4a');
formData.append('model_id', 'scribe_v2');
formData.append('tag_audio_events', 'false');
['USDC', 'Solana', 'buka kontak', 'cek saldo', ...contactNames].forEach((k) =>
  formData.append('keyterm_prompt', k)
);

// Server proxy: api-proxy/api/tts.ts (100ms low latency for Eyes-Free narration)
body: JSON.stringify({
  text: 'Berhasil. Kamu mengirim 5 USDC ke Ahmad.',
  model_id: 'eleven_flash_v2_5',
  voice_settings: { stability: 0.72, similarity_boost: 0.78 },
})`,
  },
  {
    id: 'token',
    layer: 'Solana SPL Token Transfer',
    oldSpec: '@solana/spl-token createTransferInstruction (unchecked) + BN',
    verified2026:
      '@solana-program/token getTransferCheckedInstruction (BigInt, decimals: 6)',
    impact: 'Security',
    summary:
      'TransferChecked enforces mint and decimal validation on-chain. Using BigInt(Math.round(amount * 1_000_000)) removes floating-point drift and matches @solana/kit natively.',
    installCmd: 'npm install @solana/kit @solana-program/token',
    snippetKit: `import {
  TOKEN_PROGRAM_ADDRESS,
  getTransferCheckedInstruction,
  findAssociatedTokenPda,
} from '@solana-program/token';
import { address } from '@solana/kit';

const USDC_MINT_DEVNET = address('4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU');
const rawAmount = BigInt(Math.round(amountUsdc * 1_000_000));

const ix = getTransferCheckedInstruction({
  source: senderAta,
  mint: USDC_MINT_DEVNET,
  destination: recipientAta,
  authority: senderSigner,
  amount: rawAmount,
  decimals: 6,
});`,
    snippetWeb3v1: `import {
  createTransferCheckedInstruction,
  getAssociatedTokenAddressSync,
} from '@solana/spl-token';
import { PublicKey } from '@solana/web3.js';

const USDC_MINT = new PublicKey('4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU');
const rawAmount = BigInt(Math.round(amountUsdc * 1_000_000));

const ix = createTransferCheckedInstruction(
  senderAta, USDC_MINT, recipientAta, senderPubkey, rawAmount, 6
);`,
  },
  {
    id: 'anchor',
    layer: 'Anchor CLI & ContactRegistry Client',
    oldSpec: '@coral-xyz/anchor + case-sensitive PDA seeds',
    verified2026:
      'avm latest + @anchor-lang/core + Codama client + lowercase PDA normalization',
    impact: 'Breaking',
    summary:
      '@coral-xyz/anchor stopped at 0.32.1 (web3.js v1). Modern Anchor uses @anchor-lang/core and pairs with Codama for @solana/kit frontends. Lowercase PDA normalization guarantees voice transcripts always resolve deterministically and gives blind users recoverable on-chain contacts.',
    installCmd:
      'cargo install --git https://github.com/coral-xyz/anchor avm --locked --force\navm install latest && avm use latest',
    snippetKit: `// Rust PDA seeds (normalized lowercase so "Ahmad" === "ahmad")
#[account(
  init,
  payer = owner,
  space = 8 + 32 + (4 + 50) + (4 + 50) + 32 + 8 + 1,
  seeds = [b"contact", owner.key().as_ref(), normalized_name.as_bytes()],
  bump
)]
pub contact_record: Account<'info, ContactRecord>;`,
    snippetWeb3v1: `// Anchor 0.32.2+ / 1.x TypeScript import
import { Program, AnchorProvider } from '@anchor-lang/core';

const normalized = name.trim().toLowerCase();
const [pda] = PublicKey.findProgramAddressSync(
  [Buffer.from('contact'), owner.toBuffer(), Buffer.from(normalized)],
  PROGRAM_ID
);`,
  },
  {
    id: 'proxy',
    layer: 'API Key & Mobile Security Boundary',
    oldSpec: 'process.env.ELEVENLABS_API_KEY inside Expo mobile/lib/',
    verified2026: 'Thin Serverless API Proxy (api-proxy/api/stt, intent, tts)',
    impact: 'Security',
    summary:
      'In Expo, non-EXPO_PUBLIC env vars are undefined on device, and EXPO_PUBLIC vars are baked into the APK in plaintext. A 3-route proxy keeps secrets server-side and supports @elevenlabs/elevenlabs-js cleanly.',
    installCmd: 'mkdir -p api-proxy/api  # Deploy free on Vercel in 30 seconds',
    snippetKit: `// Mobile calls your proxy with zero exposed keys:
const res = await fetch(\`\${process.env.EXPO_PUBLIC_API_PROXY_URL}/api/intent\`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ transcript }),
});
const intent = await res.json();`,
  },
];

export const INITIAL_SPRINT_TASKS: SprintTask[] = [
  {
    id: 'sp-1',
    phase: 'Phase 1: Env & MWA',
    dayTarget: 'Nov 19–20',
    title: 'Audit all 7 SDKs & update bicara-docs for Eyes-Free + Voiceprint 2FA',
    exitCriteria: 'CLAUDE.md, PROGRESS.md, and docs/* reflect 2026 APIs + Blind Mode specs',
    defaultDone: true,
  },
  {
    id: 'sp-2',
    phase: 'Phase 1: Env & MWA',
    dayTarget: 'Nov 19–20',
    title: 'Scaffold Expo Custom Dev Build + polyfills + expo-haptics',
    exitCriteria: 'npx expo run:android launches cleanly on physical Android/Seeker device',
  },
  {
    id: 'sp-3',
    phase: 'Phase 1: Env & MWA',
    dayTarget: 'Nov 20',
    title: 'Verify MWA authorize({ chain: "solana:devnet" }) & auth_token cache',
    exitCriteria: 'Wallet address persists in UI without re-prompting on second tap',
  },
  {
    id: 'sp-4',
    phase: 'Phase 2: Voice & Blind UX',
    dayTarget: 'Nov 21',
    title: 'Deploy 3-route api-proxy (scribe_v2 + unified NLU + eleven_flash_v2_5)',
    exitCriteria: 'curl test to /api/stt and /api/tts succeeds with <150ms TTS latency',
  },
  {
    id: 'sp-5',
    phase: 'Phase 2: Voice & Blind UX',
    dayTarget: 'Nov 21–22',
    title: 'Build Tap-Anywhere Eyes-Free Canvas + Spoken Navbar (Home, Contacts, History)',
    exitCriteria: 'Voice commands "Buka kontak", "Cek saldo", "Buka riwayat" switch & narrate aloud',
  },
  {
    id: 'sp-6',
    phase: 'Phase 2: Voice & Blind UX',
    dayTarget: 'Nov 22–23',
    title: 'Implement Voice-Guided Onboarding + @picovoice/eagle-react-native Voiceprint',
    exitCriteria: '3-step spoken enrollment hits 100%, binds User A to wallet, rejects unknown voice',
  },
  {
    id: 'sp-7',
    phase: 'Phase 3: Solana Tx',
    dayTarget: 'Nov 23',
    title: 'Read live Devnet USDC balance & resolve contacts from Supabase',
    exitCriteria: 'Spoken balance readout matches wallet; fuzzy lookup resolves Ahmad wallet',
  },
  {
    id: 'sp-8',
    phase: 'Phase 3: Solana Tx',
    dayTarget: 'Nov 24',
    title: 'Build TransferChecked (6 decimals) + voice "Ya" confirm + MWA Seed Vault sign',
    exitCriteria: '5.00 USDC arrives in Phone B wallet and confirms on Solana Explorer Devnet',
  },
  {
    id: 'sp-9',
    phase: 'Phase 4: E2E & Polish',
    dayTarget: 'Nov 24',
    title: 'Add Screen Curtain (Blind Demo Mode) + 4 haptic pulse cues + backup RPC',
    exitCriteria: 'Full payment completes cleanly while Screen Curtain hides visual screen',
  },
  {
    id: 'sp-10',
    phase: 'Phase 5: Anchor PDA',
    dayTarget: 'Nov 25',
    title: 'Deploy ContactRegistry via avm/anchor with lowercase PDA seeds',
    exitCriteria: 'anchor test green, Devnet Program ID pasted into config.ts, mobile reads PDA',
  },
  {
    id: 'sp-11',
    phase: 'Phase 4: E2E & Polish',
    dayTarget: 'Nov 26',
    title: 'Rehearse 45-second Screen Curtain two-phone demo + record backup video',
    exitCriteria: '3 consecutive zero-error dry runs completed before Hackathon kickoff Nov 27',
  },
];

export const DEMO_SCRIPT_STEPS: DemoStep[] = [
  {
    step: 1,
    secondMark: '00–06s',
    action: 'Hold up Phone A (Bicara) & Phone B (Ahmad wallet)',
    spokenLine:
      '"285 juta penyandang tunanetra tidak bisa menyalin alamat wallet 44 karakter. Ini Bicara."',
    judgeSignal: 'Instant emotional hook: real human accessibility barrier solved natively on Solana Mobile.',
  },
  {
    step: 2,
    secondMark: '06–12s',
    action: 'Turn ON Screen Curtain (layar gelap!) → Tap anywhere → "Cek saldo"',
    spokenLine: 'App speaks (~100ms): "Saldo kamu 25 USDC." (Voiceprint User A: 94% verified)',
    judgeSignal: 'Proves zero-vision usability + on-device Voiceprint owner verification.',
  },
  {
    step: 3,
    secondMark: '12–20s',
    action: 'Tap anywhere on dark screen → Say: "Kirim 5 dolar ke Ahmad"',
    spokenLine: 'Double haptic + App speaks: "Konfirmasi: kirim 5 USDC ke Ahmad? Ucapkan ya."',
    judgeSignal: 'Shows safety discipline: never auto-sends, announces exact recipient & amount.',
  },
  {
    step: 4,
    secondMark: '20–30s',
    action: 'Say: "Ya" → 1-tap MWA Seed Vault hardware biometric confirmation',
    spokenLine: 'MWA signs TransferChecked (5,000,000 raw units, 6 decimals)',
    judgeSignal: 'Two-factor defense: Voiceprint Factor 1 + Seeker Seed Vault Factor 2 blocks voice spoofing.',
  },
  {
    step: 5,
    secondMark: '30–38s',
    action: 'Long success haptic + Phone B balance jumps +5.00 USDC live',
    spokenLine: 'App speaks: "Berhasil. Kamu mengirim 5 USDC ke Ahmad."',
    judgeSignal: 'Closes the entire ElevenLabs voice loop with live on-chain settlement.',
  },
  {
    step: 6,
    secondMark: '38–45s',
    action: 'Say: "Buka riwayat" → App narrates latest tx + shows Solana Explorer proof',
    spokenLine: '"Navigasi suara penuh, tercatat on-chain di Solana dalam kurang dari 7 detik."',
    judgeSignal: 'Full voice navigation + verifiable Explorer & ContactRegistry PDA proof.',
  },
];

export const EMERGENCY_FALLBACKS: EmergencyFallback[] = [
  {
    scenario: 'Noisy Demo Hall / Mic Issue',
    symptom: 'Background crowd interferes with live microphone capture',
    mitigation: 'Trigger pre-loaded voice utterance or use the built-in degraded command input bar.',
  },
  {
    scenario: 'Voiceprint False Reject in Loud Room',
    symptom: 'Heavy ambient noise lowers Eagle score below 0.75 during live demo',
    mitigation: 'Lower demo threshold slightly or fall back immediately to MWA Seed Vault biometric unlock.',
  },
  {
    scenario: 'ElevenLabs STT/TTS Rate Limit',
    symptom: 'API latency > 4s or 429 during judging window',
    mitigation: 'UI displays transcript immediately and falls back to native OS speech synthesis / visual cards.',
  },
  {
    scenario: 'Public Devnet RPC Congestion',
    symptom: 'api.devnet.solana.com times out during blockhash fetch',
    mitigation: 'Automatic failover to EXPO_PUBLIC_SOLANA_BACKUP_RPC_URL (Helius / QuickNode free tier).',
  },
];
