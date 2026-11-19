import * as Haptics from 'expo-haptics';

export type HapticPatternId = 'listen' | 'tick' | 'confirm' | 'success' | 'error';

export interface HapticEvent {
  pattern: HapticPatternId;
  label: string;
  apiCall: string;
  timestamp: number;
}

export const HAPTIC_META: Record<HapticPatternId, { label: string; apiCall: string }> = {
  listen: {
    label: 'Single Pulse · Listening',
    apiCall: 'Haptics.impactAsync(Medium)',
  },
  tick: {
    label: 'Soft Tick · Nav / Milestone',
    apiCall: 'Haptics.impactAsync(Light)',
  },
  confirm: {
    label: 'Double Pulse · Confirm Required',
    apiCall: 'Haptics.notificationAsync(Warning)',
  },
  success: {
    label: 'Long Pulse · Confirmed',
    apiCall: 'Haptics.notificationAsync(Success)',
  },
  error: {
    label: 'Triple Pulse · Blocked / Error',
    apiCall: 'Haptics.notificationAsync(Error)',
  },
};

type HapticListener = (event: HapticEvent) => void;
const listeners = new Set<HapticListener>();

export function subscribeHaptics(listener: HapticListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Fires distinct physical Android vibration codes for blind/eyes-free accessibility.
 * Also notifies subscribed debug HUD listeners so scrcpy demo viewers see tactile cues.
 */
export async function triggerHaptic(pattern: HapticPatternId): Promise<void> {
  const meta = HAPTIC_META[pattern];
  const event: HapticEvent = {
    pattern,
    label: meta.label,
    apiCall: meta.apiCall,
    timestamp: Date.now(),
  };
  listeners.forEach((fn) => fn(event));

  try {
    switch (pattern) {
      case 'listen':
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        break;
      case 'tick':
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        break;
      case 'confirm':
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        await delay(140);
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        break;
      case 'success':
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        break;
      case 'error':
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        await delay(110);
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        await delay(110);
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        break;
    }
  } catch {
    // Graceful no-op on devices with vibration disabled
  }
}
