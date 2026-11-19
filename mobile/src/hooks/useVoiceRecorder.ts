import { useCallback, useState } from 'react';
import {
  AudioModule,
  RecordingPresets,
  setAudioModeAsync,
  useAudioRecorder,
} from 'expo-audio';
import { triggerHaptic } from '../services/haptics';

export interface VoiceRecorderState {
  isRecording: boolean;
  lastRecordingUri: string | null;
  error: string | null;
  startRecording: () => Promise<boolean>;
  stopRecording: () => Promise<string | null>;
}

/**
 * Modern expo-audio recording hook (replaces deprecated expo-av).
 * Captures high-quality .m4a utterances for /api/stt (ElevenLabs scribe_v2).
 */
export function useVoiceRecorder(): VoiceRecorderState {
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const [isRecording, setIsRecording] = useState(false);
  const [lastRecordingUri, setLastRecordingUri] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const startRecording = useCallback(async () => {
    setError(null);
    try {
      const perm = await AudioModule.requestRecordingPermissionsAsync();
      if (!perm.granted) {
        setError('Izin mikrofon ditolak. Aktifkan izin mikrofon Bicara di pengaturan Android.');
        await triggerHaptic('error');
        return false;
      }

      await setAudioModeAsync({
        allowsRecording: true,
        playsInSilentMode: true,
      });

      await recorder.prepareToRecordAsync();
      recorder.record();
      setIsRecording(true);
      await triggerHaptic('listen');
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Gagal memulai rekaman audio.';
      setError(message);
      await triggerHaptic('error');
      return false;
    }
  }, [recorder]);

  const stopRecording = useCallback(async () => {
    try {
      await recorder.stop();
      setIsRecording(false);
      await triggerHaptic('tick');
      const uri = recorder.uri ?? null;
      setLastRecordingUri(uri);
      return uri;
    } catch (err) {
      setIsRecording(false);
      setError(err instanceof Error ? err.message : 'Gagal menghentikan rekaman audio.');
      return null;
    }
  }, [recorder]);

  return {
    isRecording,
    lastRecordingUri,
    error,
    startRecording,
    stopRecording,
  };
}
