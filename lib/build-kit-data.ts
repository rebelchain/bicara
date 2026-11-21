export interface UsbSetupStep {
  id: string;
  stepNum: string;
  title: string;
  detail: string;
  commandUsb: string;
  commandWireless?: string;
}

export interface BuildScopeItem {
  id: string;
  title: string;
  bucket: 'before' | 'hackathon' | 'roadmap';
  stageLabel: string;
  status: 'Gate A PASS' | 'Gate B Next' | 'Hackathon Window' | 'Post-Hackathon';
  detail: string;
  verification: string;
}

export const USB_SETUP_STEPS: UsbSetupStep[] = [
  {
    id: 'usb-prereq',
    stepNum: '01',
    title: 'Verify JDK 17, Node 20+, and Android Platform-Tools (No Emulator Needed)',
    detail:
      'Physical Android hardware testing avoids heavy emulators and exposes real MWA intents, microphone capture, and physical vibration motors.',
    commandUsb: 'java -version && adb version && node -v',
  },
  {
    id: 'usb-connect',
    stepNum: '02',
    title: 'Connect Physical Android Phone via USB Debugging',
    detail:
      'Enable Settings -> Developer Options -> USB Debugging on your Android phone (verified on OPPO CPH2631 Android 16) and accept the RSA prompt.',
    commandUsb: 'adb devices',
  },
  {
    id: 'usb-reverse',
    stepNum: '03',
    title: 'Bridge Next.js Voice & Quote Proxy + Metro Over USB',
    detail:
      'adb reverse maps http://localhost:3000 directly to your laptop Next.js proxy (/api/stt, /api/intent, /api/tts, /api/swap/quote, /api/prices) with zero LAN firewall friction.',
    commandUsb: 'adb reverse tcp:3000 tcp:3000 && adb reverse tcp:8081 tcp:8081',
    commandWireless:
      '# Wireless presentation fallback: point mobile/.env to your deployed HTTPS proxy URL\nEXPO_PUBLIC_API_BASE_URL=https://your-bicara-proxy.example.com',
  },
  {
    id: 'usb-supabase',
    stepNum: '04',
    title: 'Gate B: Apply Supabase Schema & Configure mobile/.env',
    detail:
      'Paste supabase/schema.sql into Supabase SQL Editor and add EXPO_PUBLIC_SUPABASE_URL + EXPO_PUBLIC_SUPABASE_ANON_KEY to mobile/.env (falls back to AsyncStorage cleanly if omitted).',
    commandUsb: 'cd mobile && cp .env.example .env',
  },
  {
    id: 'usb-wallet',
    stepNum: '05',
    title: 'Configure Solflare or Phantom in Solana Devnet Mode',
    detail:
      'Enable Testnet/Devnet Mode inside Solflare or Phantom on the phone and ensure you have Devnet SOL (and optional Circle Devnet USDC) for live Gate B transfers.',
    commandUsb: 'solana airdrop 1 <YOUR_PHONE_DEVNET_ADDRESS> --url devnet',
  },
  {
    id: 'usb-run',
    stepNum: '06',
    title: 'Boot Custom Dev Client (or Reload JS in 1 Second)',
    detail:
      'Gate B is 100% pure JS — if your Custom Dev Client APK is already installed on OPPO, just start Metro and press r to reload. For a fresh device, compile once with expo run:android.',
    commandUsb: 'cd mobile && npx expo start --dev-client   # First install: npx expo run:android',
  },
];

export const BUILD_SCOPE_ITEMS: BuildScopeItem[] = [
  {
    id: 'scope-gate-a',
    title: 'Gate A · Hardware Boot, MWA Connect, ElevenLabs STT/TTS & Jupiter Quote-Only',
    bucket: 'before',
    stageLabel: 'Built Before Hackathon (Nov 20)',
    status: 'Gate A PASS',
    detail:
      'Verified live on OPPO CPH2631 (Android 16): polyfill boot, /api/health over USB, Solflare MWA connect, scribe_v2 (760–774ms), eleven_flash_v2_5 (558–732ms warm), and Jupiter V2 Quote-Only (724ms E2E + HTTP 403 scam token block). Optional Eagle Layer 1 formally deferred.',
    verification:
      'All real latencies and honest Solflare popup accessibility findings logged in PROGRESS.md.',
  },
  {
    id: 'scope-gate-b',
    title: 'Gate B · Live Solana Devnet Transfer (SOL + USDC TransferChecked) & Supabase Sync',
    bucket: 'before',
    stageLabel: 'Built Before Hackathon (Nov 23–24)',
    status: 'Gate B Next',
    detail:
      'Pure-JS Solana Devnet transfer builder, ATA rent inspection, Layer 2 random 3-digit challenge, and Supabase + AsyncStorage store are code-complete in /mobile and mirrored 1:1 in the Web Interactive Demo.',
    verification:
      'Next physical step: execute voice transfer on OPPO -> approve in Solflare -> log verified Solana Devnet Explorer signature.',
  },
  {
    id: 'scope-hackathon-window',
    title: 'Hackathon Window · Layer 2–4 Hardening, Self-Voice Red-Team & accessible-signing Extraction',
    bucket: 'hackathon',
    stageLabel: 'Built During Hackathon (Nov 27–29, post hackathon-start)',
    status: 'Hackathon Window',
    detail:
      'Visible in git history after the hackathon-start tag: Layer 3 policy hardening, pre-sign swap re-quote drift check, ethical ElevenLabs self-voice red-team demo, reusable accessible-signing package extraction, and final MIT submission.',
    verification:
      'Clean commit boundary after hackathon-start tag + timed physical demo recording.',
  },
  {
    id: 'roadmap-mainnet',
    title: 'Post-Hackathon · Real Blind-User Validation, Mainnet Audit & Seeker dApp Store',
    bucket: 'roadmap',
    stageLabel: 'Production Roadmap',
    status: 'Post-Hackathon',
    detail:
      'Expand TalkBack/VoiceOver user studies, perform independent smart contract & proxy security audit, support Seeker Seed Vault hardware attestation, and enable Mainnet-Beta rollout.',
    verification: 'Published user study findings, security audit report, and dApp Store listing.',
  },
];
