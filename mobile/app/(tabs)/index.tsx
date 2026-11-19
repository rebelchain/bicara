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

export default function EyesFreeHomeScreen() {
  const { account, connect, disconnect } = useMobileWallet();
  const recorder = useVoiceRecorder();

  const [lastHaptic, setLastHaptic] = useState<HapticEvent | null>(null);
  const [proxyStatus, setProxyStatus] = useState<ProxyHealthResponse | null>(null);
  const [proxyError, setProxyError] = useState<string | null>(null);
  const [checkingProxy, setCheckingProxy] = useState(false);

  // Zero-Silent-Screen welcome narration on first launch
  useEffect(() => {
    void speakEyesFree(
      'Selamat datang di Bicara. Sentuh layar di mana saja untuk menguji mikrofon, atau hubungkan dompet Solana Mobile kamu.',
      'tick'
    );
  }, []);

  // Live Haptic Telemetry listener (handy when mirroring via scrcpy)
  useEffect(() => {
    return subscribeHaptics((evt) => setLastHaptic(evt));
  }, []);

  const handleWalletPress = async () => {
    try {
      if (account) {
        await disconnect();
        await speakEyesFree('Dompet Solana diputuskan.', 'tick');
      } else {
        await triggerHaptic('tick');
        await connect();
        await speakEyesFree('Dompet Solana Mobile berhasil terhubung di Devnet.', 'success');
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Gagal menghubungkan dompet MWA.';
      await speakEyesFree(msg, 'error');
    }
  };

  const handleMicToggle = async () => {
    if (recorder.isRecording) {
      const uri = await recorder.stopRecording();
      await speakEyesFree(
        uri
          ? 'Rekaman suara selesai disimpan. Siap dikirim ke ElevenLabs Scribe versi dua di Step tiga.'
          : 'Rekaman dihentikan.',
        'success'
      );
    } else {
      const started = await recorder.startRecording();
      if (started) {
        await speakEyesFree('Mendengarkan. Bicara sekarang.', 'listen');
      }
    }
  };

  const handleTestProxy = async () => {
    setCheckingProxy(true);
    setProxyError(null);
    try {
      const data = await checkVoiceProxyHealth();
      setProxyStatus(data);
      await speakEyesFree(
        'Koneksi ke server proxy suara Bicara berhasil terhubung.',
        'success'
      );
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : 'Gagal terhubung ke server proxy. Cek adb reverse tcp:3000 tcp:3000.';
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
            <Text style={styles.kicker}>Step 1 · Physical Android USB Build</Text>
            <Text style={styles.brand}>Bicara</Text>
          </View>
          <Pressable
            onPress={() => void handleWalletPress()}
            accessibilityRole="button"
            accessibilityLabel={
              walletAddress ? 'Putuskan dompet Solana' : 'Hubungkan dompet Solana Mobile'
            }
            style={[styles.walletBtn, walletAddress ? styles.walletConnected : styles.walletPrimary]}
          >
            <Text
              style={[
                styles.walletBtnText,
                walletAddress ? styles.walletBtnTextLight : styles.walletBtnTextDark,
              ]}
            >
              {walletAddress ? truncateAddress(walletAddress, 4, 4) : 'Connect MWA'}
            </Text>
          </Pressable>
        </View>

        {/* Tap-Anywhere Eyes-Free Primary Voice Canvas */}
        <Pressable
          onPress={() => void handleMicToggle()}
          accessibilityRole="button"
          accessibilityLabel={
            recorder.isRecording
              ? 'Berhenti merekam suara'
              : 'Sentuh di mana saja untuk mulai bicara'
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
              {recorder.isRecording ? 'STOP' : 'BICARA'}
            </Text>
          </View>
          <Text style={styles.canvasTitle}>
            {recorder.isRecording
              ? 'Sedang merekam (expo-audio)...'
              : 'Sentuh area ini untuk mulai bicara'}
          </Text>
          <Text style={styles.canvasSub}>
            {recorder.lastRecordingUri
              ? `Last capture: ${recorder.lastRecordingUri.slice(-28)}`
              : 'Mode Eyes-Free · Zero-Silent-Screen · Physical Haptics'}
          </Text>
          {recorder.error ? <Text style={styles.errorText}>{recorder.error}</Text> : null}
        </Pressable>

        {/* Physical expo-haptics Verification Panel */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Verifikasi Fisik expo-haptics</Text>
          <Text style={styles.cardSub}>
            {lastHaptic
              ? `Terakhir: ${lastHaptic.label} (${lastHaptic.apiCall})`
              : 'Ketuk salah satu pola getar di bawah untuk merasakan kode aksesibilitas di HP.'}
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
                accessibilityLabel={`Uji getar ${item.label}`}
                style={styles.hapticBtn}
              >
                <Text style={styles.hapticBtnText}>{item.label}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* USB adb reverse -> Next.js Voice Proxy Health Panel */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Koneksi Voice Proxy (adb reverse)</Text>
          <Text style={styles.monoSmall}>Target: {API_BASE_URL}/api/health</Text>
          <Pressable
            onPress={() => void handleTestProxy()}
            disabled={checkingProxy}
            accessibilityRole="button"
            accessibilityLabel="Cek koneksi ke server voice proxy"
            style={styles.proxyBtn}
          >
            <Text style={styles.proxyBtnText}>
              {checkingProxy ? 'Mengecek...' : 'Cek Koneksi Voice Proxy'}
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
