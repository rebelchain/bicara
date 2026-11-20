import { useEffect, useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
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
  type SwapQuoteResponse,
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
import type { DevnetTransactionRecord, VerifiedContact } from '../../src/services/supabase';
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

type HomeSurfaceMode = 'visual' | 'eyes-free' | 'tools';
type SendModalStep = 'recipient' | 'amount';

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

function formatShortDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch {
    return iso;
  }
}

export default function BicaraHomeScreen() {
  const router = useRouter();
  const { account, connect, disconnect, signAndSendTransaction } = useMobileWallet();
  const {
    walletAddress,
    balances,
    solUsdPrice,
    loadingBalances,
    contacts,
    transactions,
    storageMode,
    pendingSendRecipient,
    setPendingSendRecipient,
    refreshBalances,
    findContactByName,
    logConfirmedTransaction,
  } = useBicaraStore();
  const recorder = useVoiceRecorder();

  const [surfaceMode, setSurfaceMode] = useState<HomeSurfaceMode>('visual');
  const [screenCurtain, setScreenCurtain] = useState(false);

  const [processing, setProcessing] = useState(false);
  const [signing, setSigning] = useState(false);
  const [lastHaptic, setLastHaptic] = useState<HapticEvent | null>(null);
  const [lastSpeech, setLastSpeech] = useState<SpeechTelemetry | null>(null);
  const [pipelineLog, setPipelineLog] = useState<VoicePipelineLog | null>(null);
  const [pipelineError, setPipelineError] = useState<string | null>(null);
  const [pendingTransfer, setPendingTransfer] = useState<PendingTransferPlan | null>(null);
  const [lastReceipt, setLastReceipt] = useState<ConfirmedReceiptBanner | null>(null);
  const [lastSpokenText, setLastSpokenText] = useState<string>(
    EN_VOICE_SCRIPTS.onboardingWelcome()
  );

  // Guided Send Flow Modal state (Select Recipient -> Enter Amount -> Pre-Sign Confirm)
  const [sendModalOpen, setSendModalOpen] = useState(false);
  const [sendStep, setSendStep] = useState<SendModalStep>('recipient');
  const [recipientQuery, setRecipientQuery] = useState('');
  const [selectedRecipient, setSelectedRecipient] = useState<VerifiedContact | null>(null);
  const [sendAsset, setSendAsset] = useState<'SOL' | 'USDC'>('SOL');
  const [sendAmountText, setSendAmountText] = useState('');
  const [preparingPlan, setPreparingPlan] = useState(false);
  const [sendModalError, setSendModalError] = useState<string | null>(null);

  // Verified Swap Quote Modal state (Jupiter Quote-Only Safe Mode)
  const [swapModalOpen, setSwapModalOpen] = useState(false);
  const [swapInputToken, setSwapInputToken] = useState<'USDC' | 'SOL'>('USDC');
  const [swapAmountText, setSwapAmountText] = useState('10');
  const [loadingSwap, setLoadingSwap] = useState(false);
  const [swapResult, setSwapResult] = useState<SwapQuoteResponse | null>(null);
  const [swapError, setSwapError] = useState<string | null>(null);

  // Diagnostics state
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

  // Handoff from Contacts tab ("Send ->" button) straight into Guided Send Step 2 (Enter Amount)
  useEffect(() => {
    if (!pendingSendRecipient) return;
    setSelectedRecipient(pendingSendRecipient);
    setSendStep('amount');
    setSendAmountText('');
    setSendModalError(null);
    setSendModalOpen(true);
    setSurfaceMode('visual');
    setPendingSendRecipient(null);
  }, [pendingSendRecipient, setPendingSendRecipient]);

  const estimatedUsdTotal = useMemo(() => {
    if (!walletAddress || !balances) return null;
    const solUsd = solUsdPrice && solUsdPrice > 0 ? balances.sol * solUsdPrice : 0;
    return balances.usdc + solUsd;
  }, [walletAddress, balances, solUsdPrice]);

  const filteredContacts = useMemo(() => {
    const q = recipientQuery.trim().toLowerCase();
    if (!q) return contacts;
    return contacts.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.recipientAddress.toLowerCase().includes(q)
    );
  }, [contacts, recipientQuery]);

  const recentTransactions = useMemo(() => transactions.slice(0, 3), [transactions]);

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
        const msg = 'No speech detected. Tap to speak and try again.';
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

  // Guided Send Flow handlers
  const handleOpenSendFlow = () => {
    void triggerHaptic('tick');
    setSendModalError(null);
    setRecipientQuery('');
    setSelectedRecipient(null);
    setSendAmountText('');
    setSendStep('recipient');
    setSendModalOpen(true);
  };

  const handleSelectRecipient = (contact: VerifiedContact) => {
    void triggerHaptic('tick');
    setSelectedRecipient(contact);
    setSendModalError(null);
    setSendAmountText('');
    setSendStep('amount');
  };

  const handleApplyPercentage = (pct: number) => {
    void triggerHaptic('tick');
    const available = sendAsset === 'SOL' ? (balances?.sol ?? 0) : (balances?.usdc ?? 0);
    if (available <= 0) {
      setSendAmountText('0');
      return;
    }
    const usable =
      sendAsset === 'SOL' && pct === 1 ? Math.max(0, available - 0.002) : available * pct;
    const formatted = sendAsset === 'SOL' ? usable.toFixed(4) : usable.toFixed(2);
    setSendAmountText(String(Number(formatted)));
  };

  const handleReviewGuidedSend = async () => {
    if (!walletAddress) {
      setSendModalError('Connect your Solflare Devnet wallet first.');
      await announce('Connect your Solflare wallet first using the top right button.', 'error', false);
      return;
    }
    if (!selectedRecipient) {
      setSendModalError('Please choose a verified contact.');
      return;
    }
    const parsedAmount = Number(sendAmountText.replace(',', '.'));
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setSendModalError('Enter a valid amount greater than zero.');
      await announce('Please enter a valid amount greater than zero.', 'error', false);
      return;
    }

    setPreparingPlan(true);
    setSendModalError(null);
    try {
      const plan = await prepareDevnetTransferPlan({
        senderAddress: walletAddress,
        recipientName: selectedRecipient.name,
        recipientAddress: selectedRecipient.recipientAddress,
        isSavedContact: true,
        asset: sendAsset,
        amount: parsedAmount,
      });
      setPendingTransfer(plan);
      setSendModalOpen(false);
      await announce(plan.spokenSummary, 'confirm', true);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to prepare Devnet transfer plan.';
      setSendModalError(msg);
      await announce(msg, 'error', false);
    } finally {
      setPreparingPlan(false);
    }
  };

  // Verified Swap Quote Modal handlers
  const handleOpenSwapModal = () => {
    void triggerHaptic('tick');
    setSwapError(null);
    setSwapResult(null);
    setSwapModalOpen(true);
  };

  const handleFetchVisualSwapQuote = async () => {
    const amount = Number(swapAmountText.replace(',', '.'));
    if (!Number.isFinite(amount) || amount <= 0) {
      setSwapError('Enter an amount greater than zero.');
      return;
    }
    const outputToken = swapInputToken === 'USDC' ? 'SOL' : 'USDC';
    setLoadingSwap(true);
    setSwapError(null);
    try {
      const res = await fetchSwapQuote(swapInputToken, outputToken, amount);
      if ('blocked' in res) {
        setSwapError(res.spokenWarning);
        await announce(res.spokenWarning, 'error', true);
      } else {
        setSwapResult(res);
        const outText =
          res.outAmountUi !== null ? String(res.outAmountUi) : 'an estimated amount';
        const impactAbs = Math.abs(res.priceImpactPct);
        const impactLevel = impactAbs > 2 ? 'high' : impactAbs > 0.5 ? 'moderate' : 'low';
        const slippagePct = Number((res.slippageBps / 100).toFixed(2));
        const spoken =
          `Swap quote ready. Selling ${amount} ${res.inputSymbol} returns about ${outText} ${res.outputSymbol}. ` +
          `Price impact is ${impactLevel}. Maximum slippage is ${slippagePct} percent. Quote-only Devnet safe mode is active.`;
        await announce(spoken, 'confirm', true);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Could not fetch Jupiter swap quote.';
      setSwapError(msg);
      await announce(msg, 'error', false);
    } finally {
      setLoadingSwap(false);
    }
  };

  const handleToggleEyesFree = async () => {
    if (surfaceMode === 'eyes-free') {
      setScreenCurtain(false);
      setSurfaceMode('visual');
      await announce('Switched to Visual Home.', 'tick', false);
    } else {
      setSurfaceMode('eyes-free');
      await announce(
        'Eyes-Free mode active. Tap anywhere on screen to speak. Use Screen Curtain at the top to blank the display.',
        'tick',
        false
      );
    }
  };

  const handleToggleCurtain = async () => {
    const next = !screenCurtain;
    setScreenCurtain(next);
    await announce(
      next
        ? 'Screen Curtain enabled. Display is blacked out. Tap anywhere to speak, or tap the top right corner to restore visuals.'
        : 'Screen Curtain disabled.',
      'tick',
      false
    );
  };

  const handleSpeakActivityItem = (tx: DevnetTransactionRecord) => {
    const line = `Sent ${tx.amount} ${tx.asset} to ${tx.recipientName} on Solana Devnet. Status ${tx.status}. Signature ending ${tx.signature.slice(-4)}.`;
    void announce(line, 'tick', false);
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

  const swapOutputToken = swapInputToken === 'USDC' ? 'SOL' : 'USDC';

  // Reusable Pre-Sign TransactionConfirm Card (Layer 2 + Layer 4 + Layer 5)
  const renderPendingConfirmCard = () => {
    if (!pendingTransfer) return null;
    return (
      <View style={styles.confirmCard}>
        <View style={styles.confirmTopRow}>
          <Text style={styles.confirmKicker}>PRE-SIGN SPOKEN VERIFICATION</Text>
          <Text style={styles.confirmCode}>CODE {pendingTransfer.challengeDigits}</Text>
        </View>
        <Text style={styles.confirmHeadline}>
          Send {pendingTransfer.amount} {pendingTransfer.asset} → {pendingTransfer.recipientName}
        </Text>
        <Text style={styles.confirmMeta}>
          Verified · {truncateAddress(pendingTransfer.recipientAddress, 6, 4)}
        </Text>
        <Text style={styles.confirmMeta}>
          Fee: ~{pendingTransfer.estimatedFeeSol} SOL
          {pendingTransfer.ataNeedsCreation
            ? ` + ~${pendingTransfer.ataRentSol.toFixed(5)} SOL ATA rent`
            : ''}
        </Text>
        {pendingTransfer.anomalies.map((warn, idx) => (
          <Text key={idx} style={styles.anomalyText}>
            ! {warn}
          </Text>
        ))}
        <Text style={styles.confirmHint}>
          Tap Speak &amp; say &ldquo;{pendingTransfer.challengeSpoken}&rdquo;, or tap Confirm &amp; Sign below:
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
    );
  };

  // Full-Screen Curtain Blackout Overlay (MOBILE_SPEC Screen Curtain privacy mode)
  if (surfaceMode === 'eyes-free' && screenCurtain) {
    return (
      <SafeAreaView style={styles.curtainSafe} edges={['top', 'bottom']}>
        <View style={styles.curtainTopBar}>
          <Text style={styles.curtainMuted}>Screen Curtain Active</Text>
          <Pressable
            onPress={() => void handleToggleCurtain()}
            accessibilityRole="button"
            accessibilityLabel="Disable Screen Curtain and restore visual interface"
            style={styles.curtainExitBtn}
          >
            <Text style={styles.curtainExitText}>Show Screen</Text>
          </Pressable>
        </View>
        <Pressable
          onPress={() => void handleTapAnywhereToggle()}
          accessibilityRole="button"
          accessibilityLabel={
            recorder.isRecording
              ? 'Listening in Screen Curtain mode. Tap anywhere to send voice command.'
              : 'Screen Curtain active. Tap anywhere to speak a command.'
          }
          style={styles.curtainCanvas}
        >
          <Text style={styles.curtainStatus}>
            {recorder.isRecording
              ? 'LISTENING...'
              : signing
                ? 'SOLFLARE AUTHORIZATION...'
                : processing
                  ? 'PROCESSING...'
                  : 'TAP ANYWHERE TO SPEAK'}
          </Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Compact Brand Header */}
      <View style={styles.header}>
        <View style={styles.brandRow}>
          <View style={styles.brandBadge}>
            <Text style={styles.brandBadgeText}>B</Text>
          </View>
          <View>
            <Text style={styles.brand}>Bicara</Text>
            <Text style={styles.kicker}>Solana Devnet</Text>
          </View>
        </View>
        <View style={styles.headerActions}>
          <Pressable
            onPress={() => {
              void triggerHaptic('tick');
              setSurfaceMode((prev) => (prev === 'tools' ? 'visual' : 'tools'));
            }}
            accessibilityRole="button"
            accessibilityLabel={surfaceMode === 'tools' ? 'Back to Home' : 'Open diagnostics tools'}
            style={[
              styles.toolsToggleBtn,
              surfaceMode === 'tools' ? styles.toolsToggleBtnActive : undefined,
            ]}
          >
            <Text
              style={[
                styles.toolsToggleText,
                surfaceMode === 'tools' ? styles.toolsToggleTextActive : undefined,
              ]}
            >
              {surfaceMode === 'tools' ? 'Home' : 'Tools'}
            </Text>
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

      {/* SURFACE 1: VISUAL HOME (Aligned to 01-bicara-app-home) */}
      {surfaceMode === 'visual' ? (
        <ScrollView
          contentContainerStyle={styles.visualScroll}
          showsVerticalScrollIndicator={false}
        >
          {/* Total Devnet Portfolio Card */}
          <Pressable
            onPress={() => void refreshBalances()}
            accessibilityRole="button"
            accessibilityLabel="Refresh live Solana Devnet portfolio balance"
            style={styles.portfolioCard}
          >
            <View style={styles.portfolioTopRow}>
              <Text style={styles.portfolioLabel}>DEVNET PORTFOLIO</Text>
              <Text style={styles.storageLabel}>
                {storageMode === 'supabase' ? 'Supabase Sync' : 'Local Cache'}
              </Text>
            </View>

            {walletAddress ? (
              <>
                <Text style={styles.portfolioUsd}>
                  {loadingBalances && !balances
                    ? 'Syncing...'
                    : estimatedUsdTotal !== null
                      ? `$${estimatedUsdTotal.toLocaleString('en-US', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}`
                      : `${(balances?.sol ?? 0).toFixed(4)} SOL`}
                </Text>
                <View style={styles.balanceSplitRow}>
                  <Text style={styles.balanceToken}>
                    {(balances?.sol ?? 0).toFixed(4)} SOL
                  </Text>
                  <Text style={styles.balanceDivider}>·</Text>
                  <Text style={styles.balanceToken}>
                    {(balances?.usdc ?? 0).toFixed(2)} USDC
                  </Text>
                  <Text style={styles.balanceRefreshHint}>
                    {loadingBalances ? 'Updating...' : 'Tap to refresh ↻'}
                  </Text>
                </View>
              </>
            ) : (
              <View style={styles.disconnectedPortfolio}>
                <Text style={styles.disconnectedTitle}>Wallet not connected</Text>
                <Text style={styles.disconnectedSub}>
                  Tap Connect MWA above to view live Solana Devnet SOL &amp; USDC balances.
                </Text>
              </View>
            )}
          </Pressable>

          {/* 3-Column Quick Actions (Send, Swap Quote, Eyes-Free) */}
          <View style={styles.quickActionsGrid}>
            <Pressable
              onPress={handleOpenSendFlow}
              accessibilityRole="button"
              accessibilityLabel="Send SOL or USDC to a verified contact"
              style={styles.quickActionTile}
            >
              <View style={[styles.quickIconBox, styles.quickIconLime]}>
                <Text style={styles.quickIconDarkText}>↗</Text>
              </View>
              <Text style={styles.quickActionLabel}>Send</Text>
              <Text style={styles.quickActionSub}>SOL · USDC</Text>
            </Pressable>

            <Pressable
              onPress={handleOpenSwapModal}
              accessibilityRole="button"
              accessibilityLabel="Get a verified spoken swap quote for USDC and SOL"
              style={styles.quickActionTile}
            >
              <View style={[styles.quickIconBox, styles.quickIconPurple]}>
                <Text style={styles.quickIconLightText}>⇄</Text>
              </View>
              <Text style={styles.quickActionLabel}>Swap Quote</Text>
              <Text style={styles.quickActionSub}>USDC ↔ SOL</Text>
            </Pressable>

            <Pressable
              onPress={() => void handleToggleEyesFree()}
              accessibilityRole="button"
              accessibilityLabel="Enter Eyes-Free Tap-Anywhere voice canvas and Screen Curtain mode"
              style={styles.quickActionTile}
            >
              <View style={[styles.quickIconBox, styles.quickIconOutline]}>
                <Text style={styles.quickIconLimeText}>●</Text>
              </View>
              <Text style={styles.quickActionLabel}>Eyes-Free</Text>
              <Text style={styles.quickActionSub}>Tap-Anywhere</Text>
            </Pressable>
          </View>

          {/* Primary Spoken Command Banner */}
          <Pressable
            onPress={() => void handleTapAnywhereToggle()}
            accessibilityRole="button"
            accessibilityLabel={
              recorder.isRecording
                ? EN_UI_COPY.home.stopRecordingA11y
                : EN_UI_COPY.home.startRecordingA11y
            }
            style={[
              styles.voiceBanner,
              recorder.isRecording ? styles.voiceBannerRecording : undefined,
            ]}
          >
            <View style={styles.voiceBannerRow}>
              <View
                style={[
                  styles.voiceOrbSmall,
                  recorder.isRecording
                    ? styles.micCircleActive
                    : processing || signing
                      ? styles.micCircleProcessing
                      : undefined,
                ]}
              >
                <Text style={styles.voiceOrbSmallText}>
                  {recorder.isRecording
                    ? 'STOP'
                    : signing
                      ? 'SIGN'
                      : processing
                        ? 'WAIT'
                        : 'SPEAK'}
                </Text>
              </View>
              <View style={styles.voiceBannerBody}>
                <Text style={styles.voiceBannerTitle}>
                  {recorder.isRecording
                    ? 'Listening... tap to send'
                    : signing
                      ? 'Authorizing in Solflare...'
                      : processing
                        ? 'Understanding your voice...'
                        : pendingTransfer
                          ? `Say "${pendingTransfer.challengeSpoken}" to confirm`
                          : 'Tap to Speak a Transaction'}
                </Text>
                <Text style={styles.voiceBannerSub} numberOfLines={2}>
                  {pipelineLog
                    ? `"${pipelineLog.transcript}" → ${pipelineLog.replyText}`
                    : 'Try: "Check balance" · "Send 0.01 SOL to Ahmad" · "Swap 10 USDC to SOL"'}
                </Text>
              </View>
            </View>
            {pipelineError ? <Text style={styles.errorText}>{pipelineError}</Text> : null}
            {recorder.error ? <Text style={styles.errorText}>{recorder.error}</Text> : null}
          </Pressable>

          {/* Active Pre-Sign Confirmation Card (Layer 2 / 4 / 5) */}
          {renderPendingConfirmCard()}

          {/* Latest Confirmed Devnet Receipt Banner */}
          {lastReceipt ? (
            <Pressable
              onPress={() => void Linking.openURL(lastReceipt.explorerUrl)}
              accessibilityRole="link"
              accessibilityLabel="Open confirmed transaction on Solana Devnet Explorer"
              style={styles.receiptBanner}
            >
              <Text style={styles.receiptTitle}>
                ✓ Confirmed: {lastReceipt.amount} {lastReceipt.asset} → {lastReceipt.recipientName}
              </Text>
              <Text style={styles.receiptSig}>
                Sig: {truncateAddress(lastReceipt.signature, 8, 8)} · Open Explorer ↗
              </Text>
            </Pressable>
          ) : null}

          {/* Recent Activity Section */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Activity</Text>
            <Pressable
              onPress={() => {
                void triggerHaptic('tick');
                router.push('/(tabs)/history');
              }}
              accessibilityRole="button"
              accessibilityLabel="See all transaction history"
              style={styles.seeAllBtn}
            >
              <Text style={styles.seeAllText}>See All</Text>
            </Pressable>
          </View>

          {recentTransactions.length === 0 ? (
            <View style={styles.emptyActivityCard}>
              <Text style={styles.emptyActivityTitle}>No Devnet transfers yet</Text>
              <Text style={styles.emptyActivitySub}>
                Add a verified contact in Contacts, then use Send or Tap to Speak to broadcast a live Devnet transaction.
              </Text>
            </View>
          ) : (
            <View style={styles.activityList}>
              {recentTransactions.map((tx) => (
                <Pressable
                  key={tx.id}
                  onPress={() => handleSpeakActivityItem(tx)}
                  accessibilityRole="button"
                  accessibilityLabel={`Sent ${tx.amount} ${tx.asset} to ${tx.recipientName}. Tap to hear receipt.`}
                  style={styles.activityRow}
                >
                  <View style={styles.activityAvatar}>
                    <Text style={styles.activityAvatarText}>{getInitials(tx.recipientName)}</Text>
                  </View>
                  <View style={styles.activityMeta}>
                    <Text style={styles.activityName} numberOfLines={1}>
                      {tx.recipientName}
                    </Text>
                    <Text style={styles.activitySub}>
                      {formatShortDate(tx.createdAt)} · {truncateAddress(tx.signature, 4, 4)}
                    </Text>
                  </View>
                  <View style={styles.activityAmountCol}>
                    <Text style={styles.activityAmount}>
                      -{tx.amount} {tx.asset}
                    </Text>
                    <Text style={styles.activityStatus}>Confirmed</Text>
                  </View>
                </Pressable>
              ))}
            </View>
          )}

          {/* Compact Live Latency Footnote when pipeline has run */}
          {pipelineLog ? (
            <View style={styles.latencyFootnote}>
              <Text style={styles.latencyText}>
                STT {pipelineLog.sttMs}ms · NLU {pipelineLog.nluMs}ms
                {lastSpeech ? ` · TTS ${lastSpeech.latencyMs}ms (${lastSpeech.engine})` : ''}
                {pipelineLog.extraLatencyLabel ? ` · ${pipelineLog.extraLatencyLabel}` : ''}
              </Text>
            </View>
          ) : null}
        </ScrollView>
      ) : surfaceMode === 'eyes-free' ? (
        /* SURFACE 2: FULL-SCREEN EYES-FREE TAP-ANYWHERE CANVAS (MOBILE_SPEC) */
        <View style={styles.eyesFreeWrapper}>
          <View style={styles.eyesFreeBar}>
            <Pressable
              onPress={() => void handleToggleEyesFree()}
              accessibilityRole="button"
              accessibilityLabel="Switch back to Visual Home mode"
              style={styles.eyesFreeBarBtn}
            >
              <Text style={styles.eyesFreeBarBtnText}>← Visual Home</Text>
            </Pressable>
            <Pressable
              onPress={() => void handleToggleCurtain()}
              accessibilityRole="button"
              accessibilityLabel="Enable Screen Curtain to black out display while keeping voice active"
              style={styles.curtainToggleBtn}
            >
              <Text style={styles.curtainToggleText}>Screen Curtain</Text>
            </Pressable>
          </View>

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
            {renderPendingConfirmCard()}

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
                Say: &ldquo;Check balance&rdquo; · &ldquo;Send 0.01 SOL to Ahmad&rdquo; · &ldquo;Swap 10 USDC to SOL&rdquo;
              </Text>
            </View>

            <View style={styles.spokenCaptionBox}>
              <Text style={styles.spokenCaptionLabel}>LAST SPOKEN</Text>
              <Text style={styles.spokenCaptionText} numberOfLines={3}>
                {lastSpokenText}
              </Text>
            </View>
          </Pressable>
        </View>
      ) : (
        /* SURFACE 3: COLLAPSIBLE DIAGNOSTICS (TOOLS) */
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

      {/* GUIDED SEND MODAL: Step 1 (Select Recipient) -> Step 2 (Enter Amount) */}
      <Modal
        visible={sendModalOpen}
        animationType="slide"
        onRequestClose={() => setSendModalOpen(false)}
      >
        <SafeAreaView style={styles.modalSafe} edges={['top', 'bottom']}>
          <KeyboardAvoidingView
            style={styles.flexOne}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          >
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <Pressable
                onPress={() => {
                  if (sendStep === 'amount') {
                    setSendStep('recipient');
                    setSendModalError(null);
                  } else {
                    setSendModalOpen(false);
                  }
                }}
                accessibilityRole="button"
                accessibilityLabel={sendStep === 'amount' ? 'Back to recipient list' : 'Close Send modal'}
                style={styles.modalBackBtn}
              >
                <Text style={styles.modalBackText}>←</Text>
              </Pressable>
              <Text style={styles.modalTitle}>
                {sendStep === 'recipient' ? 'Select Recipient' : 'Enter Amount'}
              </Text>
              <Pressable
                onPress={() => setSendModalOpen(false)}
                accessibilityRole="button"
                accessibilityLabel="Cancel Send"
                style={styles.modalCloseBtn}
              >
                <Text style={styles.modalCloseText}>Cancel</Text>
              </Pressable>
            </View>

            {sendStep === 'recipient' ? (
              /* STEP 1: SELECT VERIFIED RECIPIENT */
              <ScrollView
                contentContainerStyle={styles.modalBody}
                keyboardShouldPersistTaps="handled"
              >
                <TextInput
                  value={recipientQuery}
                  onChangeText={setRecipientQuery}
                  placeholder="Search verified contacts..."
                  placeholderTextColor="#71717A"
                  style={styles.searchInput}
                />

                <Pressable
                  onPress={() => {
                    setSendModalOpen(false);
                    router.push('/(tabs)/contacts');
                  }}
                  accessibilityRole="button"
                  accessibilityLabel="Add a new manually verified contact in Contacts tab"
                  style={styles.addRecipientLink}
                >
                  <Text style={styles.addRecipientLinkText}>+ Add New Verified Contact</Text>
                  <Text style={styles.addRecipientLinkSub}>Manual verification in Contacts tab</Text>
                </Pressable>

                <Text style={styles.modalSectionLabel}>
                  VERIFIED CONTACTS ({filteredContacts.length})
                </Text>

                {filteredContacts.length === 0 ? (
                  <View style={styles.emptyModalCard}>
                    <Text style={styles.emptyActivityTitle}>No verified contacts found</Text>
                    <Text style={styles.emptyActivitySub}>
                      Add a verified recipient in the Contacts tab first. Voice and guided sends only allow verified contacts to stop blind signing.
                    </Text>
                  </View>
                ) : (
                  filteredContacts.map((contact) => (
                    <Pressable
                      key={contact.id}
                      onPress={() => handleSelectRecipient(contact)}
                      accessibilityRole="button"
                      accessibilityLabel={`Send to ${contact.name}`}
                      style={styles.recipientRow}
                    >
                      <View style={styles.activityAvatar}>
                        <Text style={styles.activityAvatarText}>{getInitials(contact.name)}</Text>
                      </View>
                      <View style={styles.activityMeta}>
                        <Text style={styles.activityName}>{contact.name}</Text>
                        <Text style={styles.activitySub}>
                          Verified · {truncateAddress(contact.recipientAddress, 6, 4)}
                        </Text>
                      </View>
                      <Text style={styles.recipientArrow}>→</Text>
                    </Pressable>
                  ))
                )}
              </ScrollView>
            ) : (
              /* STEP 2: ENTER AMOUNT (Aligned to 03-bicara-enter-amount) */
              <ScrollView
                contentContainerStyle={styles.modalBody}
                keyboardShouldPersistTaps="handled"
              >
                {selectedRecipient ? (
                  <View style={styles.selectedRecipientCard}>
                    <View style={styles.activityAvatar}>
                      <Text style={styles.activityAvatarText}>
                        {getInitials(selectedRecipient.name)}
                      </Text>
                    </View>
                    <View style={styles.activityMeta}>
                      <Text style={styles.activityName}>{selectedRecipient.name}</Text>
                      <Text style={styles.activitySub}>
                        Verified · {truncateAddress(selectedRecipient.recipientAddress, 6, 4)}
                      </Text>
                    </View>
                  </View>
                ) : null}

                {/* Asset Toggle (SOL / USDC) */}
                <View style={styles.assetToggleRow}>
                  {(['SOL', 'USDC'] as const).map((asset) => {
                    const active = sendAsset === asset;
                    return (
                      <Pressable
                        key={asset}
                        onPress={() => {
                          void triggerHaptic('tick');
                          setSendAsset(asset);
                        }}
                        accessibilityRole="button"
                        accessibilityLabel={`Select ${asset}`}
                        style={[styles.assetPill, active ? styles.assetPillActive : undefined]}
                      >
                        <Text
                          style={[
                            styles.assetPillText,
                            active ? styles.assetPillTextActive : undefined,
                          ]}
                        >
                          {asset}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>

                {/* Available Balance Strip */}
                <View style={styles.availableStrip}>
                  <Text style={styles.availableLabel}>Available Devnet Balance</Text>
                  <Text style={styles.availableValue}>
                    {sendAsset === 'SOL'
                      ? `${(balances?.sol ?? 0).toFixed(4)} SOL`
                      : `${(balances?.usdc ?? 0).toFixed(2)} USDC`}
                  </Text>
                </View>

                {/* Large Centered Amount Input */}
                <View style={styles.amountInputWrap}>
                  <TextInput
                    value={sendAmountText}
                    onChangeText={setSendAmountText}
                    keyboardType="decimal-pad"
                    placeholder="0.00"
                    placeholderTextColor="#52525B"
                    style={styles.amountInput}
                    accessibilityLabel={`Amount in ${sendAsset}`}
                  />
                  <Text style={styles.amountAssetSuffix}>{sendAsset}</Text>
                </View>

                {/* Quick Percentage Buttons */}
                <View style={styles.pctRow}>
                  {[
                    { label: '25%', pct: 0.25 },
                    { label: '50%', pct: 0.5 },
                    { label: 'Max', pct: 1 },
                  ].map((opt) => (
                    <Pressable
                      key={opt.label}
                      onPress={() => handleApplyPercentage(opt.pct)}
                      accessibilityRole="button"
                      accessibilityLabel={`Set amount to ${opt.label} of balance`}
                      style={styles.pctBtn}
                    >
                      <Text style={styles.pctBtnText}>{opt.label}</Text>
                    </Pressable>
                  ))}
                </View>

                {/* Fee & Safety Notice */}
                <View style={styles.feeBox}>
                  <Text style={styles.feeLine}>
                    Estimated network fee: ~0.000005 SOL
                  </Text>
                  <Text style={styles.feeSub}>
                    Next step speaks recipient, address, exact fee, and ATA rent aloud before Solflare hardware signing.
                  </Text>
                </View>

                {sendModalError ? <Text style={styles.errorText}>{sendModalError}</Text> : null}

                <Pressable
                  onPress={() => void handleReviewGuidedSend()}
                  disabled={preparingPlan}
                  accessibilityRole="button"
                  accessibilityLabel="Review transaction and hear spoken summary"
                  style={styles.primaryModalBtn}
                >
                  <Text style={styles.primaryModalBtnText}>
                    {preparingPlan ? 'Running Devnet Pre-Flight...' : 'Review & Hear Summary'}
                  </Text>
                </Pressable>
              </ScrollView>
            )}
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>

      {/* VERIFIED SWAP QUOTE MODAL (Jupiter Quote-Only Safe Mode) */}
      <Modal
        visible={swapModalOpen}
        animationType="slide"
        onRequestClose={() => setSwapModalOpen(false)}
      >
        <SafeAreaView style={styles.modalSafe} edges={['top', 'bottom']}>
          <View style={styles.modalHeader}>
            <Pressable
              onPress={() => setSwapModalOpen(false)}
              accessibilityRole="button"
              accessibilityLabel="Close Swap Quote modal"
              style={styles.modalBackBtn}
            >
              <Text style={styles.modalBackText}>←</Text>
            </Pressable>
            <Text style={styles.modalTitle}>Verified Swap Quote</Text>
            <View style={styles.modalSpacer} />
          </View>

          <ScrollView
            contentContainerStyle={styles.modalBody}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.swapPairCard}>
              <View>
                <Text style={styles.swapPairLabel}>ALLOWLISTED PAIR</Text>
                <Text style={styles.swapPairValue}>
                  {swapInputToken} → {swapOutputToken}
                </Text>
              </View>
              <Pressable
                onPress={() => {
                  void triggerHaptic('tick');
                  setSwapInputToken((prev) => (prev === 'USDC' ? 'SOL' : 'USDC'));
                  setSwapResult(null);
                }}
                accessibilityRole="button"
                accessibilityLabel="Flip swap direction"
                style={styles.flipBtn}
              >
                <Text style={styles.flipBtnText}>⇄ Flip</Text>
              </Pressable>
            </View>

            <View style={styles.amountInputWrap}>
              <TextInput
                value={swapAmountText}
                onChangeText={setSwapAmountText}
                keyboardType="decimal-pad"
                placeholder="10"
                placeholderTextColor="#52525B"
                style={styles.amountInput}
                accessibilityLabel={`Swap input amount in ${swapInputToken}`}
              />
              <Text style={styles.amountAssetSuffix}>{swapInputToken}</Text>
            </View>

            <Pressable
              onPress={() => void handleFetchVisualSwapQuote()}
              disabled={loadingSwap}
              accessibilityRole="button"
              accessibilityLabel="Fetch live Jupiter swap quote and read aloud"
              style={styles.primaryModalBtn}
            >
              <Text style={styles.primaryModalBtnText}>
                {loadingSwap ? 'Fetching Live Quote...' : 'Get Spoken Quote'}
              </Text>
            </Pressable>

            {swapError ? <Text style={styles.errorText}>{swapError}</Text> : null}

            {swapResult ? (
              <View style={styles.swapQuoteCard}>
                <Text style={styles.confirmKicker}>QUOTE-ONLY DEVNET SAFE MODE</Text>
                <Text style={styles.swapResultHeadline}>
                  {swapAmountText} {swapResult.inputSymbol} ≈ {swapResult.outAmountUi ?? '—'}{' '}
                  {swapResult.outputSymbol}
                </Text>
                <Text style={styles.confirmMeta}>
                  Router: {swapResult.router} · Latency: {swapResult.latencyMs}ms
                </Text>
                <Text style={styles.confirmMeta}>
                  Price Impact: {swapResult.priceImpactPct.toFixed(4)}% · Max Slippage:{' '}
                  {(swapResult.slippageBps / 100).toFixed(2)}%
                </Text>
                <Text style={styles.feeSub}>
                  No mainnet funds move. Live swap quotes verify real Jupiter routes before execution.
                </Text>
              </View>
            ) : null}
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0F0F0F' },
  flexOne: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1F1F23',
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  brandBadge: {
    width: 36,
    height: 36,
    borderRadius: 11,
    backgroundColor: '#CCFF00',
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandBadgeText: {
    color: '#0F0F0F',
    fontSize: 18,
    fontWeight: '900',
  },
  brand: { fontSize: 19, fontWeight: '800', color: '#F4F4F5', letterSpacing: -0.4 },
  kicker: { fontSize: 11, color: '#A1A1AA', fontWeight: '600' },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  toolsToggleBtn: {
    minHeight: 40,
    paddingHorizontal: 13,
    borderRadius: 12,
    backgroundColor: '#1A1A1A',
    borderWidth: 1,
    borderColor: '#2E2E2E',
    justifyContent: 'center',
  },
  toolsToggleBtnActive: {
    borderColor: '#CCFF00',
  },
  toolsToggleText: { fontSize: 12, fontWeight: '600', color: '#D4D4D8' },
  toolsToggleTextActive: { color: '#CCFF00' },
  walletBtn: {
    minHeight: 40,
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

  /* Visual Home Scroll */
  visualScroll: {
    padding: 20,
    paddingBottom: 32,
    gap: 16,
  },
  portfolioCard: {
    backgroundColor: '#1A1A1A',
    borderWidth: 1,
    borderColor: '#27272A',
    borderRadius: 24,
    padding: 20,
    gap: 10,
  },
  portfolioTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  portfolioLabel: {
    color: '#A1A1AA',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  storageLabel: {
    color: '#CCFF00',
    fontSize: 11,
    fontWeight: '700',
  },
  portfolioUsd: {
    color: '#F4F4F5',
    fontSize: 38,
    fontWeight: '900',
    letterSpacing: -1,
  },
  balanceSplitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  balanceToken: {
    color: '#D4D4D8',
    fontSize: 13,
    fontFamily: 'monospace',
    fontWeight: '700',
  },
  balanceDivider: {
    color: '#52525B',
    fontSize: 13,
  },
  balanceRefreshHint: {
    color: '#71717A',
    fontSize: 11,
    marginLeft: 'auto',
  },
  disconnectedPortfolio: {
    gap: 4,
    paddingVertical: 4,
  },
  disconnectedTitle: {
    color: '#F4F4F5',
    fontSize: 22,
    fontWeight: '800',
  },
  disconnectedSub: {
    color: '#A1A1AA',
    fontSize: 13,
    lineHeight: 19,
  },

  /* 3-Column Quick Actions */
  quickActionsGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  quickActionTile: {
    flex: 1,
    backgroundColor: '#1A1A1A',
    borderWidth: 1,
    borderColor: '#27272A',
    borderRadius: 20,
    paddingVertical: 14,
    paddingHorizontal: 10,
    alignItems: 'center',
    gap: 7,
  },
  quickIconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickIconLime: {
    backgroundColor: '#CCFF00',
  },
  quickIconPurple: {
    backgroundColor: '#A855F7',
  },
  quickIconOutline: {
    backgroundColor: '#121212',
    borderWidth: 1.5,
    borderColor: '#CCFF00',
  },
  quickIconDarkText: {
    color: '#0F0F0F',
    fontSize: 20,
    fontWeight: '900',
  },
  quickIconLightText: {
    color: '#FFFFFF',
    fontSize: 19,
    fontWeight: '900',
  },
  quickIconLimeText: {
    color: '#CCFF00',
    fontSize: 18,
    fontWeight: '900',
  },
  quickActionLabel: {
    color: '#F4F4F5',
    fontSize: 13,
    fontWeight: '800',
  },
  quickActionSub: {
    color: '#A1A1AA',
    fontSize: 10,
    fontWeight: '600',
  },

  /* Primary Voice Command Banner */
  voiceBanner: {
    backgroundColor: '#1A1A1A',
    borderWidth: 1.5,
    borderColor: 'rgba(204, 255, 0, 0.45)',
    borderRadius: 24,
    padding: 16,
    gap: 10,
  },
  voiceBannerRecording: {
    backgroundColor: '#241115',
    borderColor: '#EF4444',
  },
  voiceBannerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  voiceOrbSmall: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: '#CCFF00',
    alignItems: 'center',
    justifyContent: 'center',
  },
  voiceOrbSmallText: {
    color: '#0F0F0F',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.6,
  },
  voiceBannerBody: {
    flex: 1,
    gap: 4,
  },
  voiceBannerTitle: {
    color: '#F4F4F5',
    fontSize: 16,
    fontWeight: '800',
  },
  voiceBannerSub: {
    color: '#A1A1AA',
    fontSize: 12,
    lineHeight: 17,
  },

  /* Pre-Sign Confirmation Card */
  confirmCard: {
    backgroundColor: '#1A1A1A',
    borderWidth: 1.5,
    borderColor: '#CCFF00',
    borderRadius: 22,
    padding: 16,
    gap: 7,
  },
  confirmTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  confirmKicker: {
    color: '#A855F7',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  confirmCode: {
    color: '#CCFF00',
    fontSize: 12,
    fontFamily: 'monospace',
    fontWeight: '800',
  },
  confirmHeadline: {
    color: '#F4F4F5',
    fontSize: 18,
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

  /* Confirmed Receipt Banner */
  receiptBanner: {
    backgroundColor: '#161C12',
    borderWidth: 1,
    borderColor: 'rgba(204, 255, 0, 0.35)',
    borderRadius: 18,
    padding: 14,
    gap: 3,
  },
  receiptTitle: { color: '#CCFF00', fontSize: 13, fontWeight: '700' },
  receiptSig: { color: '#93C5FD', fontSize: 11, fontFamily: 'monospace' },

  /* Recent Activity */
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  sectionTitle: {
    color: '#F4F4F5',
    fontSize: 17,
    fontWeight: '800',
  },
  seeAllBtn: {
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  seeAllText: {
    color: '#CCFF00',
    fontSize: 13,
    fontWeight: '700',
  },
  emptyActivityCard: {
    backgroundColor: '#1A1A1A',
    borderWidth: 1,
    borderColor: '#262626',
    borderRadius: 20,
    padding: 18,
    gap: 6,
  },
  emptyActivityTitle: {
    color: '#F4F4F5',
    fontSize: 14,
    fontWeight: '700',
  },
  emptyActivitySub: {
    color: '#A1A1AA',
    fontSize: 12,
    lineHeight: 18,
  },
  activityList: {
    gap: 10,
  },
  activityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A1A1A',
    borderWidth: 1,
    borderColor: '#262626',
    borderRadius: 20,
    padding: 14,
    gap: 12,
  },
  activityAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#262626',
    borderWidth: 1,
    borderColor: 'rgba(204, 255, 0, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  activityAvatarText: {
    color: '#CCFF00',
    fontSize: 14,
    fontWeight: '800',
  },
  activityMeta: {
    flex: 1,
    gap: 2,
  },
  activityName: {
    color: '#F4F4F5',
    fontSize: 15,
    fontWeight: '700',
  },
  activitySub: {
    color: '#A1A1AA',
    fontSize: 12,
    fontFamily: 'monospace',
  },
  activityAmountCol: {
    alignItems: 'flex-end',
    gap: 2,
  },
  activityAmount: {
    color: '#F4F4F5',
    fontSize: 14,
    fontWeight: '800',
  },
  activityStatus: {
    color: '#CCFF00',
    fontSize: 11,
    fontWeight: '700',
  },
  latencyFootnote: {
    paddingTop: 4,
    alignItems: 'center',
  },
  latencyText: {
    color: '#71717A',
    fontSize: 11,
    fontFamily: 'monospace',
    textAlign: 'center',
  },

  /* Eyes-Free Surface + Screen Curtain */
  eyesFreeWrapper: {
    flex: 1,
    backgroundColor: '#0F0F0F',
  },
  eyesFreeBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#161616',
    borderBottomWidth: 1,
    borderBottomColor: '#262626',
  },
  eyesFreeBarBtn: {
    minHeight: 40,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: '#1A1A1A',
    borderWidth: 1,
    borderColor: '#2E2E2E',
    justifyContent: 'center',
  },
  eyesFreeBarBtnText: {
    color: '#F4F4F5',
    fontSize: 12,
    fontWeight: '700',
  },
  curtainToggleBtn: {
    minHeight: 40,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: '#000000',
    borderWidth: 1,
    borderColor: '#CCFF00',
    justifyContent: 'center',
  },
  curtainToggleText: {
    color: '#CCFF00',
    fontSize: 12,
    fontWeight: '800',
  },
  fullCanvas: {
    flex: 1,
    padding: 20,
    justifyContent: 'space-between',
    backgroundColor: '#0F0F0F',
    gap: 14,
  },
  fullCanvasRecording: {
    backgroundColor: '#1C0E12',
  },
  centerBlock: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  micCircle: {
    width: 138,
    height: 138,
    borderRadius: 69,
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
  micLabel: { color: '#0F0F0F', fontSize: 20, fontWeight: '900', letterSpacing: 0.8 },
  canvasTitle: { color: '#F4F4F5', fontSize: 19, fontWeight: '800', textAlign: 'center' },
  canvasSub: { color: '#A1A1AA', fontSize: 13, textAlign: 'center', lineHeight: 20 },
  spokenCaptionBox: {
    backgroundColor: '#1A1A1A',
    borderWidth: 1,
    borderColor: '#262626',
    borderRadius: 18,
    padding: 14,
    gap: 4,
  },
  spokenCaptionLabel: {
    color: '#CCFF00',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  spokenCaptionText: {
    color: '#D4D4D8',
    fontSize: 13,
    lineHeight: 19,
  },

  /* Pure Black Screen Curtain Mode */
  curtainSafe: {
    flex: 1,
    backgroundColor: '#000000',
  },
  curtainTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  curtainMuted: {
    color: '#3F3F46',
    fontSize: 12,
    fontWeight: '700',
  },
  curtainExitBtn: {
    minHeight: 44,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#3F3F46',
    justifyContent: 'center',
  },
  curtainExitText: {
    color: '#A1A1AA',
    fontSize: 12,
    fontWeight: '700',
  },
  curtainCanvas: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  curtainStatus: {
    color: '#27272A',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 1.5,
  },

  /* Modals (Guided Send & Swap Quote) */
  modalSafe: {
    flex: 1,
    backgroundColor: '#0F0F0F',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#1F1F23',
  },
  modalBackBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#1A1A1A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBackText: {
    color: '#F4F4F5',
    fontSize: 20,
    fontWeight: '700',
  },
  modalTitle: {
    color: '#F4F4F5',
    fontSize: 18,
    fontWeight: '800',
  },
  modalCloseBtn: {
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  modalCloseText: {
    color: '#A1A1AA',
    fontSize: 14,
    fontWeight: '600',
  },
  modalSpacer: {
    width: 44,
  },
  modalBody: {
    padding: 20,
    gap: 14,
  },
  searchInput: {
    minHeight: 50,
    borderRadius: 16,
    backgroundColor: '#1A1A1A',
    borderWidth: 1,
    borderColor: '#27272A',
    paddingHorizontal: 16,
    color: '#F4F4F5',
    fontSize: 15,
  },
  addRecipientLink: {
    backgroundColor: '#1A1A1A',
    borderWidth: 1,
    borderColor: 'rgba(204, 255, 0, 0.35)',
    borderRadius: 18,
    padding: 14,
    gap: 3,
  },
  addRecipientLinkText: {
    color: '#CCFF00',
    fontSize: 14,
    fontWeight: '800',
  },
  addRecipientLinkSub: {
    color: '#A1A1AA',
    fontSize: 12,
  },
  modalSectionLabel: {
    color: '#A1A1AA',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginTop: 4,
  },
  emptyModalCard: {
    backgroundColor: '#1A1A1A',
    borderWidth: 1,
    borderColor: '#262626',
    borderRadius: 18,
    padding: 16,
    gap: 6,
  },
  recipientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A1A1A',
    borderWidth: 1,
    borderColor: '#27272A',
    borderRadius: 20,
    padding: 14,
    gap: 12,
  },
  recipientArrow: {
    color: '#CCFF00',
    fontSize: 18,
    fontWeight: '800',
  },
  selectedRecipientCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A1A1A',
    borderWidth: 1,
    borderColor: 'rgba(204, 255, 0, 0.3)',
    borderRadius: 20,
    padding: 14,
    gap: 12,
  },
  assetToggleRow: {
    flexDirection: 'row',
    gap: 10,
  },
  assetPill: {
    flex: 1,
    minHeight: 46,
    borderRadius: 14,
    backgroundColor: '#1A1A1A',
    borderWidth: 1,
    borderColor: '#27272A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  assetPillActive: {
    backgroundColor: '#CCFF00',
    borderColor: '#CCFF00',
  },
  assetPillText: {
    color: '#D4D4D8',
    fontSize: 14,
    fontWeight: '800',
  },
  assetPillTextActive: {
    color: '#0F0F0F',
  },
  availableStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#161616',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  availableLabel: {
    color: '#A1A1AA',
    fontSize: 12,
    fontWeight: '600',
  },
  availableValue: {
    color: '#F4F4F5',
    fontSize: 13,
    fontFamily: 'monospace',
    fontWeight: '700',
  },
  amountInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1A1A1A',
    borderWidth: 1.5,
    borderColor: '#27272A',
    borderRadius: 22,
    paddingHorizontal: 20,
    paddingVertical: 18,
    gap: 10,
  },
  amountInput: {
    flex: 1,
    color: '#F4F4F5',
    fontSize: 38,
    fontWeight: '900',
    textAlign: 'center',
  },
  amountAssetSuffix: {
    color: '#CCFF00',
    fontSize: 18,
    fontWeight: '800',
  },
  pctRow: {
    flexDirection: 'row',
    gap: 10,
  },
  pctBtn: {
    flex: 1,
    minHeight: 44,
    borderRadius: 14,
    backgroundColor: '#1A1A1A',
    borderWidth: 1,
    borderColor: '#27272A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pctBtnText: {
    color: '#F4F4F5',
    fontSize: 13,
    fontWeight: '700',
  },
  feeBox: {
    backgroundColor: '#161616',
    borderRadius: 16,
    padding: 14,
    gap: 4,
  },
  feeLine: {
    color: '#D4D4D8',
    fontSize: 12,
    fontFamily: 'monospace',
    fontWeight: '700',
  },
  feeSub: {
    color: '#A1A1AA',
    fontSize: 12,
    lineHeight: 17,
  },
  primaryModalBtn: {
    minHeight: 54,
    borderRadius: 18,
    backgroundColor: '#CCFF00',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  primaryModalBtnText: {
    color: '#0F0F0F',
    fontSize: 15,
    fontWeight: '900',
  },
  swapPairCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1A1A1A',
    borderWidth: 1,
    borderColor: '#27272A',
    borderRadius: 20,
    padding: 16,
  },
  swapPairLabel: {
    color: '#A1A1AA',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  swapPairValue: {
    color: '#F4F4F5',
    fontSize: 20,
    fontWeight: '800',
    marginTop: 2,
  },
  flipBtn: {
    minHeight: 42,
    paddingHorizontal: 16,
    borderRadius: 14,
    backgroundColor: '#262626',
    borderWidth: 1,
    borderColor: 'rgba(168, 85, 247, 0.5)',
    justifyContent: 'center',
  },
  flipBtnText: {
    color: '#E9D5FF',
    fontSize: 13,
    fontWeight: '800',
  },
  swapQuoteCard: {
    backgroundColor: '#1A1A1A',
    borderWidth: 1.5,
    borderColor: 'rgba(204, 255, 0, 0.45)',
    borderRadius: 20,
    padding: 16,
    gap: 8,
  },
  swapResultHeadline: {
    color: '#F4F4F5',
    fontSize: 20,
    fontWeight: '900',
  },

  /* Diagnostics Tools */
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
