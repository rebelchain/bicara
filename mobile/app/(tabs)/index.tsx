import { useEffect, useState } from 'react';
import {
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useMobileWallet } from '@wallet-ui/react-native-kit';
import { useVoiceRecorder } from '../../src/hooks/useVoiceRecorder';
import {
  API_BASE_URL,
  buildMobileKeyterms,
  checkVoiceProxyHealth,
  fetchSwapQuote,
  fetchTokenPrices,
  parseVoiceIntent,
  transcribeVoiceRecording,
  type ParsedVoiceIntent,
  type ProxyHealthResponse,
} from '../../src/services/api';
import {
  subscribeHaptics,
  triggerHaptic,
  type HapticEvent,
  type HapticPatternId,
} from '../../src/services/haptics';
import { truncateAddress } from '../../src/services/solana';
import {
  speakEyesFree,
  stopSpeaking,
  subscribeSpeech,
  type SpeechTelemetry,
} from '../../src/services/speech';
import { EN_UI_COPY, EN_VOICE_SCRIPTS } from '../../src/i18n/en';

const SEED_CONTACT_NAMES = ['Ahmad', 'Budi', 'Siti', 'Raka'];

interface VoicePipelineLog {
  transcript: string;
  sttMs: number;
  intent: ParsedVoiceIntent | null;
  nluMs: number;
  nluEngine: string;
  replyText: string;
  extraLatencyLabel?: string;
}

export default function EyesFreeHomeScreen() {
  const router = useRouter();
  const { account, connect, disconnect } = useMobileWallet();
  const recorder = useVoiceRecorder();

  const [processing, setProcessing] = useState(false);
  const [showTools, setShowTools] = useState(false);
  const [lastHaptic, setLastHaptic] = useState<HapticEvent | null>(null);
  const [lastSpeech, setLastSpeech] = useState<SpeechTelemetry | null>(null);
  const [pipelineLog, setPipelineLog] = useState<VoicePipelineLog | null>(null);
  const [pipelineError, setPipelineError] = useState<string | null>(null);
  const [lastSpokenText, setLastSpokenText] = useState<string>(
    EN_VOICE_SCRIPTS.onboardingWelcome()
  );

  const [proxyStatus, setProxyStatus] = useState<ProxyHealthResponse | null>(null);
  const [proxyError, setProxyError] = useState<string | null>(null);
  const [checkingProxy, setCheckingProxy] = useState(false);

  // Zero-Silent-Screen welcome narration on first launch
  useEffect(() => {
    const welcome = EN_VOICE_SCRIPTS.onboardingWelcome();
    setLastSpokenText(welcome);
    void speakEyesFree(welcome, 'tick', { preferElevenLabs: false });
  }, []);

  useEffect(() => {
    return subscribeHaptics((evt) => setLastHaptic(evt));
  }, []);

  useEffect(() => {
    return subscribeSpeech((evt) => setLastSpeech(evt));
  }, []);

  const announce = async (
    text: string,
    haptic: HapticPatternId,
    preferElevenLabs = true
  ) => {
    setLastSpokenText(text);
    await speakEyesFree(text, haptic, { preferElevenLabs });
  };

  const handleWalletPress = async () => {
    try {
      if (account) {
        await disconnect();
        await announce(EN_UI_COPY.home.walletDisconnectedSpoken, 'tick', false);
      } else {
        await triggerHaptic('tick');
        await connect();
        const connectedAddr = account?.address?.toString() ?? '';
        const spoken = connectedAddr
          ? EN_VOICE_SCRIPTS.onboardingWalletReady(connectedAddr.slice(-4))
          : EN_UI_COPY.home.walletConnectedFallbackSpoken;
        await announce(spoken, 'success', false);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : EN_UI_COPY.home.walletConnectError;
      await announce(msg, 'error', false);
    }
  };

  const executeLiveVoicePipeline = async (fileUri: string) => {
    setProcessing(true);
    setPipelineError(null);
    try {
      const keyterms = buildMobileKeyterms(SEED_CONTACT_NAMES);
      const stt = await transcribeVoiceRecording(fileUri, keyterms);
      const transcript = stt.transcript.trim();

      if (!transcript) {
        const msg = 'No speech detected. Tap anywhere and try speaking again.';
        setPipelineError(msg);
        await announce(msg, 'error', true);
        return;
      }

      const nlu = await parseVoiceIntent(transcript, SEED_CONTACT_NAMES, 'ai');
      const intent = nlu.intent;

      let replyText = '';
      let haptic: HapticPatternId = 'success';
      let extraLatencyLabel: string | undefined;

      if (intent.action === 'check_price') {
        const prices = await fetchTokenPrices();
        replyText = EN_VOICE_SCRIPTS.priceReadout(prices.solUsd);
        extraLatencyLabel = `Price (${prices.source}): ${prices.latencyMs}ms`;
      } else if (intent.action === 'swap_quote') {
        const inputSym = intent.currency || 'USDC';
        const outputSym = intent.outputCurrency || (inputSym === 'USDC' ? 'SOL' : 'USDC');
        const amount = intent.amount && intent.amount > 0 ? intent.amount : 10;

        const quoteRes = await fetchSwapQuote(inputSym, outputSym, amount);
        if ('blocked' in quoteRes) {
          replyText = quoteRes.spokenWarning;
          haptic = 'error';
          extraLatencyLabel = `Allowlist blocked: ${quoteRes.blockedToken}`;
        } else {
          const outText =
            quoteRes.outAmountUi !== null ? String(quoteRes.outAmountUi) : 'an estimated amount';
          const impactAbs = Math.abs(quoteRes.priceImpactPct);
          const impactLevel = impactAbs > 2 ? 'high' : impactAbs > 0.5 ? 'moderate' : 'low';
          const slippagePct = Number((quoteRes.slippageBps / 100).toFixed(2));
          replyText =
            `You are quoting a swap to sell ${amount} ${quoteRes.inputSymbol} for about ${outText} ${quoteRes.outputSymbol}. ` +
            `Price impact is ${impactLevel}. Maximum slippage is ${slippagePct} percent. ` +
            `Quote-only Devnet safe mode is active; no mainnet funds will move.`;
          haptic = 'confirm';
          extraLatencyLabel = `Jupiter (${quoteRes.router}): ${quoteRes.latencyMs}ms`;
        }
      } else if (intent.action === 'send') {
        if (intent.amount && intent.recipient) {
          replyText =
            `You are about to send ${intent.amount} ${intent.currency || 'USDC'} to ${intent.recipient}. ` +
            `Devnet execution wiring arrives in Gate B. Say cancel to stop.`;
          haptic = 'confirm';
        } else {
          replyText = 'Please state both the amount and recipient, for example send 5 USDC to Ahmad.';
          haptic = 'error';
        }
      } else if (intent.action === 'check_balance') {
        replyText = EN_VOICE_SCRIPTS.balanceReadout(0, 0);
      } else if (intent.action === 'navigate' || intent.action === 'list_contacts' || intent.action === 'read_history') {
        if (intent.targetTab === 'contacts' || intent.action === 'list_contacts') {
          router.push('/(tabs)/contacts');
          replyText = EN_VOICE_SCRIPTS.navContacts(SEED_CONTACT_NAMES.length, SEED_CONTACT_NAMES);
        } else if (intent.targetTab === 'history' || intent.action === 'read_history') {
          router.push('/(tabs)/history');
          replyText = EN_VOICE_SCRIPTS.navHistory(0, null);
        } else {
          replyText = EN_VOICE_SCRIPTS.navHome(0, 0);
        }
        haptic = 'tick';
      } else if (intent.action === 'help') {
        replyText = EN_VOICE_SCRIPTS.helpGuide();
        haptic = 'tick';
      } else if (intent.action === 'repeat') {
        replyText = lastSpokenText;
        haptic = 'tick';
      } else if (intent.action === 'cancel') {
        replyText = EN_VOICE_SCRIPTS.cancelled();
        haptic = 'tick';
      } else if (intent.action === 'confirm') {
        replyText = 'No transaction is currently waiting for hardware biometric confirmation.';
        haptic = 'tick';
      } else {
        replyText =
          'Sorry, I did not understand that. Try saying check price, swap 10 USDC to SOL, or send 5 USDC to Ahmad.';
        haptic = 'error';
      }

      setPipelineLog({
        transcript,
        sttMs: stt.latencyMs,
        intent,
        nluMs: nlu.latencyMs,
        nluEngine: nlu.engine,
        replyText,
        extraLatencyLabel,
      });

      await announce(replyText, haptic, true);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Voice pipeline error.';
      setPipelineError(message);
      await announce(message, 'error', false);
    } finally {
      setProcessing(false);
    }
  };

  const handleTapAnywhereToggle = async () => {
    if (processing) return;

    if (recorder.isRecording) {
      const uri = await recorder.stopRecording();
      if (uri) {
        await executeLiveVoicePipeline(uri);
      } else {
        await announce(EN_UI_COPY.home.recordingStoppedSpoken, 'tick', false);
      }
    } else {
      await stopSpeaking();
      const started = await recorder.startRecording();
      if (!started) {
        await announce(EN_UI_COPY.recorder.startFailed, 'error', false);
      }
    }
  };

  const handleTestProxy = async () => {
    setCheckingProxy(true);
    setProxyError(null);
    try {
      const data = await checkVoiceProxyHealth();
      setProxyStatus(data);
      await announce(EN_UI_COPY.home.proxyConnectedSpoken, 'success', true);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : EN_UI_COPY.home.proxyErrorFallback;
      setProxyError(message);
      await announce(message, 'error', false);
    } finally {
      setCheckingProxy(false);
    }
  };

  const walletAddress = account?.address?.toString() ?? null;

  return (
    <SafeAreaView style={styles.safe}>
      {/* Compact Top Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.kicker}>Gate A.2 · Live Voice &amp; Tap-Anywhere</Text>
          <Text style={styles.brand}>Bicara</Text>
        </View>
        <View style={styles.headerActions}>
          <Pressable
            onPress={() => setShowTools((prev) => !prev)}
            accessibilityRole="button"
            accessibilityLabel={showTools ? 'Close Gate A tools' : 'Open Gate A tools'}
            style={styles.toolsToggleBtn}
          >
            <Text style={styles.toolsToggleText}>{showTools ? 'Canvas' : 'Tools'}</Text>
          </Pressable>
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
      </View>

      {!showTools ? (
        /* TRUE Full-Screen Tap-Anywhere Eyes-Free Canvas */
        <Pressable
          onPress={() => void handleTapAnywhereToggle()}
          accessibilityRole="button"
          accessibilityLabel={
            recorder.isRecording
              ? EN_UI_COPY.home.stopRecordingA11y
              : EN_UI_COPY.home.startRecordingA11y
          }
          style={[
            styles.fullCanvas,
            recorder.isRecording ? styles.fullCanvasRecording : undefined,
          ]}
        >
          <View style={styles.centerBlock}>
            <View
              style={[
                styles.micCircle,
                recorder.isRecording
                  ? styles.micCircleActive
                  : processing
                    ? styles.micCircleProcessing
                    : undefined,
              ]}
            >
              <Text style={styles.micLabel}>
                {recorder.isRecording
                  ? EN_UI_COPY.home.micStopLabel
                  : processing
                    ? 'WAIT'
                    : EN_UI_COPY.home.micSpeakLabel}
              </Text>
            </View>

            <Text style={styles.canvasTitle}>
              {recorder.isRecording
                ? 'Listening... tap anywhere to send'
                : processing
                  ? 'Running Scribe v2 -> Gemini -> Flash v2.5...'
                  : 'Tap ANYWHERE on screen to speak'}
            </Text>
            <Text style={styles.canvasSub}>
              Try: &ldquo;Check price&rdquo; · &ldquo;Swap 10 USDC to SOL&rdquo; · &ldquo;Send 5 USDC to Ahmad&rdquo;
            </Text>
          </View>

          {/* Live Gate A.2 Measurement Telemetry Card */}
          <View style={styles.telemetryBox}>
            <Text style={styles.telemetryTitle}>Live Gate A.2 Measurements</Text>
            {pipelineLog ? (
              <>
                <Text style={styles.telemetryLine}>
                  STT (scribe_v2): &ldquo;{pipelineLog.transcript}&rdquo; ({pipelineLog.sttMs}ms)
                </Text>
                <Text style={styles.telemetryLine}>
                  NLU ({pipelineLog.nluEngine}): {pipelineLog.intent?.action ?? 'unknown'} ({pipelineLog.nluMs}ms)
                </Text>
                {pipelineLog.extraLatencyLabel ? (
                  <Text style={styles.telemetryLine}>{pipelineLog.extraLatencyLabel}</Text>
                ) : null}
              </>
            ) : (
              <Text style={styles.telemetryMuted}>
                Tap anywhere, speak an English command, then tap anywhere again to stop.
              </Text>
            )}
            {lastSpeech ? (
              <Text style={styles.telemetryAccent}>
                TTS ({lastSpeech.engine}): {lastSpeech.latencyMs}ms on-device
              </Text>
            ) : null}
            {pipelineError ? <Text style={styles.errorText}>{pipelineError}</Text> : null}
            {recorder.error ? <Text style={styles.errorText}>{recorder.error}</Text> : null}
          </View>
        </Pressable>
      ) : (
        /* Collapsible Gate A Diagnostic Tools */
        <ScrollView contentContainerStyle={styles.toolsContainer}>
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
                ElevenLabs: {proxyStatus.env.elevenLabsConfigured ? 'Ready' : 'Key needed'} ·
                Jupiter: {proxyStatus.env.jupiterConfigured ? 'Ready' : 'Key needed'}
              </Text>
            ) : null}
            {proxyError ? <Text style={styles.errorText}>{proxyError}</Text> : null}
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0B0D0E' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#1E2329',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  kicker: { fontSize: 11, color: '#94A3B8' },
  brand: { fontSize: 22, fontWeight: '700', color: '#F8FAFC' },
  toolsToggleBtn: {
    minHeight: 40,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: '#14171A',
    borderWidth: 1,
    borderColor: '#262B30',
    justifyContent: 'center',
  },
  toolsToggleText: { fontSize: 12, fontWeight: '600', color: '#CBD5E1' },
  walletBtn: {
    minHeight: 40,
    paddingHorizontal: 12,
    borderRadius: 10,
    justifyContent: 'center',
  },
  walletPrimary: { backgroundColor: '#22C55E' },
  walletConnected: {
    backgroundColor: '#14171A',
    borderWidth: 1,
    borderColor: '#262B30',
  },
  walletBtnText: { fontSize: 12, fontWeight: '600' },
  walletBtnTextDark: { color: '#052E16' },
  walletBtnTextLight: { color: '#E2E8F0' },
  fullCanvas: {
    flex: 1,
    padding: 20,
    justifyContent: 'space-between',
    backgroundColor: '#0B0D0E',
  },
  fullCanvasRecording: {
    backgroundColor: '#1A0F12',
  },
  centerBlock: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
  },
  micCircle: {
    width: 132,
    height: 132,
    borderRadius: 66,
    backgroundColor: '#22C55E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  micCircleActive: { backgroundColor: '#EF4444' },
  micCircleProcessing: { backgroundColor: '#F59E0B' },
  micLabel: { color: '#052E16', fontSize: 18, fontWeight: '800', letterSpacing: 0.6 },
  canvasTitle: { color: '#F8FAFC', fontSize: 18, fontWeight: '700', textAlign: 'center' },
  canvasSub: { color: '#94A3B8', fontSize: 13, textAlign: 'center', lineHeight: 20 },
  telemetryBox: {
    backgroundColor: '#14171A',
    borderWidth: 1,
    borderColor: '#23282E',
    borderRadius: 14,
    padding: 14,
    gap: 6,
  },
  telemetryTitle: { color: '#E2E8F0', fontSize: 12, fontWeight: '700' },
  telemetryLine: { color: '#CBD5E1', fontSize: 12, fontFamily: 'monospace' },
  telemetryMuted: { color: '#64748B', fontSize: 12, lineHeight: 18 },
  telemetryAccent: { color: '#4ADE80', fontSize: 12, fontFamily: 'monospace', fontWeight: '600' },
  toolsContainer: { padding: 20, gap: 16 },
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
