'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'motion/react';
import {
  ArrowLeft,
  ArrowLeftRight,
  ArrowUpRight,
  AudioLines,
  Check,
  Clock,
  Delete,
  ExternalLink,
  Eye,
  EyeOff,
  Home,
  Loader2,
  Mic,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  Send,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  UserPlus,
  Users,
  Volume2,
  VolumeX,
  Wallet,
  X,
} from 'lucide-react';
import {
  DEMO_SENDER_WALLET,
  executeSimulatedTransfer,
  parseIntentFallback,
  resolveContact,
  truncateWallet,
  type Contact,
  type Currency,
  type PaymentIntent,
  type PhoneTabId,
  type TransactionRecord,
} from '@/lib/bicara-engine';
import {
  SOLANA_DEVNET_FAUCET_URL,
  connectBrowserWallet,
  detectBrowserSolanaWallets,
  fetchDevnetBalances,
  generateSpokenChallenge,
  inspectDevnetTransfer,
  isValidSolanaPublicKey,
  matchesBrowserSpokenChallenge,
  sendRealDevnetTransfer,
  type DetectedBrowserWallet,
  type DevnetBalances,
  type SpokenChallenge,
} from '@/lib/solana-browser';

interface PrototypeWorkspaceProps {
  contacts: Contact[];
  transactions: TransactionRecord[];
  senderBalanceUsdc: number;
  senderBalanceSol: number;
  walletConnected: boolean;
  onToggleWallet: () => void;
  onAddContact: (contact: Contact) => void;
  onDeleteContact: (id: string) => void;
  onCompleteTransfer: (
    tx: TransactionRecord,
    nextBalance: number,
    recipientId: string
  ) => void;
  onResetBalances: () => void;
  demoTriggerNonce: number;
  demoCommand?: string;
}

type ExecutionMode = 'sandbox' | 'devnet';
type HomeSurfaceMode = 'visual' | 'eyes-free';
type ActivePhoneSheet = 'none' | 'send-recipient' | 'send-amount' | 'swap';

interface PendingTransferPlan {
  recipient: Contact;
  amount: number;
  asset: Currency;
  transcript: string;
  challenge: SpokenChallenge;
  estimatedNetworkFeeSol: number;
  createsNewAta: boolean;
  estimatedAtaRentSol: number;
  spokenSummary: string;
}

interface SwapQuoteData {
  inputToken: string;
  outputToken: string;
  inAmountUi: number;
  outAmountUi: number;
  priceImpactPct: number;
  router: string;
  slippageBps: number;
  quoteOnly: boolean;
  spokenSummary: string;
  latencyMs?: number;
}

interface BrowserSpeechRecognition {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  onresult:
    | ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void)
    | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

function formatShortDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return iso;
  }
}

export default function PrototypeWorkspace({
  contacts,
  transactions,
  senderBalanceUsdc,
  senderBalanceSol,
  onAddContact,
  onDeleteContact,
  onCompleteTransfer,
  onResetBalances,
  demoTriggerNonce,
  demoCommand = 'Send 5 USDC to Ahmad',
}: PrototypeWorkspaceProps) {
  // Execution mode: Instant Sandbox vs Real Solana Devnet (Phantom/Solflare)
  const [executionMode, setExecutionMode] = useState<ExecutionMode>('sandbox');
  const [detectedWallets, setDetectedWallets] = useState<DetectedBrowserWallet[]>([]);
  const [connectedWallet, setConnectedWallet] = useState<{
    wallet: DetectedBrowserWallet;
    address: string;
  } | null>(null);
  const [connectingWallet, setConnectingWallet] = useState(false);
  const [devnetBalances, setDevnetBalances] = useState<DevnetBalances | null>(null);
  const [loadingBalances, setLoadingBalances] = useState(false);
  const [solUsdPrice, setSolUsdPrice] = useState<number>(69.26);

  // Mobile 1:1 surface & navigation state
  const [phoneTab, setPhoneTab] = useState<PhoneTabId>('home');
  const [homeSurface, setHomeSurface] = useState<HomeSurfaceMode>('visual');
  const [screenCurtain, setScreenCurtain] = useState(false);
  const [activeSheet, setActiveSheet] = useState<ActivePhoneSheet>('none');

  // Voice & TTS state
  const [ttsEnabled, setTtsEnabled] = useState(true);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSigning, setIsSigning] = useState(false);
  const [lastTranscript, setLastTranscript] = useState('');
  const [spokenLine, setSpokenLine] = useState(
    'Bicara ready. Tap the voice button or choose a scenario to hear spoken transaction verification.'
  );
  const [typedCommand, setTypedCommand] = useState('');
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  // Active transfer confirmation (Layers 2, 4, 5)
  const [pendingPlan, setPendingPlan] = useState<PendingTransferPlan | null>(null);
  const [challengeInput, setChallengeInput] = useState('');
  const [latestReceipt, setLatestReceipt] = useState<{
    amount: number;
    asset: Currency;
    recipientName: string;
    signature: string;
    isLiveDevnet: boolean;
    explorerUrl?: string;
  } | null>(null);

  // 2-Step Send Sheet state (mirrors OPPO mobile 1:1)
  const [sendSearch, setSendSearch] = useState('');
  const [sendRecipient, setSendRecipient] = useState<Contact | null>(null);
  const [sendAsset, setSendAsset] = useState<Currency>('SOL');
  const [sendAmountStr, setSendAmountStr] = useState('0.01');

  // Live Swap Quote Sheet state (Jupiter Swap V2 Quote-Only)
  const [swapInputAmount, setSwapInputAmount] = useState('10');
  const [swapInputToken, setSwapInputToken] = useState<'USDC' | 'SOL'>('USDC');
  const [swapLoading, setSwapLoading] = useState(false);
  const [swapQuote, setSwapQuote] = useState<SwapQuoteData | null>(null);
  const [swapBlockedMsg, setSwapBlockedMsg] = useState<string | null>(null);

  // Contacts tab form state
  const [contactSearch, setContactSearch] = useState('');
  const [showAddContact, setShowAddContact] = useState(false);
  const [newContactName, setNewContactName] = useState('');
  const [newContactWallet, setNewContactWallet] = useState('');
  const [contactFormError, setContactFormError] = useState<string | null>(null);

  const recognitionRef = useRef<BrowserSpeechRecognition | null>(null);
  const audioElRef = useRef<HTMLAudioElement | null>(null);
  const lastHandledDemoRef = useRef<number>(0);

  // Effective displayed balances depending on execution mode
  const activeSolBalance =
    executionMode === 'devnet' ? (devnetBalances?.sol ?? 0) : senderBalanceSol;
  const activeUsdcBalance =
    executionMode === 'devnet' ? (devnetBalances?.usdc ?? 0) : senderBalanceUsdc;
  const isWalletReady = executionMode === 'sandbox' || connectedWallet !== null;

  const estimatedUsdTotal = useMemo(() => {
    return activeUsdcBalance + activeSolBalance * solUsdPrice;
  }, [activeUsdcBalance, activeSolBalance, solUsdPrice]);

  // Detect Phantom / Solflare browser extensions + fetch live SOL price on mount
  useEffect(() => {
    const refreshExtensions = () => {
      setDetectedWallets(detectBrowserSolanaWallets());
    };
    refreshExtensions();
    const timer = window.setTimeout(refreshExtensions, 700);

    fetch('/api/prices')
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { solUsd?: number } | null) => {
        if (data && typeof data.solUsd === 'number' && Number.isFinite(data.solUsd)) {
          setSolUsdPrice(data.solUsd);
        }
      })
      .catch(() => {
        // Keep fallback SOL price quietly
      });

    return () => window.clearTimeout(timer);
  }, []);

  // Speak text aloud (ElevenLabs /api/tts with automatic browser SpeechSynthesis fallback)
  const speakText = useCallback(
    (text: string) => {
      setSpokenLine(text);
      if (!ttsEnabled || typeof window === 'undefined') return;

      if (audioElRef.current) {
        audioElRef.current.pause();
        audioElRef.current = null;
      }
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }

      const speakWithBrowser = () => {
        if (!('speechSynthesis' in window)) return;
        const utter = new SpeechSynthesisUtterance(text);
        utter.lang = 'en-US';
        utter.rate = 1.02;
        window.speechSynthesis.speak(utter);
      };

      fetch(`/api/tts?text=${encodeURIComponent(text)}`)
        .then(async (res) => {
          if (!res.ok) throw new Error('TTS proxy unavailable');
          const blob = await res.blob();
          const url = URL.createObjectURL(blob);
          const audio = new Audio(url);
          audioElRef.current = audio;
          audio.onended = () => URL.revokeObjectURL(url);
          audio.onerror = () => {
            URL.revokeObjectURL(url);
            speakWithBrowser();
          };
          await audio.play();
        })
        .catch(() => {
          speakWithBrowser();
        });
    },
    [ttsEnabled]
  );

  // Stop audio on unmount
  useEffect(() => {
    return () => {
      if (audioElRef.current) {
        audioElRef.current.pause();
      }
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const refreshLiveDevnetBalances = useCallback(async (address: string) => {
    setLoadingBalances(true);
    try {
      const next = await fetchDevnetBalances(address);
      setDevnetBalances(next);
    } catch {
      setErrorBanner(
        'Could not reach Solana Devnet RPC right now. Tap portfolio card to retry.'
      );
    } finally {
      setLoadingBalances(false);
    }
  }, []);

  const handleConnectBrowserWallet = async (wallet: DetectedBrowserWallet) => {
    setConnectingWallet(true);
    setErrorBanner(null);
    try {
      const { publicKey } = await connectBrowserWallet(wallet);
      setConnectedWallet({ wallet, address: publicKey });
      setExecutionMode('devnet');
      await refreshLiveDevnetBalances(publicKey);
      speakText(
        `${wallet.label} connected on Solana Devnet. Wallet ending in ${publicKey.slice(-4)}.`
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Wallet connection canceled.';
      setErrorBanner(msg);
      speakText('Wallet connection was canceled.');
    } finally {
      setConnectingWallet(false);
    }
  };

  const handleDisconnectWallet = async () => {
    if (!connectedWallet) return;
    try {
      await connectedWallet.wallet.provider.disconnect();
    } catch {
      // Ignore provider disconnect errors
    }
    setConnectedWallet(null);
    setDevnetBalances(null);
    setPendingPlan(null);
    speakText('Wallet disconnected.');
  };

  const handleAddConnectedWalletAsContact = () => {
    if (!connectedWallet) return;
    const existing = contacts.find(
      (c) => c.wallet.toLowerCase() === connectedWallet.address.toLowerCase()
    );
    if (existing) {
      speakText(`Your wallet is already saved as ${existing.name}.`);
      setSendRecipient(existing);
      setSendAsset('SOL');
      setSendAmountStr('0.001');
      setActiveSheet('send-amount');
      return;
    }

    const selfContact: Contact = {
      id: `cnt-self-${Date.now()}`,
      name: 'My Wallet',
      wallet: connectedWallet.address,
      onChain: false,
      hasUsdcAta: (devnetBalances?.usdc ?? 0) > 0,
      balanceUsdc: devnetBalances?.usdc ?? 0,
      createdAt: new Date().toISOString(),
    };
    onAddContact(selfContact);
    speakText('Saved your connected wallet as My Wallet for safe Solana Devnet self-testing.');
  };

  // Prepare pre-sign TxSummary + Layer 2 random 3-digit challenge
  const prepareTransferConfirmation = useCallback(
    async (recipient: Contact, amount: number, asset: Currency, transcript: string) => {
      setErrorBanner(null);

      if (executionMode === 'devnet' && !connectedWallet) {
        const msg =
          'Connect Phantom or Solflare on Solana Devnet first, or switch to Instant Sandbox.';
        setErrorBanner(msg);
        speakText(msg);
        return;
      }

      if (amount <= 0 || !Number.isFinite(amount)) {
        const msg = 'Please specify a valid transfer amount greater than zero.';
        setErrorBanner(msg);
        speakText(msg);
        return;
      }

      if (asset === 'SOL' && amount > activeSolBalance) {
        const msg = `Insufficient SOL balance. You have ${activeSolBalance.toFixed(4)} SOL available.`;
        setErrorBanner(msg);
        speakText(msg);
        return;
      }

      if (asset === 'USDC' && amount > activeUsdcBalance) {
        const msg = `Insufficient USDC balance. You have ${activeUsdcBalance.toFixed(2)} USDC available.`;
        setErrorBanner(msg);
        speakText(msg);
        return;
      }

      let createsNewAta = asset === 'USDC' && !recipient.hasUsdcAta;
      let estimatedNetworkFeeSol = 0.000005;
      let estimatedAtaRentSol = createsNewAta ? 0.002039 : 0;

      if (executionMode === 'devnet') {
        const inspection = await inspectDevnetTransfer(recipient.wallet, asset);
        if (!inspection.validRecipient) {
          const msg =
            inspection.error ??
            `${recipient.name}'s saved address is not a valid Solana Devnet key. Add a real Devnet address in Contacts to test live transfers.`;
          setErrorBanner(msg);
          speakText(msg);
          return;
        }
        createsNewAta = inspection.recipientCreatesAta;
        estimatedNetworkFeeSol = inspection.estimatedNetworkFeeSol;
        estimatedAtaRentSol = inspection.estimatedAtaRentSol;
      }

      const challenge = generateSpokenChallenge();
      const rentClause = createsNewAta
        ? ` Creating their token account adds ${estimatedAtaRentSol.toFixed(5)} SOL one-time rent.`
        : '';
      const modeClause =
        executionMode === 'devnet'
          ? 'Your wallet will open to sign on Solana Devnet.'
          : 'Sandbox preview mode is active.';

      const spokenSummary = `Review transfer: send ${amount} ${asset} to saved contact ${recipient.name}, address ending in ${recipient.wallet.slice(-4)}. Network fee is ${estimatedNetworkFeeSol.toFixed(6)} SOL.${rentClause} Say ${challenge.spokenWords} or tap Confirm & Sign to continue. ${modeClause}`;

      setPendingPlan({
        recipient,
        amount,
        asset,
        transcript,
        challenge,
        estimatedNetworkFeeSol,
        createsNewAta,
        estimatedAtaRentSol,
        spokenSummary,
      });
      setChallengeInput('');
      setActiveSheet('none');
      setPhoneTab('home');
      speakText(spokenSummary);
    },
    [executionMode, connectedWallet, activeSolBalance, activeUsdcBalance, speakText]
  );

  // Confirm & execute either REAL Solana Devnet tx or Instant Sandbox preview
  const executePendingPlan = useCallback(async () => {
    if (!pendingPlan) return;
    setErrorBanner(null);
    setIsSigning(true);

    try {
      if (executionMode === 'devnet') {
        if (!connectedWallet) {
          throw new Error('Connect Phantom or Solflare on Solana Devnet first.');
        }

        speakText(
          `Opening ${connectedWallet.wallet.label} to authorize ${pendingPlan.amount} ${pendingPlan.asset} to ${pendingPlan.recipient.name}.`
        );

        const result = await sendRealDevnetTransfer({
          provider: connectedWallet.wallet.provider,
          senderAddress: connectedWallet.address,
          recipientAddress: pendingPlan.recipient.wallet,
          amount: pendingPlan.amount,
          asset: pendingPlan.asset,
        });

        const txRecord: TransactionRecord = {
          id: `tx-devnet-${Date.now()}`,
          recipientName: pendingPlan.recipient.name,
          recipientWallet: pendingPlan.recipient.wallet,
          amountUsdc: pendingPlan.amount,
          rawUnits: String(
            pendingPlan.asset === 'USDC'
              ? Math.round(pendingPlan.amount * 1_000_000)
              : Math.round(pendingPlan.amount * 1_000_000_000)
          ),
          currency: pendingPlan.asset,
          voiceTranscript: pendingPlan.transcript,
          txSignature: result.signature,
          status: 'confirmed',
          resolutionSource: 'on_chain',
          isLiveDevnet: true,
          explorerUrl: result.explorerUrl,
          createdAt: new Date().toISOString(),
        };

        onCompleteTransfer(txRecord, activeSolBalance, pendingPlan.recipient.id);
        setLatestReceipt({
          amount: pendingPlan.amount,
          asset: pendingPlan.asset,
          recipientName: pendingPlan.recipient.name,
          signature: result.signature,
          isLiveDevnet: true,
          explorerUrl: result.explorerUrl,
        });
        setPendingPlan(null);
        setChallengeInput('');
        void refreshLiveDevnetBalances(connectedWallet.address);
        speakText(
          `Confirmed on Solana Devnet. You sent ${pendingPlan.amount} ${pendingPlan.asset} to ${pendingPlan.recipient.name}.`
        );
      } else {
        // Honest Instant Sandbox Mode
        await new Promise((r) => window.setTimeout(r, 420));

        if (pendingPlan.asset === 'USDC') {
          const sim = executeSimulatedTransfer({
            walletConnected: true,
            confirmedByUser: true,
            senderWallet: DEMO_SENDER_WALLET,
            senderBalanceUsdc: activeUsdcBalance,
            amount: pendingPlan.amount,
            currency: 'USDC',
            recipient: pendingPlan.recipient,
            resolutionSource: 'supabase',
            voiceTranscript: pendingPlan.transcript,
            autoCreateAta: true,
          });
          if (!sim.ok || !sim.tx) {
            throw new Error(sim.spokenMessage);
          }
          const sandboxTx: TransactionRecord = {
            ...sim.tx,
            isLiveDevnet: false,
          };
          onCompleteTransfer(sandboxTx, sim.nextSenderBalance, pendingPlan.recipient.id);
          setLatestReceipt({
            amount: pendingPlan.amount,
            asset: 'USDC',
            recipientName: pendingPlan.recipient.name,
            signature: sandboxTx.txSignature,
            isLiveDevnet: false,
          });
        } else {
          const nextSol = Math.max(
            0,
            Number((activeSolBalance - pendingPlan.amount - 0.000005).toFixed(6))
          );
          const sandboxSig = `SANDBOX_${Date.now().toString(36).toUpperCase()}`;
          const sandboxTx: TransactionRecord = {
            id: `tx-sandbox-${Date.now()}`,
            recipientName: pendingPlan.recipient.name,
            recipientWallet: pendingPlan.recipient.wallet,
            amountUsdc: pendingPlan.amount,
            rawUnits: String(Math.round(pendingPlan.amount * 1_000_000_000)),
            currency: 'SOL',
            voiceTranscript: pendingPlan.transcript,
            txSignature: sandboxSig,
            status: 'confirmed',
            resolutionSource: 'supabase',
            isLiveDevnet: false,
            createdAt: new Date().toISOString(),
          };
          onCompleteTransfer(sandboxTx, nextSol, pendingPlan.recipient.id);
          setLatestReceipt({
            amount: pendingPlan.amount,
            asset: 'SOL',
            recipientName: pendingPlan.recipient.name,
            signature: sandboxSig,
            isLiveDevnet: false,
          });
        }

        setPendingPlan(null);
        setChallengeInput('');
        speakText(
          `Sandbox preview complete. Simulated ${pendingPlan.amount} ${pendingPlan.asset} to ${pendingPlan.recipient.name}. Switch to Live Devnet to broadcast on Solana.`
        );
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Transaction was canceled or failed.';
      setErrorBanner(msg);
      speakText(`Transaction not completed. ${msg}`);
    } finally {
      setIsSigning(false);
    }
  }, [
    pendingPlan,
    executionMode,
    connectedWallet,
    activeSolBalance,
    activeUsdcBalance,
    onCompleteTransfer,
    refreshLiveDevnetBalances,
    speakText,
  ]);

  // Fetch live Jupiter Swap V2 Quote-Only (including scam token 403 block test!)
  const runLiveSwapQuote = useCallback(
    async (inputToken: string, outputToken: string, amount: number) => {
      setSwapLoading(true);
      setSwapBlockedMsg(null);
      setSwapQuote(null);
      setActiveSheet('swap');
      setPhoneTab('home');

      try {
        const res = await fetch('/api/swap/quote', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            inputToken,
            outputToken,
            amount,
          }),
        });
        const data = (await res.json()) as {
          error?: string;
          spokenError?: string;
          inputToken?: string;
          outputToken?: string;
          inAmountUi?: number;
          outAmountUi?: number;
          priceImpactPct?: number;
          router?: string;
          slippageBps?: number;
          spokenSummary?: string;
          latencyMs?: number;
        };

        if (!res.ok) {
          const blockedText =
            data.spokenError ||
            data.error ||
            `Blocked unverified token ${outputToken} (HTTP ${res.status}).`;
          setSwapBlockedMsg(blockedText);
          speakText(blockedText);
          return;
        }

        const parsedQuote: SwapQuoteData = {
          inputToken: data.inputToken ?? inputToken,
          outputToken: data.outputToken ?? outputToken,
          inAmountUi: data.inAmountUi ?? amount,
          outAmountUi: data.outAmountUi ?? 0,
          priceImpactPct: data.priceImpactPct ?? 0,
          router: data.router ?? 'metis',
          slippageBps: data.slippageBps ?? 50,
          quoteOnly: true,
          spokenSummary:
            data.spokenSummary ??
            `Quote-only preview: ${amount} ${inputToken} swaps for approximately ${data.outAmountUi ?? 0} ${outputToken}.`,
          latencyMs: data.latencyMs,
        };
        setSwapQuote(parsedQuote);
        speakText(parsedQuote.spokenSummary);
      } catch {
        const fallbackMsg =
          'Could not reach Jupiter Swap V2 quote proxy right now. Please try again.';
        setSwapBlockedMsg(fallbackMsg);
        speakText(fallbackMsg);
      } finally {
        setSwapLoading(false);
      }
    },
    [speakText]
  );

  // Unified voice/command processor
  const processCommand = useCallback(
    async (rawText: string) => {
      const cleaned = rawText.trim();
      if (!cleaned) return;

      setLastTranscript(cleaned);
      setErrorBanner(null);
      setIsProcessing(true);

      try {
        // Check active Layer 2 spoken challenge first
        if (pendingPlan) {
          const lower = cleaned.toLowerCase();
          if (lower === 'cancel' || lower === 'no' || lower === 'stop') {
            setPendingPlan(null);
            setChallengeInput('');
            speakText('Transfer canceled.');
            return;
          }
          if (
            matchesBrowserSpokenChallenge(cleaned, pendingPlan.challenge.digits) ||
            lower === 'yes' ||
            lower === 'confirm'
          ) {
            setIsProcessing(false);
            await executePendingPlan();
            return;
          }
        }

        // Parse intent via server /api/intent (falls back cleanly to deterministic parser)
        let intent: PaymentIntent;
        try {
          const res = await fetch('/api/intent', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              transcript: cleaned,
              mode: 'fallback',
              contactNames: contacts.map((c) => c.name),
            }),
          });
          if (res.ok) {
            const payload = (await res.json()) as { intent: PaymentIntent };
            intent = payload.intent;
          } else {
            intent = parseIntentFallback(cleaned);
          }
        } catch {
          intent = parseIntentFallback(cleaned);
        }

        if (intent.action === 'check_balance') {
          setPhoneTab('home');
          setActiveSheet('none');
          if (!isWalletReady) {
            speakText(
              'No Devnet wallet connected yet. Connect Phantom or Solflare, or switch to Instant Sandbox.'
            );
            return;
          }
          speakText(
            `Your ${executionMode === 'devnet' ? 'Solana Devnet' : 'sandbox'} balance is ${activeSolBalance.toFixed(4)} SOL and ${activeUsdcBalance.toFixed(2)} USDC, about ${estimatedUsdTotal.toFixed(2)} dollars total.`
          );
          return;
        }

        if (intent.action === 'check_price') {
          speakText(
            `SOL is currently trading at approximately ${solUsdPrice.toFixed(2)} US dollars, and USDC is 1 dollar.`
          );
          return;
        }

        if (intent.action === 'navigate' || intent.action === 'list_contacts' || intent.action === 'read_history') {
          const target = intent.targetTab ?? 'home';
          setActiveSheet('none');
          setPhoneTab(target);
          if (target === 'contacts') {
            speakText(
              `Contacts screen. You have ${contacts.length} verified contacts: ${contacts
                .slice(0, 4)
                .map((c) => c.name)
                .join(', ')}.`
            );
          } else if (target === 'history') {
            const latest = transactions[0];
            speakText(
              latest
                ? `History screen. Latest transfer was ${latest.amountUsdc} ${latest.currency} to ${latest.recipientName}.`
                : 'History screen. No transfers recorded yet.'
            );
          } else {
            speakText('Home screen.');
          }
          return;
        }

        if (intent.action === 'swap_quote') {
          const inToken = (intent.currency ?? 'USDC').toUpperCase();
          const outToken = (
            intent.outputCurrency ?? (inToken === 'USDC' ? 'SOL' : 'USDC')
          ).toUpperCase();
          const amount = intent.amount ?? 10;
          setSwapInputToken(inToken === 'SOL' ? 'SOL' : 'USDC');
          setSwapInputAmount(String(amount));
          setIsProcessing(false);
          await runLiveSwapQuote(inToken, outToken, amount);
          return;
        }

        if (intent.action === 'send') {
          if (!intent.recipient) {
            speakText('Who would you like to send to? Say a saved contact name.');
            return;
          }
          if (!intent.amount || intent.amount <= 0) {
            speakText(`How much would you like to send to ${intent.recipient}?`);
            return;
          }

          const resolution = resolveContact(contacts, intent.recipient);
          if (resolution.status !== 'found' || !resolution.contact) {
            const blocked = `Blocked for your safety: "${intent.recipient}" is not in your verified contacts. Bicara blocks unverified recipients to prevent blind signing.`;
            setErrorBanner(blocked);
            speakText(blocked);
            return;
          }

          const asset: Currency =
            String(intent.currency ?? 'USDC').toUpperCase() === 'SOL' ? 'SOL' : 'USDC';
          await prepareTransferConfirmation(resolution.contact, intent.amount, asset, cleaned);
          return;
        }

        if (intent.action === 'help') {
          speakText(
            'Try saying: Check balance, Send 5 USDC to Ahmad, Send 0.01 SOL to My Wallet, Swap 10 USDC to SOL, or Open contacts.'
          );
          return;
        }

        speakText(
          `I heard "${cleaned}". Try saying Check balance, Send 5 USDC to Ahmad, or Swap 10 USDC to SOL.`
        );
      } finally {
        setIsProcessing(false);
      }
    },
    [
      pendingPlan,
      contacts,
      transactions,
      isWalletReady,
      executionMode,
      activeSolBalance,
      activeUsdcBalance,
      estimatedUsdTotal,
      solUsdPrice,
      executePendingPlan,
      prepareTransferConfirmation,
      runLiveSwapQuote,
      speakText,
    ]
  );

  // Auto-run clicked Live Preview scenario when landing routes directly to Demo
  useEffect(() => {
    if (demoTriggerNonce > 0 && demoTriggerNonce !== lastHandledDemoRef.current) {
      lastHandledDemoRef.current = demoTriggerNonce;
      void processCommand(demoCommand);
    }
  }, [demoTriggerNonce, demoCommand, processCommand]);

  // Browser Web Speech API microphone toggle
  const handleToggleMic = () => {
    if (typeof window === 'undefined') return;

    if (isRecording && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsRecording(false);
      return;
    }

    const SpeechRecognitionCtor =
      (window as unknown as { SpeechRecognition?: new () => BrowserSpeechRecognition })
        .SpeechRecognition ??
      (window as unknown as { webkitSpeechRecognition?: new () => BrowserSpeechRecognition })
        .webkitSpeechRecognition;

    if (!SpeechRecognitionCtor) {
      setErrorBanner(
        'Browser microphone recognition is unavailable here. Use the command bar or Quick Scenarios on the right.'
      );
      return;
    }

    setErrorBanner(null);
    const recognition = new SpeechRecognitionCtor();
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event) => {
      const spoken = event.results?.[0]?.[0]?.transcript ?? '';
      setIsRecording(false);
      if (spoken) {
        void processCommand(spoken);
      }
    };
    recognition.onerror = () => {
      setIsRecording(false);
      setErrorBanner(
        'Could not capture microphone audio. Tap a Quick Scenario or type a command below.'
      );
    };
    recognition.onend = () => {
      setIsRecording(false);
    };

    recognitionRef.current = recognition;
    setIsRecording(true);
    recognition.start();
  };

  // Keypad handler for 2-Step Send Sheet
  const handleKeypadPress = (key: string) => {
    if (key === 'back') {
      setSendAmountStr((prev) => (prev.length <= 1 ? '0' : prev.slice(0, -1)));
      return;
    }
    if (key === '.') {
      setSendAmountStr((prev) => (prev.includes('.') ? prev : `${prev}.`));
      return;
    }
    setSendAmountStr((prev) => {
      if (prev === '0') return key;
      if (prev.length >= 9) return prev;
      return `${prev}${key}`;
    });
  };

  const handleCreateContact = () => {
    const trimmedName = newContactName.trim();
    const trimmedWallet = newContactWallet.trim();
    if (!trimmedName) {
      setContactFormError('Enter a contact name.');
      return;
    }
    if (!isValidSolanaPublicKey(trimmedWallet)) {
      setContactFormError('Enter a valid Solana Base58 wallet address.');
      return;
    }
    const created: Contact = {
      id: `cnt-${Date.now()}`,
      name: trimmedName,
      wallet: trimmedWallet,
      onChain: false,
      hasUsdcAta: true,
      balanceUsdc: 0,
      createdAt: new Date().toISOString(),
    };
    onAddContact(created);
    setNewContactName('');
    setNewContactWallet('');
    setContactFormError(null);
    setShowAddContact(false);
    speakText(`Added ${trimmedName} to your verified contacts.`);
  };

  const filteredSendContacts = contacts.filter((c) =>
    c.name.toLowerCase().includes(sendSearch.trim().toLowerCase())
  );

  const filteredContacts = contacts.filter(
    (c) =>
      c.name.toLowerCase().includes(contactSearch.trim().toLowerCase()) ||
      c.wallet.toLowerCase().includes(contactSearch.trim().toLowerCase())
  );

  const quickScenarios = [
    {
      id: 'send-voice',
      title: 'Send by Voice',
      command:
        executionMode === 'devnet' && connectedWallet
          ? contacts.some((c) => c.wallet === connectedWallet.address)
            ? 'Send 0.001 SOL to My Wallet'
            : 'Send 0.01 SOL to Ahmad'
          : 'Send 5 USDC to Ahmad',
      description: 'Hear recipient, fees, and 3-digit challenge before signing.',
      action: () => {
        const targetCmd =
          executionMode === 'devnet' && connectedWallet
            ? contacts.some((c) => c.wallet === connectedWallet.address)
              ? 'Send 0.001 SOL to My Wallet'
              : 'Send 0.01 SOL to Ahmad'
            : 'Send 5 USDC to Ahmad';
        void processCommand(targetCmd);
      },
    },
    {
      id: 'stop-blind',
      title: 'Stop Blind Signing',
      command: 'Send 5 USDC to Reza',
      description: 'Blocks an unverified recipient before any wallet popup opens.',
      action: () => void processCommand('Send 5 USDC to Reza'),
    },
    {
      id: 'swap-quote',
      title: 'Live Jupiter Swap Quote',
      command: 'Swap 10 USDC to SOL',
      description: 'Fetches a real Quote-Only route via Jupiter Swap API V2.',
      action: () => void processCommand('Swap 10 USDC to SOL'),
    },
    {
      id: 'eyes-free-balance',
      title: 'Eyes-Free Check Balance',
      command: 'Check balance',
      description: 'Reads live SOL, USDC, and USD portfolio aloud hands-free.',
      action: () => void processCommand('Check balance'),
    },
  ];

  return (
    <section aria-label="Bicara Interactive Demo" className="space-y-6">
      {/* Minimal Clean Top Bar: Title + Dual Execution Mode Switcher */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-[#E2E6DC]">
        <div className="space-y-1">
          <h1 className="font-display text-2xl sm:text-3xl font-black tracking-tight text-[#1E3124]">
            Interactive Mobile Demo
          </h1>
          <p className="text-sm text-[#526658]">
            Exact mirror of the Bicara Android app—test live Solana Devnet transfers or explore
            instantly in Sandbox.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          {/* Segmented Execution Mode Switch */}
          <div
            role="group"
            aria-label="Execution mode"
            className="inline-flex items-center p-1 bg-[#EEF3E8] border border-[#DCE4D4] rounded-full"
          >
            <button
              type="button"
              onClick={() => {
                setExecutionMode('sandbox');
                setPendingPlan(null);
                setErrorBanner(null);
              }}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-full transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                executionMode === 'sandbox'
                  ? 'bg-[#356341] text-white'
                  : 'text-[#526658] hover:text-[#1E3124]'
              }`}
            >
              Instant Sandbox
            </button>
            <button
              type="button"
              onClick={() => {
                setExecutionMode('devnet');
                setPendingPlan(null);
                setErrorBanner(null);
                setDetectedWallets(detectBrowserSolanaWallets());
              }}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-full transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                executionMode === 'devnet'
                  ? 'bg-[#356341] text-white'
                  : 'text-[#526658] hover:text-[#1E3124]'
              }`}
            >
              Live Solana Devnet
            </button>
          </div>

          <button
            type="button"
            onClick={() => {
              setTtsEnabled((v) => !v);
              if (ttsEnabled && typeof window !== 'undefined' && 'speechSynthesis' in window) {
                window.speechSynthesis.cancel();
              }
            }}
            aria-label={ttsEnabled ? 'Mute spoken voice' : 'Unmute spoken voice'}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold bg-white border border-[#DCE4D4] hover:border-[#356341] text-[#1E3124] rounded-full transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            {ttsEnabled ? (
              <Volume2 className="w-3.5 h-3.5 text-[#356341]" aria-hidden="true" />
            ) : (
              <VolumeX className="w-3.5 h-3.5 text-[#788A7D]" aria-hidden="true" />
            )}
            <span>{ttsEnabled ? 'Voice On' : 'Muted'}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              onResetBalances();
              setPendingPlan(null);
              setLatestReceipt(null);
              setErrorBanner(null);
              setActiveSheet('none');
              setPhoneTab('home');
              setHomeSurface('visual');
              setScreenCurtain(false);
              speakText('Demo reset.');
            }}
            aria-label="Reset demo state"
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-white border border-[#DCE4D4] hover:border-[#356341] text-[#526658] hover:text-[#1E3124] rounded-full transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Reset</span>
          </button>
        </div>
      </div>

      {/* Main Focal Stage: Centered 1:1 Mobile App + Compact Judge Scenario Rail */}
      <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 items-start pt-2">
        {/* FOCAL ANCHOR: 1:1 Bicara Mobile App Chassis (#0F0F0F + #CCFF00) */}
        <div className="lg:col-span-6 flex justify-center">
          <div className="w-full max-w-[392px] h-[760px] rounded-[42px] bg-[#0F0F0F] text-white border-[8px] border-[#1F2721] shadow-[0_24px_60px_rgba(30,49,36,0.16)] flex flex-col overflow-hidden relative">
            {/* Screen Curtain Privacy Overlay (Scoped to Bicara Screens) */}
            {screenCurtain && (
              <div className="absolute inset-0 z-50 bg-black flex flex-col justify-between p-6">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono text-[#737373]">SCREEN CURTAIN</span>
                  <button
                    type="button"
                    onClick={() => {
                      setScreenCurtain(false);
                      speakText('Screen Curtain disabled.');
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#1A1A1A] border border-[#333333] text-xs font-semibold text-white cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5 text-[#CCFF00]" aria-hidden="true" />
                    <span>Exit Curtain</span>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={handleToggleMic}
                  className="flex-1 flex flex-col items-center justify-center gap-4 text-center cursor-pointer"
                >
                  <div
                    className={`w-24 h-24 rounded-full border-2 flex items-center justify-center transition-transform ${
                      isRecording
                        ? 'border-[#CCFF00] bg-[#CCFF00]/15 scale-105'
                        : 'border-[#2E2E2E] bg-[#121212]'
                    }`}
                  >
                    <Mic
                      className={`w-8 h-8 ${isRecording ? 'text-[#CCFF00]' : 'text-[#8C8C8C]'}`}
                      aria-hidden="true"
                    />
                  </div>
                  <p className="text-xs font-mono tracking-widest text-[#8C8C8C]">
                    {isRecording
                      ? 'LISTENING...'
                      : isSigning
                        ? 'WAITING FOR WALLET...'
                        : isProcessing
                          ? 'PROCESSING...'
                          : 'TAP ANYWHERE TO SPEAK'}
                  </p>
                </button>

                <p className="text-[11px] text-[#525252] text-center">
                  Display hidden for privacy. Audio narration remains active.
                </p>
              </div>
            )}

            {/* Mobile Top Header (Matches OPPO /mobile/app/(tabs)/index.tsx 1:1) */}
            <div className="px-5 pt-5 pb-3 flex items-center justify-between border-b border-[#1E1E1E] shrink-0">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-[#CCFF00] text-[#0F0F0F] flex items-center justify-center shrink-0">
                  <AudioLines className="w-5 h-5" strokeWidth={2.5} aria-hidden="true" />
                </div>
                <div className="min-w-0">
                  <p className="text-base font-bold leading-tight text-white truncate">Bicara</p>
                  <p className="text-[11px] font-medium text-[#8C8C8C] truncate">
                    {executionMode === 'devnet' ? 'Solana Devnet' : 'Sandbox'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    const next = homeSurface === 'eyes-free' ? 'visual' : 'eyes-free';
                    setHomeSurface(next);
                    setPhoneTab('home');
                    setActiveSheet('none');
                    speakText(
                      next === 'eyes-free'
                        ? 'Eyes-free mode. Tap anywhere on the canvas to speak.'
                        : 'Visual Home.'
                    );
                  }}
                  className={`min-h-[36px] px-3 rounded-full text-xs font-semibold border transition-colors cursor-pointer whitespace-nowrap ${
                    homeSurface === 'eyes-free'
                      ? 'bg-[#CCFF00] text-[#0F0F0F] border-[#CCFF00]'
                      : 'bg-[#1A1A1A] text-[#D4D4D4] border-[#2E2E2E] hover:border-[#CCFF00]'
                  }`}
                >
                  {homeSurface === 'eyes-free' ? 'Visual' : 'Eyes-Free'}
                </button>

                {executionMode === 'devnet' ? (
                  connectedWallet ? (
                    <button
                      type="button"
                      onClick={() => void handleDisconnectWallet()}
                      title="Click to disconnect Devnet wallet"
                      className="min-h-[36px] px-3 rounded-full text-xs font-mono font-semibold bg-[#1E2A14] text-[#CCFF00] border border-[#CCFF00]/40 cursor-pointer whitespace-nowrap"
                    >
                      {truncateWallet(connectedWallet.address)}
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={connectingWallet}
                      onClick={() => {
                        const first = detectedWallets[0];
                        if (first) {
                          void handleConnectBrowserWallet(first);
                        } else {
                          setErrorBanner(
                            'No Phantom or Solflare extension detected in this browser. Install Phantom/Solflare or use Instant Sandbox.'
                          );
                        }
                      }}
                      className="min-h-[36px] px-3 rounded-full text-xs font-bold bg-[#CCFF00] text-[#0F0F0F] cursor-pointer whitespace-nowrap"
                    >
                      {connectingWallet ? 'Connecting...' : 'Connect'}
                    </button>
                  )
                ) : (
                  <span className="min-h-[36px] px-3 rounded-full text-xs font-mono text-[#A3A3A3] bg-[#1A1A1A] border border-[#2A2A2A] inline-flex items-center">
                    {truncateWallet(DEMO_SENDER_WALLET)}
                  </span>
                )}
              </div>
            </div>

            {/* Mobile Scrollable Body */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
              {/* SHEET A: 2-STEP SEND FLOW (Recipient -> Amount) */}
              {activeSheet === 'send-recipient' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => setActiveSheet('none')}
                      className="min-h-[44px] min-w-[44px] -ml-2 inline-flex items-center justify-center text-[#A3A3A3] hover:text-white cursor-pointer"
                      aria-label="Back to home"
                    >
                      <ArrowLeft className="w-5 h-5" />
                    </button>
                    <h2 className="text-base font-bold text-white">Select Recipient</h2>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveSheet('none');
                        setPhoneTab('contacts');
                        setShowAddContact(true);
                      }}
                      className="min-h-[44px] px-2 text-xs font-semibold text-[#CCFF00] cursor-pointer"
                    >
                      + New
                    </button>
                  </div>

                  <div className="relative">
                    <Search
                      className="w-4 h-4 text-[#737373] absolute left-3.5 top-1/2 -translate-y-1/2"
                      aria-hidden="true"
                    />
                    <input
                      type="text"
                      value={sendSearch}
                      onChange={(e) => setSendSearch(e.target.value)}
                      placeholder="Search verified contacts..."
                      className="w-full h-11 pl-10 pr-4 rounded-2xl bg-[#1A1A1A] border border-[#2B2B2B] text-sm text-white placeholder:text-[#737373] focus:outline-none focus:border-[#CCFF00]"
                    />
                  </div>

                  <div className="space-y-2">
                    {filteredSendContacts.map((contact) => (
                      <button
                        key={contact.id}
                        type="button"
                        onClick={() => {
                          setSendRecipient(contact);
                          setSendAsset(executionMode === 'devnet' ? 'SOL' : 'USDC');
                          setSendAmountStr(executionMode === 'devnet' ? '0.001' : '5');
                          setActiveSheet('send-amount');
                        }}
                        className="w-full min-h-[60px] px-3.5 py-3 rounded-2xl bg-[#1A1A1A] border border-[#262626] hover:border-[#CCFF00]/60 flex items-center justify-between gap-3 text-left transition-colors cursor-pointer"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-10 h-10 rounded-full bg-[#262626] text-[#CCFF00] text-xs font-bold flex items-center justify-center shrink-0">
                            {getInitials(contact.name)}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-white truncate">
                              {contact.name}
                            </p>
                            <p className="text-xs font-mono text-[#8C8C8C] truncate">
                              {truncateWallet(contact.wallet)}
                            </p>
                          </div>
                        </div>
                        <span className="text-[11px] font-semibold text-[#CCFF00] shrink-0">
                          Verified
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {activeSheet === 'send-amount' && sendRecipient && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => setActiveSheet('send-recipient')}
                      className="min-h-[44px] min-w-[44px] -ml-2 inline-flex items-center justify-center text-[#A3A3A3] hover:text-white cursor-pointer"
                      aria-label="Back to select recipient"
                    >
                      <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div className="text-center">
                      <p className="text-xs text-[#8C8C8C]">Sending to</p>
                      <p className="text-sm font-bold text-white">{sendRecipient.name}</p>
                    </div>
                    <div className="w-10" />
                  </div>

                  {/* Asset Switcher SOL / USDC */}
                  <div className="grid grid-cols-2 gap-2 p-1 rounded-2xl bg-[#1A1A1A] border border-[#262626]">
                    {(['SOL', 'USDC'] as const).map((asset) => (
                      <button
                        key={asset}
                        type="button"
                        onClick={() => {
                          setSendAsset(asset);
                          setSendAmountStr(asset === 'SOL' ? '0.001' : '5');
                        }}
                        className={`min-h-[40px] rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                          sendAsset === asset
                            ? 'bg-[#CCFF00] text-[#0F0F0F]'
                            : 'text-[#A3A3A3] hover:text-white'
                        }`}
                      >
                        {asset}
                      </button>
                    ))}
                  </div>

                  {/* Amount Display */}
                  <div className="py-4 text-center space-y-1">
                    <p className="text-4xl font-bold font-mono tabular-nums text-white tracking-tight">
                      {sendAmountStr}{' '}
                      <span className="text-xl text-[#CCFF00]">{sendAsset}</span>
                    </p>
                    <p className="text-xs font-mono tabular-nums text-[#8C8C8C]">
                      Available:{' '}
                      {sendAsset === 'SOL'
                        ? `${activeSolBalance.toFixed(4)} SOL`
                        : `${activeUsdcBalance.toFixed(2)} USDC`}
                    </p>
                  </div>

                  {/* Quick Presets */}
                  <div className="grid grid-cols-4 gap-2">
                    {(sendAsset === 'SOL'
                      ? ['0.001', '0.01', '0.05', '0.1']
                      : ['1', '5', '10', '20']
                    ).map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setSendAmountStr(preset)}
                        className="min-h-[38px] rounded-xl bg-[#1A1A1A] border border-[#2B2B2B] hover:border-[#CCFF00] text-xs font-mono font-semibold text-white cursor-pointer"
                      >
                        {preset}
                      </button>
                    ))}
                  </div>

                  {/* Touch Numeric Keypad (44px+ touch targets) */}
                  <div className="grid grid-cols-3 gap-2">
                    {['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', 'back'].map(
                      (key) => (
                        <button
                          key={key}
                          type="button"
                          onClick={() => handleKeypadPress(key)}
                          className="min-h-[48px] rounded-2xl bg-[#1A1A1A] hover:bg-[#242424] active:scale-[0.98] text-lg font-semibold text-white flex items-center justify-center transition-transform cursor-pointer"
                        >
                          {key === 'back' ? (
                            <Delete className="w-5 h-5 text-[#A3A3A3]" aria-hidden="true" />
                          ) : (
                            key
                          )}
                        </button>
                      )
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      const num = Number(sendAmountStr);
                      void prepareTransferConfirmation(
                        sendRecipient,
                        num,
                        sendAsset,
                        `Send ${num} ${sendAsset} to ${sendRecipient.name}`
                      );
                    }}
                    className="w-full min-h-[52px] rounded-2xl bg-[#CCFF00] hover:bg-[#B8E600] text-[#0F0F0F] font-bold text-sm transition-colors cursor-pointer"
                  >
                    Review Spoken Summary
                  </button>
                </div>
              )}

              {/* SHEET B: LIVE JUPITER SWAP V2 QUOTE-ONLY */}
              {activeSheet === 'swap' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => setActiveSheet('none')}
                      className="min-h-[44px] min-w-[44px] -ml-2 inline-flex items-center justify-center text-[#A3A3A3] hover:text-white cursor-pointer"
                      aria-label="Back to home"
                    >
                      <ArrowLeft className="w-5 h-5" />
                    </button>
                    <h2 className="text-base font-bold text-white">Verified Swap Quote</h2>
                    <span className="text-[11px] font-mono text-[#A855F7]">Quote-Only</span>
                  </div>

                  <div className="p-4 rounded-2xl bg-[#1A1A1A] border border-[#2A2A2A] space-y-3">
                    <div className="flex items-center justify-between text-xs text-[#8C8C8C]">
                      <span>Pair (Verified Allowlist)</span>
                      <button
                        type="button"
                        onClick={() =>
                          setSwapInputToken((t) => (t === 'USDC' ? 'SOL' : 'USDC'))
                        }
                        className="text-[#CCFF00] font-semibold cursor-pointer"
                      >
                        Flip {swapInputToken === 'USDC' ? 'USDC → SOL' : 'SOL → USDC'} ⇄
                      </button>
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="0.01"
                        step="any"
                        value={swapInputAmount}
                        onChange={(e) => setSwapInputAmount(e.target.value)}
                        className="flex-1 h-11 px-3.5 rounded-xl bg-[#0F0F0F] border border-[#303030] text-base font-mono font-bold text-white focus:outline-none focus:border-[#CCFF00]"
                      />
                      <span className="px-3.5 h-11 rounded-xl bg-[#262626] text-xs font-bold text-white inline-flex items-center">
                        {swapInputToken}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 gap-2 pt-1">
                      <button
                        type="button"
                        disabled={swapLoading}
                        onClick={() => {
                          const out = swapInputToken === 'USDC' ? 'SOL' : 'USDC';
                          void runLiveSwapQuote(
                            swapInputToken,
                            out,
                            Number(swapInputAmount) || 10
                          );
                        }}
                        className="w-full min-h-[46px] rounded-xl bg-[#A855F7] hover:bg-[#9333EA] text-white text-xs font-bold flex items-center justify-center gap-2 cursor-pointer"
                      >
                        {swapLoading ? (
                          <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                        ) : (
                          <ArrowLeftRight className="w-4 h-4" aria-hidden="true" />
                        )}
                        <span>Fetch Live Jupiter V2 Quote</span>
                      </button>

                      <button
                        type="button"
                        disabled={swapLoading}
                        onClick={() => void runLiveSwapQuote('USDC', 'XYZ', 10)}
                        className="w-full min-h-[42px] rounded-xl bg-[#241616] border border-[#7F1D1D] text-[#FCA5A5] text-xs font-semibold cursor-pointer"
                      >
                        Test Security: Try Unverified Token XYZ (HTTP 403)
                      </button>
                    </div>
                  </div>

                  {swapBlockedMsg && (
                    <div className="p-4 rounded-2xl bg-[#2A1414] border border-[#991B1B] space-y-1.5">
                      <div className="flex items-center gap-2 text-xs font-bold text-[#FCA5A5]">
                        <ShieldAlert className="w-4 h-4 shrink-0" aria-hidden="true" />
                        <span>Layer 3 Allowlist Blocked (HTTP 403)</span>
                      </div>
                      <p className="text-xs text-[#FECACA] leading-relaxed">{swapBlockedMsg}</p>
                    </div>
                  )}

                  {swapQuote && (
                    <div className="p-4 rounded-2xl bg-[#1A1A1A] border border-[#A855F7]/50 space-y-2.5">
                      <div className="flex items-center justify-between text-xs text-[#A3A3A3]">
                        <span>Live Jupiter V2 Result</span>
                        <span className="font-mono text-[#CCFF00]">
                          Router: {swapQuote.router}
                        </span>
                      </div>
                      <p className="text-xl font-bold font-mono tabular-nums text-white">
                        {swapQuote.inAmountUi} {swapQuote.inputToken} →{' '}
                        <span className="text-[#CCFF00]">
                          {swapQuote.outAmountUi.toFixed(5)} {swapQuote.outputToken}
                        </span>
                      </p>
                      <p className="text-xs text-[#A3A3A3] leading-relaxed">
                        {swapQuote.spokenSummary}
                      </p>
                      <div className="pt-2 border-t border-[#2A2A2A] flex items-center justify-between text-[11px] font-mono text-[#8C8C8C]">
                        <span>Max Slippage: {(swapQuote.slippageBps / 100).toFixed(2)}%</span>
                        <span>Safe Mode · No On-Chain Execution</span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* MAIN TAB 1: HOME (Visual Home OR Eyes-Free Tap-Anywhere Canvas) */}
              {activeSheet === 'none' && phoneTab === 'home' && (
                <>
                  {homeSurface === 'eyes-free' ? (
                    <div className="min-h-[540px] flex flex-col justify-between gap-4">
                      <button
                        type="button"
                        onClick={handleToggleMic}
                        className={`flex-1 rounded-3xl border-2 p-6 flex flex-col items-center justify-center text-center gap-5 transition-colors cursor-pointer ${
                          isRecording
                            ? 'bg-[#1C2612] border-[#CCFF00]'
                            : 'bg-[#161616] border-[#2E2E2E] hover:border-[#CCFF00]/60'
                        }`}
                      >
                        <div
                          className={`w-28 h-28 rounded-full flex items-center justify-center transition-transform ${
                            isRecording
                              ? 'bg-[#CCFF00] text-[#0F0F0F] scale-105'
                              : 'bg-[#222222] text-[#CCFF00] border-2 border-[#CCFF00]/60'
                          }`}
                        >
                          <Mic className="w-10 h-10" aria-hidden="true" />
                        </div>
                        <div className="space-y-1.5">
                          <p className="text-lg font-bold text-white">
                            {isRecording
                              ? 'Listening... tap to stop'
                              : pendingPlan
                                ? `Say "${pendingPlan.challenge.spaced}" to confirm`
                                : 'Tap Anywhere to Speak'}
                          </p>
                          <p className="text-xs text-[#A3A3A3] leading-relaxed max-w-[260px]">
                            {spokenLine}
                          </p>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setScreenCurtain(true);
                          speakText(
                            'Screen Curtain active. Display hidden for privacy. Tap anywhere to speak.'
                          );
                        }}
                        className="w-full min-h-[48px] rounded-2xl bg-[#1A1A1A] border border-[#333333] hover:border-[#CCFF00] text-xs font-bold text-white flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <EyeOff className="w-4 h-4 text-[#CCFF00]" aria-hidden="true" />
                        <span>Enable Screen Curtain (Zero-Screen Demo)</span>
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {/* Portfolio Card (Matches OPPO mobile 1:1) */}
                      <div className="p-5 rounded-3xl bg-[#1A1A1A] border border-[#262626] space-y-2.5">
                        <div className="flex items-center justify-between text-[11px] font-semibold tracking-wide text-[#8C8C8C]">
                          <span>DEVNET PORTFOLIO</span>
                          <span className="text-[#CCFF00]">
                            {executionMode === 'devnet' ? 'Live RPC' : 'Sandbox'}
                          </span>
                        </div>

                        {isWalletReady ? (
                          <>
                            <p className="text-3xl font-bold font-mono tabular-nums text-white tracking-tight">
                              $
                              {estimatedUsdTotal.toLocaleString('en-US', {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}
                            </p>
                            <div className="flex items-center justify-between text-xs font-mono tabular-nums text-[#B5B5B5]">
                              <span>
                                {activeSolBalance.toFixed(4)} SOL · {activeUsdcBalance.toFixed(2)}{' '}
                                USDC
                              </span>
                              {executionMode === 'devnet' && connectedWallet && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    void refreshLiveDevnetBalances(connectedWallet.address)
                                  }
                                  className="inline-flex items-center gap-1 text-[#CCFF00] cursor-pointer"
                                  aria-label="Refresh Devnet balance"
                                >
                                  <RefreshCw
                                    className={`w-3.5 h-3.5 ${
                                      loadingBalances ? 'animate-spin' : ''
                                    }`}
                                    aria-hidden="true"
                                  />
                                </button>
                              )}
                            </div>
                          </>
                        ) : (
                          <div className="space-y-3 pt-1">
                            <div>
                              <p className="text-base font-bold text-white">
                                Connect a Solana Devnet Wallet
                              </p>
                              <p className="text-xs text-[#A3A3A3] mt-0.5 leading-relaxed">
                                Sign real SOL or Devnet USDC transfers with Phantom or Solflare.
                              </p>
                            </div>
                            {detectedWallets.length > 0 ? (
                              <div className="flex flex-wrap gap-2">
                                {detectedWallets.map((w) => (
                                  <button
                                    key={w.kind}
                                    type="button"
                                    disabled={connectingWallet}
                                    onClick={() => void handleConnectBrowserWallet(w)}
                                    className="min-h-[40px] px-4 rounded-xl bg-[#CCFF00] text-[#0F0F0F] text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
                                  >
                                    <Wallet className="w-3.5 h-3.5" aria-hidden="true" />
                                    <span>Connect {w.label}</span>
                                  </button>
                                ))}
                              </div>
                            ) : (
                              <p className="text-xs text-[#FCD34D] leading-relaxed">
                                No Phantom/Solflare extension detected in this browser. Switch to{' '}
                                <button
                                  type="button"
                                  onClick={() => setExecutionMode('sandbox')}
                                  className="underline font-bold text-white cursor-pointer"
                                >
                                  Instant Sandbox
                                </button>{' '}
                                to try all flows right away.
                              </p>
                            )}
                          </div>
                        )}
                      </div>

                      {/* 3-Column Quick Actions (Send, Swap Quote, Eyes-Free) */}
                      <div className="grid grid-cols-3 gap-2.5">
                        <button
                          type="button"
                          onClick={() => {
                            setSendSearch('');
                            setActiveSheet('send-recipient');
                          }}
                          className="p-3 rounded-2xl bg-[#1A1A1A] border border-[#262626] hover:border-[#CCFF00]/60 flex flex-col items-center text-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <span className="w-10 h-10 rounded-xl bg-[#CCFF00] text-[#0F0F0F] flex items-center justify-center">
                            <ArrowUpRight className="w-5 h-5" strokeWidth={2.4} aria-hidden="true" />
                          </span>
                          <span className="text-xs font-bold text-white">Send</span>
                          <span className="text-[10px] text-[#8C8C8C]">SOL · USDC</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setSwapBlockedMsg(null);
                            setActiveSheet('swap');
                          }}
                          className="p-3 rounded-2xl bg-[#1A1A1A] border border-[#262626] hover:border-[#A855F7]/70 flex flex-col items-center text-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <span className="w-10 h-10 rounded-xl bg-[#A855F7] text-white flex items-center justify-center">
                            <ArrowLeftRight
                              className="w-4 h-4"
                              strokeWidth={2.4}
                              aria-hidden="true"
                            />
                          </span>
                          <span className="text-xs font-bold text-white">Swap Quote</span>
                          <span className="text-[10px] text-[#8C8C8C]">USDC ↔ SOL</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setHomeSurface('eyes-free');
                            speakText(
                              'Eyes-free mode. Tap anywhere on the screen to speak a transaction.'
                            );
                          }}
                          className="p-3 rounded-2xl bg-[#1A1A1A] border border-[#262626] hover:border-[#CCFF00]/60 flex flex-col items-center text-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <span className="w-10 h-10 rounded-xl bg-[#121212] border border-[#CCFF00] text-[#CCFF00] flex items-center justify-center">
                            <AudioLines className="w-5 h-5" aria-hidden="true" />
                          </span>
                          <span className="text-xs font-bold text-white">Eyes-Free</span>
                          <span className="text-[10px] text-[#8C8C8C]">Tap-Anywhere</span>
                        </button>
                      </div>

                      {/* Primary Spoken Command Banner */}
                      <div className="p-3.5 rounded-2xl bg-[#1A1A1A] border border-[#2B2B2B] space-y-3">
                        <button
                          type="button"
                          onClick={handleToggleMic}
                          className="w-full flex items-center gap-3 text-left cursor-pointer"
                        >
                          <span
                            className={`w-12 h-12 rounded-2xl font-mono text-[10px] font-bold flex items-center justify-center shrink-0 transition-colors ${
                              isRecording
                                ? 'bg-[#EF4444] text-white'
                                : isProcessing || isSigning
                                  ? 'bg-[#A855F7] text-white'
                                  : 'bg-[#CCFF00] text-[#0F0F0F]'
                            }`}
                          >
                            {isRecording
                              ? 'STOP'
                              : isSigning
                                ? 'SIGN'
                                : isProcessing
                                  ? 'WAIT'
                                  : 'SPEAK'}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-bold text-white truncate">
                              {isRecording
                                ? 'Listening... tap to stop'
                                : isSigning
                                  ? 'Authorizing in wallet...'
                                  : pendingPlan
                                    ? `Say "${pendingPlan.challenge.spaced}" to confirm`
                                    : 'Tap to Speak a Transaction'}
                            </p>
                            <p className="text-[11px] text-[#8C8C8C] truncate">
                              {lastTranscript
                                ? `Heard: "${lastTranscript}"`
                                : 'Try: "Send 5 USDC to Ahmad" · "Check balance"'}
                            </p>
                          </div>
                        </button>

                        {/* Clean fallback type-to-speak input */}
                        <form
                          onSubmit={(e) => {
                            e.preventDefault();
                            if (!typedCommand.trim()) return;
                            const cmd = typedCommand;
                            setTypedCommand('');
                            void processCommand(cmd);
                          }}
                          className="flex items-center gap-2"
                        >
                          <input
                            type="text"
                            value={typedCommand}
                            onChange={(e) => setTypedCommand(e.target.value)}
                            placeholder="Or type a voice command..."
                            className="flex-1 h-9 px-3 rounded-xl bg-[#0F0F0F] border border-[#2A2A2A] text-xs text-white placeholder:text-[#666666] focus:outline-none focus:border-[#CCFF00]"
                          />
                          <button
                            type="submit"
                            aria-label="Run command"
                            className="h-9 w-9 rounded-xl bg-[#262626] hover:bg-[#CCFF00] text-white hover:text-[#0F0F0F] flex items-center justify-center transition-colors cursor-pointer shrink-0"
                          >
                            <Send className="w-3.5 h-3.5" aria-hidden="true" />
                          </button>
                        </form>
                      </div>

                      {/* Error / Safety Block Banner */}
                      {errorBanner && (
                        <div className="p-3.5 rounded-2xl bg-[#2A1414] border border-[#991B1B] flex items-start gap-2.5">
                          <ShieldAlert
                            className="w-4 h-4 text-[#FCA5A5] shrink-0 mt-0.5"
                            aria-hidden="true"
                          />
                          <p className="text-xs text-[#FECACA] leading-relaxed flex-1">
                            {errorBanner}
                          </p>
                          <button
                            type="button"
                            onClick={() => setErrorBanner(null)}
                            aria-label="Dismiss alert"
                            className="text-[#FCA5A5] hover:text-white cursor-pointer"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}

                      {/* Active Pre-Sign Confirmation Card (Layers 2, 4, 5) */}
                      {pendingPlan && (
                        <motion.div
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.16 }}
                          className="p-4 rounded-2xl bg-[#172112] border border-[#CCFF00]/60 space-y-3"
                        >
                          <div className="flex items-center justify-between">
                            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#CCFF00]">
                              <ShieldCheck className="w-4 h-4" aria-hidden="true" />
                              Pre-Sign Verification
                            </span>
                            <span className="text-[11px] font-mono text-[#D9F99D]">
                              Code: {pendingPlan.challenge.spaced}
                            </span>
                          </div>

                          <div className="space-y-1 text-xs">
                            <div className="flex justify-between">
                              <span className="text-[#A3A3A3]">Recipient</span>
                              <span className="font-semibold text-white">
                                {pendingPlan.recipient.name} (
                                <span className="font-mono text-[#A3A3A3]">
                                  ...{pendingPlan.recipient.wallet.slice(-4)}
                                </span>
                                )
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-[#A3A3A3]">Amount</span>
                              <span className="font-mono font-bold text-[#CCFF00] tabular-nums">
                                {pendingPlan.amount} {pendingPlan.asset}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-[#A3A3A3]">Network Fee</span>
                              <span className="font-mono text-white tabular-nums">
                                ~{pendingPlan.estimatedNetworkFeeSol.toFixed(6)} SOL
                              </span>
                            </div>
                            {pendingPlan.createsNewAta && (
                              <div className="flex justify-between text-[#FCD34D]">
                                <span>One-Time ATA Rent</span>
                                <span className="font-mono tabular-nums">
                                  +{pendingPlan.estimatedAtaRentSol.toFixed(5)} SOL
                                </span>
                              </div>
                            )}
                          </div>

                          {/* Layer 2 Challenge Input (optional quick check or direct button) */}
                          <input
                            type="text"
                            value={challengeInput}
                            onChange={(e) => setChallengeInput(e.target.value)}
                            placeholder={`Type ${pendingPlan.challenge.digits} or tap Confirm & Sign`}
                            className="w-full h-9 px-3 rounded-xl bg-[#0F0F0F] border border-[#334424] text-xs font-mono text-white placeholder:text-[#737373] focus:outline-none focus:border-[#CCFF00]"
                          />

                          <div className="grid grid-cols-2 gap-2">
                            <button
                              type="button"
                              disabled={isSigning}
                              onClick={() => {
                                setPendingPlan(null);
                                setChallengeInput('');
                                speakText('Transfer canceled.');
                              }}
                              className="min-h-[44px] rounded-xl bg-[#1F1F1F] text-xs font-semibold text-[#D4D4D4] cursor-pointer"
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              disabled={isSigning}
                              onClick={() => void executePendingPlan()}
                              className="min-h-[44px] rounded-xl bg-[#CCFF00] hover:bg-[#B8E600] text-xs font-bold text-[#0F0F0F] inline-flex items-center justify-center gap-1.5 cursor-pointer"
                            >
                              {isSigning ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
                              ) : (
                                <Check className="w-3.5 h-3.5" aria-hidden="true" />
                              )}
                              <span>
                                {executionMode === 'devnet' ? 'Sign on Devnet' : 'Confirm Sandbox'}
                              </span>
                            </button>
                          </div>
                        </motion.div>
                      )}

                      {/* Latest Confirmed Receipt Banner */}
                      {latestReceipt && (
                        <div className="p-3.5 rounded-2xl bg-[#162212] border border-[#3E6B24] space-y-1">
                          <div className="flex items-center justify-between text-xs font-bold text-[#CCFF00]">
                            <span>
                              ✓ {latestReceipt.isLiveDevnet ? 'Confirmed on Devnet' : 'Sandbox Preview'}
                            </span>
                            <span className="font-mono tabular-nums">
                              {latestReceipt.amount} {latestReceipt.asset}
                            </span>
                          </div>
                          <p className="text-xs text-[#D4E8C8]">
                            Sent to {latestReceipt.recipientName}
                          </p>
                          {latestReceipt.isLiveDevnet && latestReceipt.explorerUrl ? (
                            <a
                              href={latestReceipt.explorerUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-xs font-mono text-[#CCFF00] underline pt-0.5"
                            >
                              <span>
                                {truncateWallet(latestReceipt.signature)} · Open Solana Explorer
                              </span>
                              <ExternalLink className="w-3 h-3" aria-hidden="true" />
                            </a>
                          ) : (
                            <p className="text-[11px] font-mono text-[#8C9E82]">
                              Simulated receipt · Connect Phantom/Solflare for real Explorer links
                            </p>
                          )}
                        </div>
                      )}

                      {/* Recent Activity */}
                      <div className="space-y-2.5 pt-1">
                        <div className="flex items-center justify-between">
                          <h2 className="text-xs font-bold uppercase tracking-wider text-[#8C8C8C]">
                            Recent Activity
                          </h2>
                          <button
                            type="button"
                            onClick={() => setPhoneTab('history')}
                            className="text-xs font-semibold text-[#CCFF00] cursor-pointer"
                          >
                            See All
                          </button>
                        </div>

                        <div className="space-y-2">
                          {transactions.slice(0, 3).map((tx) => (
                            <button
                              key={tx.id}
                              type="button"
                              onClick={() =>
                                speakText(
                                  `${tx.isLiveDevnet ? 'Confirmed Solana Devnet' : 'Sandbox'} transfer of ${tx.amountUsdc} ${tx.currency} to ${tx.recipientName}.`
                                )
                              }
                              className="w-full min-h-[58px] px-3.5 py-2.5 rounded-2xl bg-[#1A1A1A] border border-[#242424] hover:border-[#3A3A3A] flex items-center justify-between gap-3 text-left cursor-pointer"
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <span className="w-9 h-9 rounded-full bg-[#242424] text-white text-xs font-bold flex items-center justify-center shrink-0">
                                  {getInitials(tx.recipientName)}
                                </span>
                                <div className="min-w-0">
                                  <p className="text-sm font-semibold text-white truncate">
                                    {tx.recipientName}
                                  </p>
                                  <p className="text-[11px] text-[#8C8C8C] truncate">
                                    {formatShortDate(tx.createdAt)} ·{' '}
                                    {tx.isLiveDevnet ? 'Live Devnet' : 'Sandbox'}
                                  </p>
                                </div>
                              </div>
                              <span className="text-xs font-mono font-bold tabular-nums text-white shrink-0">
                                -{tx.amountUsdc} {tx.currency}
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* MAIN TAB 2: CONTACTS (Matches OPPO mobile Contacts tab 1:1) */}
              {activeSheet === 'none' && phoneTab === 'contacts' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-base font-bold text-white">Verified Contacts</h2>
                      <p className="text-[11px] text-[#8C8C8C]">
                        {contacts.length} saved recipients · Anti-blind-signing allowlist
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowAddContact((v) => !v)}
                      className="min-h-[38px] px-3 rounded-xl bg-[#CCFF00] text-[#0F0F0F] text-xs font-bold inline-flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>{showAddContact ? 'Close' : 'Add'}</span>
                    </button>
                  </div>

                  {executionMode === 'devnet' && connectedWallet && (
                    <button
                      type="button"
                      onClick={handleAddConnectedWalletAsContact}
                      className="w-full min-h-[44px] px-3.5 rounded-2xl bg-[#182412] border border-[#CCFF00]/50 text-xs font-semibold text-[#CCFF00] flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <UserPlus className="w-4 h-4" aria-hidden="true" />
                      <span>Add My Connected Wallet (Safe Devnet Self-Test)</span>
                    </button>
                  )}

                  {showAddContact && (
                    <div className="p-3.5 rounded-2xl bg-[#1A1A1A] border border-[#303030] space-y-2.5">
                      <input
                        type="text"
                        value={newContactName}
                        onChange={(e) => setNewContactName(e.target.value)}
                        placeholder="Recipient name (e.g. Sarah)"
                        className="w-full h-10 px-3 rounded-xl bg-[#0F0F0F] border border-[#2C2C2C] text-xs text-white placeholder:text-[#737373] focus:outline-none focus:border-[#CCFF00]"
                      />
                      <input
                        type="text"
                        value={newContactWallet}
                        onChange={(e) => setNewContactWallet(e.target.value)}
                        placeholder="Solana Devnet wallet address (Base58)"
                        className="w-full h-10 px-3 rounded-xl bg-[#0F0F0F] border border-[#2C2C2C] text-xs font-mono text-white placeholder:text-[#737373] focus:outline-none focus:border-[#CCFF00]"
                      />
                      {contactFormError && (
                        <p className="text-[11px] text-[#FCA5A5]">{contactFormError}</p>
                      )}
                      <button
                        type="button"
                        onClick={handleCreateContact}
                        className="w-full min-h-[42px] rounded-xl bg-[#CCFF00] text-[#0F0F0F] text-xs font-bold cursor-pointer"
                      >
                        Save Verified Contact
                      </button>
                    </div>
                  )}

                  <div className="relative">
                    <Search
                      className="w-4 h-4 text-[#737373] absolute left-3.5 top-1/2 -translate-y-1/2"
                      aria-hidden="true"
                    />
                    <input
                      type="text"
                      value={contactSearch}
                      onChange={(e) => setContactSearch(e.target.value)}
                      placeholder="Search contacts..."
                      className="w-full h-10 pl-10 pr-3 rounded-2xl bg-[#1A1A1A] border border-[#262626] text-xs text-white placeholder:text-[#737373] focus:outline-none focus:border-[#CCFF00]"
                    />
                  </div>

                  <div className="space-y-2">
                    {filteredContacts.map((contact) => (
                      <div
                        key={contact.id}
                        className="p-3 rounded-2xl bg-[#1A1A1A] border border-[#262626] flex items-center justify-between gap-2"
                      >
                        <button
                          type="button"
                          onClick={() => {
                            setSendRecipient(contact);
                            setSendAsset(executionMode === 'devnet' ? 'SOL' : 'USDC');
                            setSendAmountStr(executionMode === 'devnet' ? '0.001' : '5');
                            setActiveSheet('send-amount');
                          }}
                          className="flex items-center gap-3 min-w-0 flex-1 text-left cursor-pointer"
                        >
                          <span className="w-10 h-10 rounded-full bg-[#242424] text-[#CCFF00] text-xs font-bold flex items-center justify-center shrink-0">
                            {getInitials(contact.name)}
                          </span>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-white truncate">
                              {contact.name}
                            </p>
                            <p className="text-[11px] font-mono text-[#8C8C8C] truncate">
                              {truncateWallet(contact.wallet)}
                            </p>
                          </div>
                        </button>
                        <button
                          type="button"
                          onClick={() => onDeleteContact(contact.id)}
                          aria-label={`Remove ${contact.name}`}
                          className="min-h-[40px] min-w-[40px] rounded-xl text-[#737373] hover:text-[#FCA5A5] flex items-center justify-center cursor-pointer shrink-0"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* MAIN TAB 3: HISTORY (Matches OPPO mobile History tab 1:1) */}
              {activeSheet === 'none' && phoneTab === 'history' && (
                <div className="space-y-4">
                  <div>
                    <h2 className="text-base font-bold text-white">Transaction History</h2>
                    <p className="text-[11px] text-[#8C8C8C]">
                      Tap any receipt to hear it read aloud
                    </p>
                  </div>

                  {transactions.length === 0 ? (
                    <div className="p-6 rounded-2xl bg-[#1A1A1A] border border-[#262626] text-center space-y-1.5">
                      <p className="text-sm font-semibold text-white">No transfers yet</p>
                      <p className="text-xs text-[#8C8C8C]">
                        Complete a transfer on Home to see verifiable receipts here.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {transactions.map((tx) => (
                        <div
                          key={tx.id}
                          className="p-3.5 rounded-2xl bg-[#1A1A1A] border border-[#262626] space-y-2"
                        >
                          <button
                            type="button"
                            onClick={() =>
                              speakText(
                                `${tx.isLiveDevnet ? 'Confirmed Solana Devnet' : 'Sandbox preview'} transfer of ${tx.amountUsdc} ${tx.currency} to ${tx.recipientName}.`
                              )
                            }
                            className="w-full flex items-center justify-between gap-2 text-left cursor-pointer"
                          >
                            <div className="min-w-0">
                              <p className="text-sm font-bold text-white truncate">
                                {tx.recipientName}
                              </p>
                              <p className="text-[11px] text-[#8C8C8C]">
                                {formatShortDate(tx.createdAt)} ·{' '}
                                {tx.isLiveDevnet ? 'Live Solana Devnet' : 'Sandbox Preview'}
                              </p>
                            </div>
                            <span className="text-sm font-mono font-bold tabular-nums text-[#CCFF00] shrink-0">
                              -{tx.amountUsdc} {tx.currency}
                            </span>
                          </button>

                          {tx.isLiveDevnet && tx.explorerUrl ? (
                            <a
                              href={tx.explorerUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-[11px] font-mono text-[#CCFF00] underline"
                            >
                              <span>{truncateWallet(tx.txSignature)} · View on Explorer</span>
                              <ExternalLink className="w-3 h-3" aria-hidden="true" />
                            </a>
                          ) : (
                            <p className="text-[11px] font-mono text-[#737373]">
                              Ref: {truncateWallet(tx.txSignature)}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Mobile Fixed Bottom Tab Bar (Home · Contacts · History — matches OPPO app 1:1) */}
            <nav
              aria-label="Mobile app navigation"
              className="h-16 px-4 bg-[#121212] border-t border-[#222222] grid grid-cols-3 items-center shrink-0"
            >
              {(
                [
                  { id: 'home', label: 'Home', Icon: Home },
                  { id: 'contacts', label: 'Contacts', Icon: Users },
                  { id: 'history', label: 'History', Icon: Clock },
                ] as const
              ).map(({ id, label, Icon }) => {
                const active = phoneTab === id && activeSheet === 'none';
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => {
                      setActiveSheet('none');
                      setPhoneTab(id);
                      if (id === 'home') setHomeSurface('visual');
                      speakText(`${label} tab.`);
                    }}
                    className={`min-h-[44px] flex flex-col items-center justify-center gap-1 transition-colors cursor-pointer ${
                      active ? 'text-[#CCFF00]' : 'text-[#737373] hover:text-white'
                    }`}
                  >
                    <Icon className="w-5 h-5" strokeWidth={active ? 2.4 : 2} aria-hidden="true" />
                    <span className="text-[10px] font-semibold">{label}</span>
                  </button>
                );
              })}
            </nav>
          </div>
        </div>

        {/* RIGHT RAIL: Clean Judge Scenario Controls + Live Spoken Caption */}
        <div className="lg:col-span-6 space-y-5">
          {/* 1. Live Spoken Caption Card (So muted judges follow every spoken word) */}
          <div className="bg-white border border-[#E2E6DC] rounded-2xl p-5 space-y-2.5 shadow-[0_6px_20px_rgba(30,49,36,0.04)]">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-xs font-bold text-[#356341]">
                <AudioLines className="w-4 h-4" aria-hidden="true" />
                <span>Live Spoken Output</span>
              </div>
              <button
                type="button"
                onClick={() => speakText(spokenLine)}
                className="text-xs font-semibold text-[#526658] hover:text-[#1E3124] cursor-pointer"
              >
                Replay Audio
              </button>
            </div>
            <p className="text-sm sm:text-[15px] text-[#1E3124] leading-relaxed font-medium">
              &ldquo;{spokenLine}&rdquo;
            </p>
          </div>

          {/* 2. One-Tap Judge Scenarios */}
          <div className="bg-white border border-[#E2E6DC] rounded-2xl p-5 space-y-3 shadow-[0_6px_20px_rgba(30,49,36,0.04)]">
            <div className="space-y-0.5">
              <h2 className="text-base font-bold text-[#1E3124]">Quick Demo Scenarios</h2>
              <p className="text-xs text-[#526658]">
                Tap any scenario to test the full spoken verification flow inside the phone.
              </p>
            </div>

            <div className="divide-y divide-[#EDF0E8]">
              {quickScenarios.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={item.action}
                  className="w-full py-3.5 first:pt-2 last:pb-1 flex items-center justify-between gap-4 text-left group cursor-pointer"
                >
                  <div className="space-y-0.5 min-w-0">
                    <p className="text-sm font-bold text-[#1E3124] group-hover:text-[#356341] transition-colors">
                      {item.title}
                    </p>
                    <p className="text-xs text-[#526658] leading-relaxed">{item.description}</p>
                    <p className="text-[11px] font-mono text-[#788A7D] pt-0.5">
                      &ldquo;{item.command}&rdquo;
                    </p>
                  </div>
                  <span className="w-8 h-8 rounded-full bg-[#F2F6EE] group-hover:bg-[#356341] text-[#356341] group-hover:text-white flex items-center justify-center shrink-0 transition-colors">
                    <ArrowUpRight className="w-4 h-4" aria-hidden="true" />
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* 3. Live Solana Devnet Judge Helper */}
          <div className="bg-[#F4F7F0] border border-[#DCE4D4] rounded-2xl p-5 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-bold text-[#1E3124]">
                {executionMode === 'devnet'
                  ? 'Live Solana Devnet Testing'
                  : 'Want to Broadcast a Real Devnet Transaction?'}
              </h3>
              <span className="text-xs font-mono text-[#356341] font-semibold">
                solana:devnet
              </span>
            </div>

            {executionMode === 'devnet' ? (
              <div className="space-y-3 text-xs text-[#526658] leading-relaxed">
                <p>
                  Connect <strong>Phantom</strong> or <strong>Solflare</strong> switched to{' '}
                  <strong>Devnet</strong> in your wallet settings. Need free test SOL? Request a
                  Devnet airdrop, save your own wallet as a verified contact, and send{' '}
                  <span className="font-mono text-[#1E3124]">0.001 SOL</span> to verify the real
                  Solana Explorer receipt.
                </p>
                <div className="flex flex-wrap items-center gap-2.5">
                  <a
                    href={SOLANA_DEVNET_FAUCET_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-white border border-[#D4DDD0] hover:border-[#356341] text-xs font-semibold text-[#1E3124] transition-colors"
                  >
                    <span>Solana Devnet Faucet</span>
                    <ExternalLink className="w-3.5 h-3.5 text-[#356341]" aria-hidden="true" />
                  </a>
                  {connectedWallet && (
                    <button
                      type="button"
                      onClick={handleAddConnectedWalletAsContact}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-[#356341] hover:bg-[#2A5135] text-xs font-bold text-white transition-colors cursor-pointer"
                    >
                      <UserPlus className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>Save My Wallet for Self-Test</span>
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <p className="text-xs text-[#526658] leading-relaxed">
                  You are currently in <strong>Instant Sandbox</strong> (zero wallet needed). Switch
                  to Live Solana Devnet anytime to sign and verify real transactions on-chain.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setExecutionMode('devnet');
                    setPendingPlan(null);
                    setDetectedWallets(detectBrowserSolanaWallets());
                  }}
                  className="px-4 py-2 rounded-full bg-[#356341] hover:bg-[#2A5135] text-xs font-bold text-white whitespace-nowrap shrink-0 cursor-pointer"
                >
                  Switch to Live Devnet
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
