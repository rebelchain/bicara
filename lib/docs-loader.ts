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
    id: 'readme',
    filename: 'README.md',
    relativePath: 'README.md',
    category: 'Root',
    summary:
      'Public judge entry point: Built Before vs. During Hackathon split, OPPO Android 16 Gate A/B/C measurements, honest limitations, and live Devnet quickstart.',
  },
  {
    id: 'claude',
    filename: 'CLAUDE.md',
    relativePath: 'bicara-docs/CLAUDE.md',
    category: 'Root',
    summary:
      'Single source of truth: global accessibility layer pitch, 5-layer security, Quote-Only Swap, hardcoded rules, and TBD demo script.',
  },
  {
    id: 'progress',
    filename: 'PROGRESS.md',
    relativePath: 'bicara-docs/PROGRESS.md',
    category: 'Root',
    summary:
      'Gate A/B/C schedule (Nov 20–29), hardware measurement log, Pivot Log, Open Questions, Risks, and code-sync backlog.',
  },
  {
    id: 'project',
    filename: 'PROJECT.md',
    relativePath: 'bicara-docs/docs/PROJECT.md',
    category: 'Specs',
    summary:
      'Global accessibility pitch, verified WHO 2.2B & SOUPS/arXiv evidence, Prior Art, ElevenLabs highlights, and MIT roadmap.',
  },
  {
    id: 'architecture',
    filename: 'ARCHITECTURE.md',
    relativePath: 'bicara-docs/docs/ARCHITECTURE.md',
    category: 'Specs',
    summary:
      'Reusable accessible-signing module boundary, unified TxSummary flow, Jupiter Swap V2 signing distinction, and English routing.',
  },
  {
    id: 'security-model',
    filename: 'SECURITY_MODEL.md',
    relativePath: 'bicara-docs/docs/SECURITY_MODEL.md',
    category: 'Specs',
    summary:
      'Five-layer "Voice Identifies, Hardware Authorizes" threat model, replay/clone limits, and honest claims vs. non-claims.',
  },
  {
    id: 'red-team-demo',
    filename: 'RED_TEAM_DEMO.md',
    relativePath: 'bicara-docs/docs/RED_TEAM_DEMO.md',
    category: 'Specs',
    summary:
      'Ethical ElevenLabs self-voice clone red-team script, scam-token & transfer attack scenarios, and expected honest outcomes.',
  },
  {
    id: 'hackathon-compliance',
    filename: 'HACKATHON_COMPLIANCE.md',
    relativePath: 'bicara-docs/docs/HACKATHON_COMPLIANCE.md',
    category: 'Specs',
    summary:
      'Dev3pack open-source MIT License plan, hackathon-start tag hygiene, UNVERIFIED organizer TODOs, and pre- vs. during-hackathon split.',
  },
  {
    id: 'mobile',
    filename: 'MOBILE_SPEC.md',
    relativePath: 'bicara-docs/docs/MOBILE_SPEC.md',
    category: 'Specs',
    summary:
      'English locale dictionary requirement, Android-wide MWA (Seeker-only Seed Vault), TxSummary confirm sheet, and gated ladder.',
  },
  {
    id: 'voice',
    filename: 'VOICE_SPEC.md',
    relativePath: 'bicara-docs/docs/VOICE_SPEC.md',
    category: 'Specs',
    summary:
      'English script library, Send & Quote-Only Swap TxSummary templates, dynamic scribe_v2 keyterms limits, and Layer 2 challenge.',
  },
  {
    id: 'program',
    filename: 'PROGRAM_SPEC.md',
    relativePath: 'bicara-docs/docs/PROGRAM_SPEC.md',
    category: 'Specs',
    summary:
      'Gate C Anchor ContactRegistry verified address book, biometric-gated writes, and open non-ASCII seed normalization flag.',
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
