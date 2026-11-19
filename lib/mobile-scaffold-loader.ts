import fs from 'node:fs/promises';
import path from 'node:path';

export type MobileFileCategory =
  | 'Boot & Config'
  | 'Eyes-Free & Audio'
  | 'Solana MWA'
  | 'Screens';

export interface MobileScaffoldFile {
  id: string;
  label: string;
  relativePath: string;
  category: MobileFileCategory;
  stepTag: string;
  purpose: string;
  content: string;
}

const MOBILE_MANIFEST: Array<Omit<MobileScaffoldFile, 'content'>> = [
  {
    id: 'index',
    label: 'index.js',
    relativePath: 'mobile/index.js',
    category: 'Boot & Config',
    stepTag: 'Step 1',
    purpose: 'Strict boot entry: loads polyfill.js on line 1 before expo-router/entry.',
  },
  {
    id: 'polyfill',
    label: 'polyfill.js',
    relativePath: 'mobile/polyfill.js',
    category: 'Boot & Config',
    stepTag: 'Step 1',
    purpose: 'Installs react-native-get-random-values and react-native-quick-crypto on Hermes.',
  },
  {
    id: 'package',
    label: 'package.json',
    relativePath: 'mobile/package.json',
    category: 'Boot & Config',
    stepTag: 'Step 1',
    purpose: 'Expo Custom Dev Build Track A dependencies (@solana/kit, wallet-ui, haptics, expo-audio).',
  },
  {
    id: 'app-json',
    label: 'app.json',
    relativePath: 'mobile/app.json',
    category: 'Boot & Config',
    stepTag: 'Step 1',
    purpose: 'Android RECORD_AUDIO + VIBRATE permissions, expo-audio and expo-secure-store plugins.',
  },
  {
    id: 'env-example',
    label: '.env.example',
    relativePath: 'mobile/.env.example',
    category: 'Boot & Config',
    stepTag: 'Step 1',
    purpose: 'USB adb reverse API URL (http://localhost:3000), Devnet RPC, Supabase, and Step 3 Eagle key.',
  },
  {
    id: 'haptics',
    label: 'src/services/haptics.ts',
    relativePath: 'mobile/src/services/haptics.ts',
    category: 'Eyes-Free & Audio',
    stepTag: 'Step 1',
    purpose: 'Physical Android expo-haptics 4-code accessibility engine + scrcpy listener.',
  },
  {
    id: 'speech',
    label: 'src/services/speech.ts',
    relativePath: 'mobile/src/services/speech.ts',
    category: 'Eyes-Free & Audio',
    stepTag: 'Step 1',
    purpose: 'Zero-Silent-Screen Indonesian speech + TalkBack AccessibilityInfo announcer.',
  },
  {
    id: 'recorder',
    label: 'src/hooks/useVoiceRecorder.ts',
    relativePath: 'mobile/src/hooks/useVoiceRecorder.ts',
    category: 'Eyes-Free & Audio',
    stepTag: 'Step 1',
    purpose: 'Modern expo-audio RecordingPresets.HIGH_QUALITY hook replacing deprecated expo-av.',
  },
  {
    id: 'voiceprint',
    label: 'src/services/voiceprint.ts',
    relativePath: 'mobile/src/services/voiceprint.ts',
    category: 'Eyes-Free & Audio',
    stepTag: 'Step 3 Ready',
    purpose: 'Factor 1 speaker gate & expo-secure-store metadata contract for Picovoice Eagle.',
  },
  {
    id: 'solana',
    label: 'src/services/solana.ts',
    relativePath: 'mobile/src/services/solana.ts',
    category: 'Solana MWA',
    stepTag: 'Step 1–4',
    purpose: 'Track A @solana/kit + @solana-program/token TransferChecked BigInt helper + PDA normalizer.',
  },
  {
    id: 'api',
    label: 'src/services/api.ts',
    relativePath: 'mobile/src/services/api.ts',
    category: 'Solana MWA',
    stepTag: 'Step 1',
    purpose: 'Thin HTTP client connecting HP USB via adb reverse to /api/health, /api/stt, and /api/intent.',
  },
  {
    id: 'root-layout',
    label: 'app/_layout.tsx',
    relativePath: 'mobile/app/_layout.tsx',
    category: 'Screens',
    stepTag: 'Step 1',
    purpose: 'Wraps app tree in @wallet-ui/react-native-kit MobileWalletProvider (solana:devnet).',
  },
  {
    id: 'tabs-layout',
    label: 'app/(tabs)/_layout.tsx',
    relativePath: 'mobile/app/(tabs)/_layout.tsx',
    category: 'Screens',
    stepTag: 'Step 1',
    purpose: 'Spoken Bottom Tab Navigator firing Soft Tick + Indonesian narration on every tab switch.',
  },
  {
    id: 'home-screen',
    label: 'app/(tabs)/index.tsx',
    relativePath: 'mobile/app/(tabs)/index.tsx',
    category: 'Screens',
    stepTag: 'Step 1',
    purpose: 'Eyes-Free Tap-Anywhere Home with MWA Connect, physical haptics test, and /api/health check.',
  },
  {
    id: 'contacts-screen',
    label: 'app/(tabs)/contacts.tsx',
    relativePath: 'mobile/app/(tabs)/contacts.tsx',
    category: 'Screens',
    stepTag: 'Step 2 Ready',
    purpose: 'Spoken Contacts shell prepared for Step 2 Supabase and Step 4 Anchor ContactRegistry PDA.',
  },
  {
    id: 'history-screen',
    label: 'app/(tabs)/history.tsx',
    relativePath: 'mobile/app/(tabs)/history.tsx',
    category: 'Screens',
    stepTag: 'Step 3 Ready',
    purpose: 'Spoken History shell prepared for Step 3 Solana Devnet transaction signatures.',
  },
  {
    id: 'readme',
    label: 'README.md',
    relativePath: 'mobile/README.md',
    category: 'Boot & Config',
    stepTag: 'Step 1',
    purpose: 'Physical Android USB quickstart commands and Step 1 hardware verification checklist.',
  },
];

export async function loadMobileScaffoldFiles(): Promise<MobileScaffoldFile[]> {
  const root = process.cwd();
  return Promise.all(
    MOBILE_MANIFEST.map(async (item) => {
      const fullPath = path.join(root, item.relativePath);
      try {
        const content = await fs.readFile(fullPath, 'utf-8');
        return { ...item, content };
      } catch {
        return {
          ...item,
          content: `// File not found at ${item.relativePath}`,
        };
      }
    })
  );
}
