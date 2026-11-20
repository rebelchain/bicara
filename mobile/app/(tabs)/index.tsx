import { useEffect, useState } from 'react';
import {
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useMobileWallet } from '@wallet-ui/react-native-kit';
import { useVoiceRecorder } from '../../src/hooks/useVoiceRecorder';
import {
  API_BASE_URL,
  checkVoiceProxyHealth,
  type ProxyHealthResponse,
} from '../../src/services/api';
import {
  subscribeHaptics,
  triggerHaptic,
  type HapticEvent,
  type HapticPatternId,
} from '../../src/services/haptics';
import { truncateAddress } from '../../src/services/solana';
import { speakEyesFree } from '../../src/services/speech';
import { EN_UI_COPY, EN_VOICE_SCRIPTS } from '../../src/i18n/en';

export default function EyesFreeHomeScreen() {
  const { account, connect, disconnect } = useMobileWallet();
  const recorder = useVoiceRecorder();

  const [lastHaptic, setLastHaptic] = useState<HapticEvent | null>(null);
  const [proxyStatus, setProxyStatus] = useState<ProxyHealthResponse | null>(null);
  const [proxyError, setProxyError] = useState<string | null>(null);
  const [checkingProxy, setCheckingProxy] = useState(false);

  // Zero-Silent-Screen welcome narration on first launch
  useEffect(() => {
    void speakEyesFree(EN_VOICE_SCRIPTS.onboardingWelcome(), 'tick');
  }, []);

  // Live Haptic Telemetry listener (handy when mirroring via scrcpy)
  useEffect(() => {
    return subscribeHaptics((evt) => setLastHaptic(evt));
  }, []);

  const handleWalletPress = async () => {
    try {
      if (account) {
        await disconnect();
        await speakEyesFree(EN_UI_COPY.home.walletDisconnectedSpoken, 'tick');
      } else {
        await triggerHaptic('tick');
        await connect();
        const connectedAddr = account?.address?.toString() ?? '';
        const spoken = connectedAddr
          ? EN_VOICE_SCRIPTS.onboardingWalletReady(connectedAddr.slice(-4))
          : EN_UI_COPY.home.walletConnectedFallbackSpoken;
        await speakEyesFree(spoken, 'success');
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : EN_UI_COPY.home.walletConnectError;
      await speakEyesFree(msg, 'error');
    }
  };

  const handleMicToggle = async () => {
    if (recorder.isRecording) {
      const uri = await recorder.stopRecording();
      await speakEyesFree(
        uri ? EN_UI_COPY.home.recordingSavedSpoken : EN_UI_COPY.home.recordingStoppedSpoken,
        'success'
      );
    } else {
      const started = await recorder.startRecording();
      if (started) {
        await speakEyesFree(EN_UI_COPY.home.listeningSpoken, 'listen');
      }
    }
  };

  const handleTestProxy = async () => {
    setCheckingProxy(true);
    setProxyError(null);
    try {
      const data = await checkVoiceProxyHealth();
      setProxyStatus(data);
      await speakEyesFree(EN_UI_COPY.home.proxyConnectedSpoken, 'success');
    } catch (err) {
      const message =
        err instanceof Error ? err.message : EN_UI_COPY.home.proxyErrorFallback;
      setProxyError(message);
      await speakEyesFree(message, 'error');
    } finally {
      setCheckingProxy(false);
    }
  };

  const walletAddress = account?.address?.toString() ?? null;

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        {/* Top Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.kicker}>{EN_UI_COPY.home.kicker}</Text>
            <Text style={styles.brand}>Bicara</Text>
          </View>
          <Pressable
            onPress={() => void handleWalletPress()}
            accessibilityRole="button"
            accessibilityLabel={
              walletAddress
                ? EN_UI_COPY.home.disconnectWalletA11y
                : EN_UI_COPY.home.connectWalletA11y
            }
            style={[styles.walletBtn, walletAddress ? styles.walletConnected : styles.walletPrimary]}
          >
            <Text
              style={[
                styles.walletBtnText,
                walletAddress ? styles.walletBtnTextLight : styles.walletBtnTextDark,
              ]}
            >
              {walletAddress ? truncateAddress(walletAddress, 4, 4) : EN_UI_COPY.home.connectWallet}
            </Text>
          </Pressable>
        </View>

        {/* Tap-Anywhere Eyes-Free Primary Voice Canvas */}
        <Pressable
          onPress={() => void handleMicToggle()}
          accessibilityRole="button"
          accessibilityLabel={
            recorder.isRecording
              ? EN_UI_COPY.home.stopRecordingA11y
              : EN_UI_COPY.home.startRecordingA11y
          }
          style={[
            styles.tapCanvas,
            recorder.isRecording ? styles.tapCanvasRecording : undefined,
          ]}
        >
          <View
            style={[
              styles.micCircle,
              recorder.isRecording ? styles.micCircleActive : undefined,
            ]}
          >
            <Text style={styles.micLabel}>
              {recorder.isRecording
                ? EN_UI_COPY.home.micStopLabel
                : EN_UI_COPY.home.micSpeakLabel}
            </Text>
          </View>
          <Text style={styles.canvasTitle}>
            {recorder.isRecording
              ? EN_UI_COPY.home.recordingTitle
              : EN_UI_COPY.home.idleTitle}
          </Text>
          <Text style={styles.canvasSub}>
            {recorder.lastRecordingUri
              ? `Last capture: ${recorder.lastRecordingUri.slice(-28)}`
              : EN_UI_COPY.home.idleSub}
          </Text>
          {recorder.error ? <Text style={styles.errorText}>{recorder.error}</Text> : null}
        </Pressable>

        {/* Physical expo-haptics Verification Panel */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{EN_UI_COPY.home.hapticsCardTitle}</Text>
          <Text style={styles.cardSub}>
            {lastHaptic
              ? `${EN_UI_COPY.home.hapticsLastPrefix}: ${lastHaptic.label} (${lastHaptic.apiCall})`
              : EN_UI_COPY.home.hapticsCardEmpty}
          </Text>
          <View style={styles.hapticGrid}>
            {(
              [
                { id: 'listen', label: 'Single (Listen)' },
                { id: 'tick', label: 'Soft Tick (Nav)' },
                { id: 'confirm', label: 'Double (Confirm)' },
                { id: 'success', label: 'Long (Success)' },
                { id: 'error', label: 'Triple (Blocked)' },
              ] as Array<{ id: HapticPatternId; label: string }>
            ).map((item) => (
              <Pressable
                key={item.id}
                onPress={() => void triggerHaptic(item.id)}
                accessibilityRole="button"
                accessibilityLabel={`${EN_UI_COPY.home.hapticsBtnA11yPrefix} ${item.label}`}
                style={styles.hapticBtn}
              >
                <Text style={styles.hapticBtnText}>{item.label}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* USB adb reverse -> Next.js Voice Proxy Health Panel */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{EN_UI_COPY.home.proxyCardTitle}</Text>
          <Text style={styles.monoSmall}>Target: {API_BASE_URL}/api/health</Text>
          <Pressable
            onPress={() => void handleTestProxy()}
            disabled={checkingProxy}
            accessibilityRole="button"
            accessibilityLabel={EN_UI_COPY.home.proxyBtnA11y}
            style={styles.proxyBtn}
          >
            <Text style={styles.proxyBtnText}>
              {checkingProxy ? EN_UI_COPY.home.proxyBtnChecking : EN_UI_COPY.home.proxyBtnIdle}
            </Text>
          </Pressable>
          {proxyStatus ? (
            <Text style={styles.okText}>
              Connected · Gemini: {proxyStatus.env.geminiConfigured ? 'Ready' : 'Key needed'} ·
              ElevenLabs: {proxyStatus.env.elevenLabsConfigured ? 'Ready' : 'Key needed'}
            </Text>
          ) : null}
          {proxyError ? <Text style={styles.errorText}>{proxyError}</Text> : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0B0D0E' },
  container: { padding: 20, gap: 16 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1E2329',
  },
  kicker: { fontSize: 11, color: '#94A3B8' },
  brand: { fontSize: 22, fontWeight: '700', color: '#F8FAFC' },
  walletBtn: {
    minHeight: 44,
    paddingHorizontal: 14,
    borderRadius: 10,
    justifyContent: 'center',
  },
  walletPrimary: { backgroundColor: '#22C55E' },
  walletConnected: {
    backgroundColor: '#14171A',
    borderWidth: 1,
    borderColor: '#262B30',
  },
  walletBtnText: { fontSize: 13, fontWeight: '600' },
  walletBtnTextDark: { color: '#052E16' },
  walletBtnTextLight: { color: '#E2E8F0' },
  tapCanvas: {
    backgroundColor: '#14171A',
    borderWidth: 1,
    borderColor: '#262B30',
    borderRadius: 20,
    paddingVertical: 32,
    paddingHorizontal: 20,
    alignItems: 'center',
    gap: 12,
  },
  tapCanvasRecording: {
    borderColor: '#EF4444',
    backgroundColor: '#1E1214',
  },
  micCircle: {
    width: 108,
    height: 108,
    borderRadius: 54,
    backgroundColor: '#22C55E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  micCircleActive: { backgroundColor: '#EF4444' },
  micLabel: { color: '#052E16', fontSize: 15, fontWeight: '800', letterSpacing: 0.5 },
  canvasTitle: { color: '#F8FAFC', fontSize: 16, fontWeight: '600', textAlign: 'center' },
  canvasSub: { color: '#94A3B8', fontSize: 12, textAlign: 'center' },
  card: {
    backgroundColor: '#14171A',
    borderWidth: 1,
    borderColor: '#23282E',
    borderRadius: 16,
    padding: 16,
    gap: 10,
  },
  cardTitle: { color: '#F8FAFC', fontSize: 15, fontWeight: '600' },
  cardSub: { color: '#94A3B8', fontSize: 12, lineHeight: 18 },
  monoSmall: { color: '#94A3B8', fontSize: 12, fontFamily: 'monospace' },
  hapticGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  hapticBtn: {
    minHeight: 44,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: '#0B0D0E',
    borderWidth: 1,
    borderColor: '#2A313A',
    justifyContent: 'center',
  },
  hapticBtnText: { color: '#E2E8F0', fontSize: 12, fontWeight: '500' },
  proxyBtn: {
    minHeight: 44,
    borderRadius: 10,
    backgroundColor: '#22C55E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  proxyBtnText: { color: '#052E16', fontSize: 13, fontWeight: '700' },
  okText: { color: '#86EFAC', fontSize: 12 },
  errorText: { color: '#FCA5A5', fontSize: 12 },
});
