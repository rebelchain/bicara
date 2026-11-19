import fs from 'node:fs/promises';
import path from 'node:path';

export interface BicaraDocFile {
  id: string;
  filename: string;
  relativePath: string;
  category: 'Root' | 'Specs';
  summary: string;
  content: string;
}

const DOC_MANIFEST: Array<Omit<BicaraDocFile, 'content'>> = [
  {
    id: 'claude',
    filename: 'CLAUDE.md',
    relativePath: 'bicara-docs/CLAUDE.md',
    category: 'Root',
    summary: 'Single source of truth, verified 2026 SDK tracks, 9-step core flow, hardcoded rules, and Key APIs.',
  },
  {
    id: 'progress',
    filename: 'PROGRESS.md',
    relativePath: 'bicara-docs/PROGRESS.md',
    category: 'Root',
    summary: '10-day pre-hackathon prototype plan, 72-hour hackathon execution schedule, and SDK matrix.',
  },
  {
    id: 'architecture',
    filename: 'ARCHITECTURE.md',
    relativePath: 'bicara-docs/docs/ARCHITECTURE.md',
    category: 'Specs',
    summary: 'Full topology with API Proxy boundary, hybrid Supabase + Anchor PDA resolution, and error matrix.',
  },
  {
    id: 'voice',
    filename: 'VOICE_SPEC.md',
    relativePath: 'bicara-docs/docs/VOICE_SPEC.md',
    category: 'Specs',
    summary: 'expo-audio capture, ElevenLabs scribe_v2 keyterm_prompt, eleven_flash_v2_5 TTS, and NLU schema.',
  },
  {
    id: 'mobile',
    filename: 'MOBILE_SPEC.md',
    relativePath: 'bicara-docs/docs/MOBILE_SPEC.md',
    category: 'Specs',
    summary: 'Expo Custom Dev Client (no Expo Go), MobileWalletProvider setup, 3 tabs, and UI design tokens.',
  },
  {
    id: 'program',
    filename: 'PROGRAM_SPEC.md',
    relativePath: 'bicara-docs/docs/PROGRAM_SPEC.md',
    category: 'Specs',
    summary: 'Anchor ContactRegistry via AVM, @anchor-lang/core + Codama, and lowercase PDA normalization.',
  },
  {
    id: 'project',
    filename: 'PROJECT.md',
    relativePath: 'bicara-docs/docs/PROJECT.md',
    category: 'Specs',
    summary: 'Dev3pack Global Hackathon judge one-pager, problem statement, sponsor touchpoints, and prizes.',
  },
];

export async function loadBicaraDocs(): Promise<BicaraDocFile[]> {
  const root = process.cwd();
  const results = await Promise.all(
    DOC_MANIFEST.map(async (item) => {
      const fullPath = path.join(root, item.relativePath);
      try {
        const content = await fs.readFile(fullPath, 'utf-8');
        return { ...item, content };
      } catch {
        return {
          ...item,
          content: `# ${item.filename}\n\nFile not found at \`${item.relativePath}\`.`,
        };
      }
    })
  );
  return results;
}
