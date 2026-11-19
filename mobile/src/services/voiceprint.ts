import * as SecureStore from 'expo-secure-store';

export const VOICEPRINT_PROFILE_KEY = 'bicara_eagle_voiceprint_v1';
export const VOICEPRINT_THRESHOLD = 0.75;

export interface VoiceprintMetadata {
  enrolled: boolean;
  boundWallet: string | null;
  enrolledAt: string | null;
  engine: 'picovoice-eagle' | 'pending-step-3';
}

const SAFE_ACCESSIBILITY_ACTIONS = new Set(['help', 'repeat']);

export async function getStoredVoiceprintMetadata(): Promise<VoiceprintMetadata> {
  try {
    const raw = await SecureStore.getItemAsync(VOICEPRINT_PROFILE_KEY);
    if (!raw) {
      return {
        enrolled: false,
        boundWallet: null,
        enrolledAt: null,
        engine: 'pending-step-3',
      };
    }
    return JSON.parse(raw) as VoiceprintMetadata;
  } catch {
    return {
      enrolled: false,
      boundWallet: null,
      enrolledAt: null,
      engine: 'pending-step-3',
    };
  }
}

export async function saveVoiceprintMetadata(meta: VoiceprintMetadata): Promise<void> {
  await SecureStore.setItemAsync(VOICEPRINT_PROFILE_KEY, JSON.stringify(meta));
}

/**
 * Factor 1 Voiceprint Gate contract (wired to @picovoice/eagle-react-native in Step 3).
 * Safe guidance actions (help/repeat) always remain open for blind users.
 * Factor 2 (MWA Phantom/Solflare/Seed Vault biometric) is ALWAYS required to sign transfers.
 */
export function evaluateVoiceprintScore(score: number, action: string): {
  allowed: boolean;
  bypassed: boolean;
  scorePct: number;
} {
  if (SAFE_ACCESSIBILITY_ACTIONS.has(action)) {
    return { allowed: true, bypassed: true, scorePct: Math.round(score * 100) };
  }
  return {
    allowed: score >= VOICEPRINT_THRESHOLD,
    bypassed: false,
    scorePct: Math.round(score * 100),
  };
}
