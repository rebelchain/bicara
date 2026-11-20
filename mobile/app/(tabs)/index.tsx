import { useEffect, useState } from 'react';
import {
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useMobileWallet } from '@wallet-ui/react-native-kit';
import { useBicaraStore } from '../../src/context/BicaraStoreContext';
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
import {
  buildCompiledDevnetTransferTransaction,
  getSolanaExplorerTxUrl,
  matchesSpokenChallenge,
  normalizeMwaSignature,
  prepareDevnetTransferPlan,
  truncateAddress,
  type PendingTransferPlan,
} from '../../src/services/solana';
import {
  speakEyesFree,
  stopSpeaking,
  subscribeSpeech,
  type SpeechTelemetry,
} from '../../src/services/speech';
import { EN_UI_COPY, EN_VOICE_SCRIPTS } from '../../src/i18n/en';

interface VoicePipelineLog {
  transcript: string;
  sttMs: number;
  intent: ParsedVoiceIntent | null;
  nluMs: number;
  nluEngine: string;
  replyText: string;
  extraLatencyLabel?: string;
}

interface ConfirmedReceiptBanner {
  amount: number;
  asset: 'SOL' | 'USDC';
  recipientName: string;
  signature: string;
  explorerUrl: string;
}

export default function EyesFreeHomeScreen() {
  const router = useRouter();
  const { account, connect, disconnect, signAndSendTransaction } = useMobileWallet();
  const {
    walletAddress,
    balances,
    loadingBalances,
    contacts,
    transactions,
    storageMode,
    refreshBalances,
    findContactByName,
    logConfirmedTransaction,
  } = useBicaraStore();
  const recorder = useVoiceRecorder();

  const [processing, setProcessing] = useState(false);
  const [signing, setSigning] = useState(false);
  const [showTools, setShowTools] = useState(false);
  const [lastHaptic, setLastHaptic] = useState<HapticEvent | null>(null);
  const [lastSpeech, setLastSpeech] = useState<SpeechTelemetry | null>(null);
  const [pipelineLog, setPipelineLog] = useState<VoicePipelineLog | null>(null);
  const [pipelineError, setPipelineError] = useState<string | null>(null);
  const [pendingTransfer, setPendingTransfer] = useState<PendingTransferPlan | null>(null);
  const [lastReceipt, setLastReceipt] = useState<ConfirmedReceiptBanner | null>(null);
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
        setPendingTransfer(null);
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

  const executeMwaTransfer = async (plan: PendingTransferPlan) => {
    if (signing) return;
    setSigning(true);
    setPipelineError(null);
    try {
      await announce(
        `Opening Solflare to authorize ${plan.amount} ${plan.asset} to ${plan.recipientName}.`,
        'tick',
        false
      );

      const { transaction, minContextSlot } = await buildCompiledDevnetTransferTransaction(plan);
      const rawSig = await signAndSendTransaction(
        transaction as Parameters<typeof signAndSendTransaction>[0],
        minContextSlot as Parameters<typeof signAndSendTransaction>[1]
      );
      const signature = normalizeMwaSignature(rawSig);
      const explorerUrl = getSolanaExplorerTxUrl(signature);

      await logConfirmedTransaction({
        recipientName: plan.recipientName,
        recipientAddress: plan.recipientAddress,
        asset: plan.asset,
        amount: plan.amount,
        feeSol: plan.estimatedFeeSol + plan.ataRentSol,
        ataCreated: plan.ataNeedsCreation,
        signature,
        status: 'confirmed',
      });

      setPendingTransfer(null);
      setLastReceipt({
        amount: plan.amount,
        asset: plan.asset,
        recipientName: plan.recipientName,
        signature,
        explorerUrl,
      });

      void refreshBalances();

      const receiptSpeech = `${EN_VOICE_SCRIPTS.sendSuccess(
        plan.amount,
        plan.asset,
        plan.recipientName
      )} Confirmed on Solana Devnet. Signature ending ${signature.slice(-4)}.`;
      await announce(receiptSpeech, 'success', true);
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : 'Transaction signing was cancelled or failed.';
      setPipelineError(msg);
      await announce(`Transfer not completed. ${msg}`, 'error', false);
    } finally {
      setSigning(false);
    }
  };

  const handleCancelPending = async () => {
    setPendingTransfer(null);
    await announce(EN_VOICE_SCRIPTS.cancelled(), 'tick', true);
  };

  const executeLiveVoicePipeline = async (fileUri: string) => {
    setProcessing(true);
    setPipelineError(null);
    try {
      const contactNames = contacts.map((c) => c.name);
      const keyterms = buildMobileKeyterms(contactNames);
      const stt = await transcribeVoiceRecording(fileUri, keyterms);
      const transcript = stt.transcript.trim();

      if (!transcript) {
        const msg = 'No speech detected. Tap anywhere and try speaking again.';
        setPipelineError(msg);
        await announce(msg, 'error', true);
        return;
      }

      // Layer 2 Challenge Gate: when a pending transfer awaits confirmation, check digits or cancel first
      if (pendingTransfer) {
        const lower = transcript.toLowerCase();
        if (lower.includes('cancel') || lower.includes('stop') || lower === 'no') {
          setPipelineLog({
            transcript,
            sttMs: stt.latencyMs,
            intent: {
              action: 'cancel',
              amount: null,
              currency: null,
              recipient: null,
              confidence: 'high',
              raw_amount_text: null,
            },
            nluMs: 0,
            nluEngine: 'challenge-gate',
            replyText: EN_VOICE_SCRIPTS.cancelled(),
          });
          setPendingTransfer(null);
          await announce(EN_VOICE_SCRIPTS.cancelled(), 'tick', true);
          return;
        }

        if (
          matchesSpokenChallenge(transcript, pendingTransfer.challengeDigits) ||
          lower.includes('confirm') ||
          lower.includes('yes')
        ) {
          setPipelineLog({
            transcript,
            sttMs: stt.latencyMs,
            intent: {
              action: 'confirm',
              amount: pendingTransfer.amount,
              currency: pendingTransfer.asset,
              recipient: pendingTransfer.recipientName,
              confidence: 'high',
              raw_amount_text: null,
            },
            nluMs: 0,
            nluEngine: 'layer2-challenge-pass',
            replyText: 'Challenge verified. Opening Solflare MWA for signing.',
          });
          setProcessing(false);
          await executeMwaTransfer(pendingTransfer);
          return;
        }
      }

      const nlu = await parseVoiceIntent(transcript, contactNames, 'ai');
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
        if (!walletAddress) {
          replyText = 'Please connect your Solflare wallet first using the top right button.';
          haptic = 'error';
        } else if (!intent.amount || intent.amount <= 0 || !intent.recipient) {
          replyText =
            'Please state both the amount and verified contact name, for example send 0.01 SOL to Ahmad or send 5 USDC to Ahmad.';
          haptic = 'error';
        } else {
          const asset = intent.currency === 'SOL' ? 'SOL' : 'USDC';
          const matchedContact = findContactByName(intent.recipient);
          if (!matchedContact) {
            replyText =
              `${intent.recipient} is not in your verified contacts. ` +
              `For your security, voice cannot send to unverified names. Open the Contacts tab to add and verify ${intent.recipient} first.`;
            haptic = 'error';
            extraLatencyLabel = 'Layer 3 blocked: unverified contact';
          } else {
            const rpcStarted = Date.now();
            const plan = await prepareDevnetTransferPlan({
              senderAddress: walletAddress,
              recipientName: matchedContact.name,
              recipientAddress: matchedContact.recipientAddress,
              isSavedContact: true,
              asset,
              amount: intent.amount,
            });
            setPendingTransfer(plan);
            replyText = plan.spokenSummary;
            haptic = 'confirm';
            extraLatencyLabel = `Devnet RPC pre-flight: ${Date.now() - rpcStarted}ms`;
          }
        }
      } else if (intent.action === 'check_balance') {
        if (!walletAddress) {
          replyText = 'No wallet connected yet. Tap Connect MWA at the top right.';
          haptic = 'error';
        } else {
          const rpcStarted = Date.now();
          const live = await refreshBalances();
          replyText = EN_VOICE_SCRIPTS.balanceReadout(live?.usdc ?? 0, live?.sol ?? 0);
          extraLatencyLabel = `Devnet RPC balance: ${Date.now() - rpcStarted}ms`;
        }
      } else if (
        intent.action === 'navigate' ||
        intent.action === 'list_contacts' ||
        intent.action === 'read_history'
      ) {
        if (intent.targetTab === 'contacts' || intent.action === 'list_contacts') {
          router.push('/(tabs)/contacts');
          replyText = EN_VOICE_SCRIPTS.navContacts(
            contacts.length,
            contacts.map((c) => c.name)
          );
        } else if (intent.targetTab === 'history' || intent.action === 'read_history') {
          router.push('/(tabs)/history');
          const latest =
            transactions.length > 0
              ? `${transactions[0].amount} ${transactions[0].asset} to ${transactions[0].recipientName}`
              : null;
          replyText = EN_VOICE_SCRIPTS.navHistory(transactions.length, latest);
        } else {
          replyText = EN_VOICE_SCRIPTS.navHome(balances?.usdc ?? 0, balances?.sol ?? 0);
        }
        haptic = 'tick';
      } else if (intent.action === 'help') {
        replyText = EN_VOICE_SCRIPTS.helpGuide();
        haptic = 'tick';
      } else if (intent.action === 'repeat') {
        replyText = pendingTransfer ? pendingTransfer.spokenSummary : lastSpokenText;
        haptic = 'tick';
      } else if (intent.action === 'cancel') {
        setPendingTransfer(null);
        replyText = EN_VOICE_SCRIPTS.cancelled();
        haptic = 'tick';
      } else if (intent.action === 'confirm') {
        if (pendingTransfer) {
          setProcessing(false);
          await executeMwaTransfer(pendingTransfer);
          return;
        }
        replyText = 'No transaction is currently waiting for hardware biometric confirmation.';
        haptic = 'tick';
      } else {
        replyText =
          'Sorry, I did not understand that. Try saying check balance, check price, swap 10 USDC to SOL, or send 0.01 SOL to Ahmad.';
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
    if (processing || signing) return;

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

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Compact Top Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.kicker}>Gate B · Live Solana Devnet</Text>
          <Text style={styles.brand}>Bicara</Text>
        </View>
        <View style={styles.headerActions}>
          <Pressable
            onPress={() => setShowTools((prev) => !prev)}
            accessibilityRole="button"
            accessibilityLabel={showTools ? 'Close diagnostics' : 'Open diagnostics'}
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

      {/* Live Devnet Balance & Storage Strip */}
      <Pressable
        onPress={() => void refreshBalances()}
        accessibilityRole="button"
        accessibilityLabel="Refresh live Solana Devnet balances"
        style={styles.balanceStrip}
      >
        <Text style={styles.balanceText}>
          {walletAddress
            ? loadingBalances
              ? 'Syncing Devnet RPC...'
              : `${(balances?.sol ?? 0).toFixed(4)} SOL · ${(balances?.usdc ?? 0).toFixed(2)} USDC`
            : 'Connect Solflare (Devnet) to check balance & send'}
        </Text>
        <Text style={styles.storageTag}>
          {storageMode === 'supabase' ? 'Supabase' : 'Local Cache'}
        </Text>
      </Pressable>

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
          {/* Layer 2/4 Pre-Sign Confirmation Card (only shown when a Devnet transfer awaits approval) */}
          {pendingTransfer ? (
            <View style={styles.confirmCard}>
              <Text style={styles.confirmKicker}>
                PRE-SIGN TX SUMMARY · LAYER 2 CHALLENGE: {pendingTransfer.challengeDigits}
              </Text>
              <Text style={styles.confirmHeadline}>
                Send {pendingTransfer.amount} {pendingTransfer.asset} → {pendingTransfer.recipientName}
              </Text>
              <Text style={styles.confirmMeta}>
                Wallet: {truncateAddress(pendingTransfer.recipientAddress, 6, 4)} · Fee: ~
                {pendingTransfer.estimatedFeeSol} SOL
                {pendingTransfer.ataNeedsCreation
                  ? ` + ~${pendingTransfer.ataRentSol.toFixed(5)} SOL ATA rent`
                  : ''}
              </Text>
              {pendingTransfer.anomalies.map((warn, idx) => (
                <Text key={idx} style={styles.anomalyText}>
                  {warn}
                </Text>
              ))}
              <Text style={styles.confirmHint}>
                Tap canvas &amp; say &ldquo;{pendingTransfer.challengeSpoken}&rdquo;, or tap Confirm below:
              </Text>
              <View style={styles.confirmActions}>
                <Pressable
                  onPress={() => void handleCancelPending()}
                  disabled={signing}
                  accessibilityRole="button"
                  accessibilityLabel="Cancel pending transfer"
                  style={styles.cancelBtn}
                >
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </Pressable>
                <Pressable
                  onPress={() => void executeMwaTransfer(pendingTransfer)}
                  disabled={signing}
                  accessibilityRole="button"
                  accessibilityLabel="Confirm and sign transaction in Solflare"
                  style={styles.signBtn}
                >
                  <Text style={styles.signBtnText}>
                    {signing ? 'Signing...' : 'Confirm & Sign'}
                  </Text>
                </Pressable>
              </View>
            </View>
          ) : null}

          <View style={styles.centerBlock}>
            <View
              style={[
                styles.micCircle,
                recorder.isRecording
                  ? styles.micCircleActive
                  : processing || signing
                    ? styles.micCircleProcessing
                    : undefined,
              ]}
            >
              <Text style={styles.micLabel}>
                {recorder.isRecording
                  ? EN_UI_COPY.home.micStopLabel
                  : signing
                    ? 'SIGN'
                    : processing
                      ? 'WAIT'
                      : EN_UI_COPY.home.micSpeakLabel}
              </Text>
            </View>

            <Text style={styles.canvasTitle}>
              {recorder.isRecording
                ? 'Listening... tap anywhere to send'
                : signing
                  ? 'Waiting for Solflare hardware authorization...'
                  : processing
                    ? 'Processing voice command...'
                    : pendingTransfer
                      ? `Tap anywhere & say "${pendingTransfer.challengeSpoken}"`
                      : 'Tap ANYWHERE on screen to speak'}
            </Text>
            <Text style={styles.canvasSub}>
              Try: &ldquo;Check balance&rdquo; · &ldquo;Send 0.01 SOL to Ahmad&rdquo; · &ldquo;Swap 10 USDC to SOL&rdquo;
            </Text>
          </View>

          {/* Latest Confirmed Devnet Receipt Banner */}
          {lastReceipt ? (
            <Pressable
              onPress={() => void Linking.openURL(lastReceipt.explorerUrl)}
              accessibilityRole="link"
              accessibilityLabel="Open confirmed transaction on Solana Devnet Explorer"
              style={styles.receiptBanner}
            >
              <Text style={styles.receiptTitle}>
                Confirmed on Devnet: {lastReceipt.amount} {lastReceipt.asset} →{' '}
                {lastReceipt.recipientName}
              </Text>
              <Text style={styles.receiptSig}>
                Sig: {truncateAddress(lastReceipt.signature, 8, 8)} · Tap to open Explorer
              </Text>
            </Pressable>
          ) : null}

          {/* Live Voice Pipeline Telemetry Card */}
          <View style={styles.telemetryBox}>
            <Text style={styles.telemetryTitle}>
              Live Pipeline · {contacts.length} verified contacts in keyterms
            </Text>
            {pipelineLog ? (
              <>
                <Text style={styles.telemetryLine}>
                  STT (scribe_v2): &ldquo;{pipelineLog.transcript}&rdquo; ({pipelineLog.sttMs}ms)
                </Text>
                <Text style={styles.telemetryLine}>
                  NLU ({pipelineLog.nluEngine}): {pipelineLog.intent?.action ?? 'unknown'} (
                  {pipelineLog.nluMs}ms)
                </Text>
                {pipelineLog.extraLatencyLabel ? (
                  <Text style={styles.telemetryLine}>{pipelineLog.extraLatencyLabel}</Text>
                ) : null}
              </>
            ) : (
              <Text style={styles.telemetryMuted}>
                Add a contact in Contacts tab first, then speak a live Devnet transfer.
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
        /* Collapsible Diagnostic Tools */
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
  safe: { flex: 1, backgroundColor: '#0F0F0F' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#262626',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  kicker: { fontSize: 11, color: '#CCFF00', fontWeight: '600' },
  brand: { fontSize: 22, fontWeight: '800', color: '#F4F4F5', letterSpacing: -0.4 },
  toolsToggleBtn: {
    minHeight: 42,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: '#1A1A1A',
    borderWidth: 1,
    borderColor: '#2E2E2E',
    justifyContent: 'center',
  },
  toolsToggleText: { fontSize: 12, fontWeight: '600', color: '#D4D4D8' },
  walletBtn: {
    minHeight: 42,
    paddingHorizontal: 14,
    borderRadius: 12,
    justifyContent: 'center',
  },
  walletPrimary: { backgroundColor: '#CCFF00' },
  walletConnected: {
    backgroundColor: '#1A1A1A',
    borderWidth: 1,
    borderColor: 'rgba(204, 255, 0, 0.35)',
  },
  walletBtnText: { fontSize: 12, fontWeight: '700' },
  walletBtnTextDark: { color: '#0F0F0F' },
  walletBtnTextLight: { color: '#CCFF00' },
  balanceStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#161616',
    borderBottomWidth: 1,
    borderBottomColor: '#262626',
  },
  balanceText: {
    color: '#F4F4F5',
    fontSize: 12,
    fontFamily: 'monospace',
    fontWeight: '600',
  },
  storageTag: {
    color: '#CCFF00',
    fontSize: 11,
    fontWeight: '700',
  },
  fullCanvas: {
    flex: 1,
    padding: 16,
    justifyContent: 'space-between',
    backgroundColor: '#0F0F0F',
    gap: 10,
  },
  fullCanvasRecording: {
    backgroundColor: '#1C0E12',
  },
  confirmCard: {
    backgroundColor: '#1A1A1A',
    borderWidth: 1.5,
    borderColor: 'rgba(204, 255, 0, 0.45)',
    borderRadius: 22,
    padding: 16,
    gap: 7,
  },
  confirmKicker: {
    color: '#A855F7',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  confirmHeadline: {
    color: '#F4F4F5',
    fontSize: 17,
    fontWeight: '800',
  },
  confirmMeta: {
    color: '#D4D4D8',
    fontSize: 12,
    fontFamily: 'monospace',
  },
  anomalyText: {
    color: '#FCD34D',
    fontSize: 12,
    lineHeight: 17,
  },
  confirmHint: {
    color: '#A1A1AA',
    fontSize: 12,
    marginTop: 2,
  },
  confirmActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  cancelBtn: {
    flex: 1,
    minHeight: 48,
    borderRadius: 14,
    backgroundColor: '#262626',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    color: '#F4F4F5',
    fontSize: 14,
    fontWeight: '700',
  },
  signBtn: {
    flex: 1.5,
    minHeight: 48,
    borderRadius: 14,
    backgroundColor: '#CCFF00',
    alignItems: 'center',
    justifyContent: 'center',
  },
  signBtnText: {
    color: '#0F0F0F',
    fontSize: 14,
    fontWeight: '800',
  },
  centerBlock: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
  },
  micCircle: {
    width: 128,
    height: 128,
    borderRadius: 64,
    backgroundColor: '#CCFF00',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: 'rgba(204, 255, 0, 0.28)',
  },
  micCircleActive: {
    backgroundColor: '#EF4444',
    borderColor: 'rgba(239, 68, 68, 0.35)',
  },
  micCircleProcessing: {
    backgroundColor: '#F59E0B',
    borderColor: 'rgba(245, 158, 11, 0.35)',
  },
  micLabel: { color: '#0F0F0F', fontSize: 18, fontWeight: '900', letterSpacing: 0.8 },
  canvasTitle: { color: '#F4F4F5', fontSize: 18, fontWeight: '700', textAlign: 'center' },
  canvasSub: { color: '#A1A1AA', fontSize: 12, textAlign: 'center', lineHeight: 19 },
  receiptBanner: {
    backgroundColor: '#161C12',
    borderWidth: 1,
    borderColor: 'rgba(204, 255, 0, 0.35)',
    borderRadius: 16,
    padding: 13,
    gap: 3,
  },
  receiptTitle: { color: '#CCFF00', fontSize: 13, fontWeight: '700' },
  receiptSig: { color: '#93C5FD', fontSize: 11, fontFamily: 'monospace' },
  telemetryBox: {
    backgroundColor: '#1A1A1A',
    borderWidth: 1,
    borderColor: '#262626',
    borderRadius: 18,
    padding: 14,
    gap: 5,
  },
  telemetryTitle: { color: '#F4F4F5', fontSize: 12, fontWeight: '700' },
  telemetryLine: { color: '#D4D4D8', fontSize: 11, fontFamily: 'monospace' },
  telemetryMuted: { color: '#A1A1AA', fontSize: 12, lineHeight: 17 },
  telemetryAccent: { color: '#CCFF00', fontSize: 11, fontFamily: 'monospace', fontWeight: '700' },
  toolsContainer: { padding: 20, gap: 16 },
  card: {
    backgroundColor: '#1A1A1A',
    borderWidth: 1,
    borderColor: '#262626',
    borderRadius: 20,
    padding: 16,
    gap: 10,
  },
  cardTitle: { color: '#F4F4F5', fontSize: 15, fontWeight: '700' },
  cardSub: { color: '#A1A1AA', fontSize: 12, lineHeight: 18 },
  monoSmall: { color: '#A1A1AA', fontSize: 12, fontFamily: 'monospace' },
  hapticGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  hapticBtn: {
    minHeight: 44,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: '#0F0F0F',
    borderWidth: 1,
    borderColor: '#2E2E2E',
    justifyContent: 'center',
  },
  hapticBtnText: { color: '#F4F4F5', fontSize: 12, fontWeight: '600' },
  proxyBtn: {
    minHeight: 46,
    borderRadius: 14,
    backgroundColor: '#CCFF00',
    alignItems: 'center',
    justifyContent: 'center',
  },
  proxyBtnText: { color: '#0F0F0F', fontSize: 13, fontWeight: '800' },
  okText: { color: '#CCFF00', fontSize: 12 },
  errorText: { color: '#FCA5A5', fontSize: 12 },
});
