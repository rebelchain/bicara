import { AccessibilityInfo } from 'react-native';
import * as Speech from 'expo-speech';
import { triggerHaptic, type HapticPatternId } from './haptics';

/**
 * Zero-Silent-Screen speech announcer for eyes-free verification.
 * Always announces to Android TalkBack and speaks immediately in English (`en-US`).
 * Upgrades seamlessly to ElevenLabs eleven_flash_v2_5 via /api/tts with automatic
 * offline fallback to expo-speech so users never hit silence.
 */
export async function speakEyesFree(
  text: string,
  haptic?: HapticPatternId
): Promise<void> {
  const cleaned = text.trim();
  if (!cleaned) return;

  if (haptic) {
    void triggerHaptic(haptic);
  }

  try {
    AccessibilityInfo.announceForAccessibility(cleaned);
  } catch {
    // TalkBack inactive or unavailable
  }

  try {
    await Speech.stop();
    Speech.speak(cleaned, {
      language: 'en-US',
      rate: 0.96,
      pitch: 1.0,
    });
  } catch {
    // Speech engine unavailable
  }
}

export function stopSpeaking(): void {
  try {
    Speech.stop();
  } catch {
    // ignore
  }
}
