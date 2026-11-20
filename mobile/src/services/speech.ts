import { AccessibilityInfo } from 'react-native';
import { createAudioPlayer, type AudioPlayer, type AudioStatus } from 'expo-audio';
import * as Speech from 'expo-speech';
import { API_BASE_URL } from './api';
import { triggerHaptic, type HapticPatternId } from './haptics';

export interface SpeechTelemetry {
  engine: 'eleven_flash_v2_5' | 'expo-speech';
  latencyMs: number;
  text: string;
  timestamp: number;
}

type SpeechListener = (evt: SpeechTelemetry) => void;
const listeners = new Set<SpeechListener>();

let activePlayer: AudioPlayer | null = null;
let activeSub: { remove: () => void } | null = null;
let activeFallbackTimer: ReturnType<typeof setTimeout> | null = null;

export function subscribeSpeech(listener: SpeechListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function emitTelemetry(evt: SpeechTelemetry): void {
  listeners.forEach((fn) => fn(evt));
}

function cleanupPlayer(): void {
  if (activeFallbackTimer) {
    clearTimeout(activeFallbackTimer);
    activeFallbackTimer = null;
  }
  if (activeSub) {
    try {
      activeSub.remove();
    } catch {
      // ignore
    }
    activeSub = null;
  }
  if (activePlayer) {
    try {
      activePlayer.pause();
      activePlayer.release();
    } catch {
      // ignore
    }
    activePlayer = null;
  }
}

async function speakOfflineFallback(cleaned: string, startedAt: number): Promise<void> {
  try {
    await Speech.stop();
    Speech.speak(cleaned, {
      language: 'en-US',
      rate: 0.96,
      pitch: 1.0,
    });
    emitTelemetry({
      engine: 'expo-speech',
      latencyMs: Date.now() - startedAt,
      text: cleaned,
      timestamp: Date.now(),
    });
  } catch {
    // Speech engine unavailable
  }
}

/**
 * Zero-Silent-Screen speech announcer for eyes-free verification.
 * Always announces to Android TalkBack, plays low-latency ElevenLabs `eleven_flash_v2_5`
 * via /api/tts when enabled (measuring true on-device time-to-first-audio in ms),
 * and automatically falls back to on-device `expo-speech` (en-US) so users never hit silence.
 */
export async function speakEyesFree(
  text: string,
  haptic?: HapticPatternId,
  options?: { preferElevenLabs?: boolean }
): Promise<void> {
  const cleaned = text.trim();
  if (!cleaned) return;

  const startedAt = Date.now();
  const useElevenLabs = options?.preferElevenLabs ?? false;

  if (haptic) {
    void triggerHaptic(haptic);
  }

  try {
    AccessibilityInfo.announceForAccessibility(cleaned);
  } catch {
    // TalkBack inactive or unavailable
  }

  cleanupPlayer();
  try {
    await Speech.stop();
  } catch {
    // ignore
  }

  if (!useElevenLabs || cleaned.length > 550) {
    await speakOfflineFallback(cleaned, startedAt);
    return;
  }

  try {
    const uri = `${API_BASE_URL}/api/tts?text=${encodeURIComponent(cleaned)}&t=${startedAt}`;
    const player = createAudioPlayer({ uri });
    activePlayer = player;
    let playbackStarted = false;

    activeFallbackTimer = setTimeout(() => {
      if (!playbackStarted) {
        cleanupPlayer();
        void speakOfflineFallback(cleaned, startedAt);
      }
    }, 3500);

    activeSub = player.addListener('playbackStatusUpdate', (status: AudioStatus) => {
      if (status.isPlaying && !playbackStarted) {
        playbackStarted = true;
        if (activeFallbackTimer) {
          clearTimeout(activeFallbackTimer);
          activeFallbackTimer = null;
        }
        emitTelemetry({
          engine: 'eleven_flash_v2_5',
          latencyMs: Date.now() - startedAt,
          text: cleaned,
          timestamp: Date.now(),
        });
      }
      if (status.didJustFinish) {
        cleanupPlayer();
      }
    });

    player.play();
  } catch {
    cleanupPlayer();
    await speakOfflineFallback(cleaned, startedAt);
  }
}

export async function stopSpeaking(): Promise<void> {
  cleanupPlayer();
  try {
    await Speech.stop();
  } catch {
    // ignore
  }
}
