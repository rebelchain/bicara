'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import {
  Mic,
  MicOff,
  Users,
  Clock,
  Wallet,
  Volume2,
  VolumeX,
  CheckCircle2,
  AlertCircle,
  Send,
  Loader2,
  Smartphone,
  ShieldCheck,
  ShieldAlert,
  RefreshCw,
  EyeOff,
  Eye,
  Fingerprint,
  HelpCircle,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import {
  DEFAULT_VOICEPRINT_PROFILE,
  DEMO_SENDER_WALLET,
  HAPTIC_DESCRIPTIONS,
  USDC_MINT_DEVNET,
  VOICE_SCRIPTS,
  buildScribeKeyterms,
  executeSimulatedTransfer,
  narrateTabScreen,
  parseIntentFallback,
  resolveContact,
  truncateWallet,
  usdcToRawUnits,
  validateIntent,
  verifySpeakerVoiceprint,
  type Contact,
  type HapticPatternId,
  type PaymentIntent,
  type PhoneTabId,
  type SpeakerKind,
  type TransactionRecord,
  type TransferInstructionSummary,
  type VoiceprintCheckResult,
  type VoiceprintProfile,
} from '@/lib/bicara-engine';
import PhoneContactsTab from './PhoneContactsTab';
import PhoneHistoryTab from './PhoneHistoryTab';
import VoiceOnboardingOverlay from './VoiceOnboardingOverlay';

type VoiceStage =
  | 'idle'
  | 'recording'
  | 'processing'
  | 'confirming'
  | 'sending'
  | 'success'
  | 'error';

interface PendingTransfer {
  intent: PaymentIntent;
  recipient: Contact;
  resolutionSource: 'supabase' | 'on_chain';
  transcript: string;
}

interface PipelineMetrics {
  sttMs: number;
  nluMs: number;
  resolveMs: number;
  txMs: number;
  ttsMs: number;
  engineLabel: string;
}

interface PrototypeWorkspaceProps {
  contacts: Contact[];
  transactions: TransactionRecord[];
  senderBalanceUsdc: number;
  senderBalanceSol: number;
  walletConnected: boolean;
  onToggleWallet: () => void;
  onAddContact: (contact: Contact) => void;
  onDeleteContact: (id: string) => void;
  onCompleteTransfer: (tx: TransactionRecord, nextBalance: number, recipientId: string) => void;
  onResetBalances: () => void;
  demoTriggerNonce: number;
}

const DEMO_UTTERANCES = [
  { label: 'Nav: Cek Saldo', text: 'Cek saldo' },
  { label: 'Nav: Buka Kontak', text: 'Buka kontak' },
  { label: 'Nav: Buka Riwayat', text: 'Buka riwayat' },
  { label: 'Nav: Bantuan', text: 'Bantuan' },
  { label: 'Pay: Happy Path', text: 'Kirim 5 dolar ke Ahmad' },
  { label: 'Voice Confirm', text: 'Ya' },
  { label: 'Pay: Spoken Words', text: 'Transfer dua puluh USDC ke Budi' },
  { label: 'Edge: Missing ATA', text: 'Kirim 5 dolar ke Raka' },
  { label: 'Edge: Not Found', text: 'Kirim 5 dolar ke Reza' },
];

const WAVEFORM_HEIGHTS = [0.3, 0.7, 0.45, 0.95, 0.6, 1, 0.5, 0.85, 0.4, 0.9, 0.55, 0.75];

interface BrowserSpeechRecognition {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

export default function PrototypeWorkspace({
  contacts,
  transactions,
  senderBalanceUsdc,
  senderBalanceSol,
  walletConnected,
  onToggleWallet,
  onAddContact,
  onDeleteContact,
  onCompleteTransfer,
  onResetBalances,
  demoTriggerNonce,
}: PrototypeWorkspaceProps) {
  const [phoneTab, setPhoneTab] = useState<PhoneTabId>('home');
  const [voiceStage, setVoiceStage] = useState<VoiceStage>('idle');
  const [nluMode, setNluMode] = useState<'fallback' | 'ai'>('fallback');
  const [ttsEnabled, setTtsEnabled] = useState(true);
  const [autoCreateAta, setAutoCreateAta] = useState(true);

  // Eyes-Free Blind Mode & On-Device Voiceprint State
  const [eyesFreeMode, setEyesFreeMode] = useState(true);
  const [screenCurtain, setScreenCurtain] = useState(false);
  const [activeSpeaker, setActiveSpeaker] = useState<SpeakerKind>('owner');
  const [voiceprintProfile, setVoiceprintProfile] = useState<VoiceprintProfile>(
    DEFAULT_VOICEPRINT_PROFILE
  );
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [lastVoiceprintResult, setLastVoiceprintResult] =
    useState<VoiceprintCheckResult | null>(null);
  const [lastHaptic, setLastHaptic] = useState<HapticPatternId | null>('tick');

  const [transcript, setTranscript] = useState<string>('');
  const [customCommand, setCustomCommand] = useState<string>('');
  const [parsedIntent, setParsedIntent] = useState<PaymentIntent | null>(null);
  const [pendingTransfer, setPendingTransfer] = useState<PendingTransfer | null>(null);
  const [lastInstruction, setLastInstruction] = useState<TransferInstructionSummary | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [spokenLine, setSpokenLine] = useState<string | null>(
    `Halaman Beranda. Saldo kamu ${senderBalanceUsdc.toFixed(2)} USDC. Sentuh layar di mana saja lalu bicara.`
  );
  const [missingContactName, setMissingContactName] = useState<string | null>(null);
  const [prefillContactName, setPrefillContactName] = useState<string | null>(null);
  const [mirrorContactId, setMirrorContactId] = useState<string>('cnt-ahmad');
  const [lastDeltaContactId, setLastDeltaContactId] = useState<string | null>(null);
  const [lastDeltaAmount, setLastDeltaAmount] = useState<number>(0);

  const [metrics, setMetrics] = useState<PipelineMetrics>({
    sttMs: 0,
    nluMs: 0,
    resolveMs: 0,
    txMs: 0,
    ttsMs: 0,
    engineLabel: 'Offline Regex Fallback',
  });

  const recognitionRef = useRef<BrowserSpeechRecognition | null>(null);
  const lastHandledDemoRef = useRef<number>(demoTriggerNonce);

  const speakOut = useCallback(
    (text: string, haptic?: HapticPatternId) => {
      setSpokenLine(text);
      if (haptic) {
        setLastHaptic(haptic);
      }
      if (!ttsEnabled || typeof window === 'undefined' || !('speechSynthesis' in window)) {
        return;
      }
      try {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'id-ID';
        utterance.rate = 0.98;
        window.speechSynthesis.speak(utterance);
      } catch {
        // Browser speech synthesis unavailable
      }
    },
    [ttsEnabled]
  );

  const handleSelectPhoneTab = useCallback(
    (tab: PhoneTabId, forceSpeak = false) => {
      setPhoneTab(tab);
      setLastHaptic('tick');
      const narration = narrateTabScreen(tab, {
        walletConnected,
        senderBalanceUsdc,
        senderBalanceSol,
        contacts,
        transactions,
      });
      if (eyesFreeMode || forceSpeak) {
        speakOut(narration, 'tick');
      } else {
        setSpokenLine(narration);
      }
    },
    [walletConnected, senderBalanceUsdc, senderBalanceSol, contacts, transactions, eyesFreeMode, speakOut]
  );

  const handleConfirmTransfer = useCallback(async () => {
    if (!pendingTransfer) return;

    setVoiceStage('sending');
    setLastHaptic('tick');
    await new Promise((resolve) => setTimeout(resolve, 420));

    const result = executeSimulatedTransfer({
      walletConnected,
      confirmedByUser: true,
      senderWallet: DEMO_SENDER_WALLET,
      senderBalanceUsdc,
      recipient: pendingTransfer.recipient,
      amount: pendingTransfer.intent.amount ?? 0,
      currency: pendingTransfer.intent.currency ?? 'USDC',
      voiceTranscript: pendingTransfer.transcript,
      resolutionSource: pendingTransfer.resolutionSource,
      autoCreateAta,
    });

    if (!result.ok || !result.tx) {
      setVoiceStage('error');
      setStatusMessage(result.spokenMessage);
      setPendingTransfer(null);
      speakOut(result.spokenMessage, 'error');
      return;
    }

    setLastInstruction(result.instruction ?? null);
    onCompleteTransfer(result.tx, result.nextSenderBalance, pendingTransfer.recipient.id);
    setLastDeltaContactId(pendingTransfer.recipient.id);
    setLastDeltaAmount(result.tx.amountUsdc);
    setPendingTransfer(null);
    setVoiceStage('success');
    setStatusMessage(result.spokenMessage);
    setMetrics((prev) => ({ ...prev, txMs: 1380, ttsMs: 112 }));
    speakOut(result.spokenMessage, 'success');
  }, [
    pendingTransfer,
    walletConnected,
    senderBalanceUsdc,
    autoCreateAta,
    onCompleteTransfer,
    speakOut,
  ]);

  const handleCancelTransfer = useCallback(() => {
    setPendingTransfer(null);
    setVoiceStage('idle');
    setStatusMessage('Pengiriman dibatalkan.');
    speakOut('Pengiriman dibatalkan. Kamu kembali ke halaman beranda.', 'tick');
  }, [speakOut]);

  const processTranscript = useCallback(
    async (spokenText: string) => {
      const cleaned = spokenText.trim();
      if (!cleaned) return;

      setVoiceStage('processing');
      setTranscript(cleaned);
      setParsedIntent(null);
      setLastInstruction(null);
      setStatusMessage(null);
      setMissingContactName(null);

      // Step 2: Simulated scribe_v2 STT timing
      const sttMs = 820;

      // Step 3: Intent Parsing (either Live Gemini API route or deterministic fallback)
      let intent: PaymentIntent;
      let nluMs = 12;
      let engineLabel = 'Offline Regex Fallback';

      if (nluMode === 'ai') {
        const started = performance.now();
        try {
          const res = await fetch('/api/intent', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              transcript: cleaned,
              mode: 'ai',
              contactNames: contacts.map((c) => c.name),
            }),
          });
          const data = await res.json();
          if (!res.ok) {
            setVoiceStage('error');
            setLastHaptic('error');
            setStatusMessage(
              data.error ||
                'Gemini AI NLU request failed. Switch to Offline Fallback or check GEMINI_API_KEY.'
            );
            return;
          }
          intent = data.intent as PaymentIntent;
          nluMs = Math.round(data.latencyMs ?? performance.now() - started);
          engineLabel = 'Gemini 4 Hydrogen (Server API)';
        } catch (err) {
          setVoiceStage('error');
          setLastHaptic('error');
          setStatusMessage(
            err instanceof Error ? err.message : 'Gagal menghubungi endpoint /api/intent.'
          );
          return;
        }
      } else {
        intent = parseIntentFallback(cleaned);
        nluMs = 14;
        engineLabel = 'Offline Regex Fallback';
      }

      setParsedIntent(intent);

      // Stage 00: Factor 1 On-Device Voiceprint Gate (Picovoice Eagle)
      const vpResult = verifySpeakerVoiceprint(voiceprintProfile, activeSpeaker, intent.action);
      setLastVoiceprintResult(vpResult);

      if (!vpResult.verified) {
        const blockMsg =
          vpResult.spokenMessage ?? VOICE_SCRIPTS.voiceprintBlocked(vpResult.scorePct);
        setVoiceStage('error');
        setStatusMessage(blockMsg);
        setMetrics({ sttMs, nluMs, resolveMs: 0, txMs: 0, ttsMs: 95, engineLabel });
        speakOut(blockMsg, vpResult.haptic);
        return;
      }

      // Unified Voice Actions: Accessibility, Navigation & Queries
      if (intent.action === 'help') {
        const msg = VOICE_SCRIPTS.helpGuide();
        setVoiceStage('idle');
        setStatusMessage(msg);
        setMetrics({ sttMs, nluMs, resolveMs: 0, txMs: 0, ttsMs: 105, engineLabel });
        speakOut(msg, 'tick');
        return;
      }

      if (intent.action === 'repeat') {
        const fallbackNarration = narrateTabScreen(phoneTab, {
          walletConnected,
          senderBalanceUsdc,
          senderBalanceSol,
          contacts,
          transactions,
        });
        const msg = spokenLine ?? fallbackNarration;
        setVoiceStage('idle');
        setStatusMessage(msg);
        setMetrics({ sttMs, nluMs, resolveMs: 0, txMs: 0, ttsMs: 95, engineLabel });
        speakOut(msg, 'tick');
        return;
      }

      if (intent.action === 'confirm') {
        if (pendingTransfer) {
          await handleConfirmTransfer();
        } else {
          const msg = VOICE_SCRIPTS.noPendingConfirm();
          setVoiceStage('idle');
          setStatusMessage(msg);
          speakOut(msg, 'tick');
        }
        return;
      }

      if (intent.action === 'cancel') {
        if (pendingTransfer) {
          handleCancelTransfer();
        } else {
          setVoiceStage('idle');
          setStatusMessage('Tidak ada transaksi aktif untuk dibatalkan.');
          speakOut('Tidak ada transaksi aktif untuk dibatalkan.', 'tick');
        }
        return;
      }

      if (intent.action === 'check_balance') {
        setPhoneTab('home');
        setPendingTransfer(null);
        const msg = walletConnected
          ? VOICE_SCRIPTS.balanceReadout(senderBalanceUsdc, senderBalanceSol)
          : VOICE_SCRIPTS.walletDisconnected();
        setVoiceStage('idle');
        setStatusMessage(msg);
        setMetrics({ sttMs, nluMs, resolveMs: 0, txMs: 0, ttsMs: 100, engineLabel });
        speakOut(msg, 'tick');
        return;
      }

      if (intent.action === 'navigate') {
        const target: PhoneTabId = intent.targetTab ?? 'home';
        setPendingTransfer(null);
        setVoiceStage('idle');
        const msg = narrateTabScreen(target, {
          walletConnected,
          senderBalanceUsdc,
          senderBalanceSol,
          contacts,
          transactions,
        });
        setPhoneTab(target);
        setStatusMessage(msg);
        setMetrics({ sttMs, nluMs, resolveMs: 0, txMs: 0, ttsMs: 100, engineLabel });
        speakOut(msg, 'tick');
        return;
      }

      if (intent.action === 'list_contacts') {
        setPendingTransfer(null);
        setVoiceStage('idle');
        const msg = narrateTabScreen('contacts', {
          walletConnected,
          senderBalanceUsdc,
          senderBalanceSol,
          contacts,
          transactions,
        });
        setPhoneTab('contacts');
        setStatusMessage(msg);
        setMetrics({ sttMs, nluMs, resolveMs: 40, txMs: 0, ttsMs: 105, engineLabel });
        speakOut(msg, 'tick');
        return;
      }

      if (intent.action === 'read_history') {
        setPendingTransfer(null);
        setVoiceStage('idle');
        const msg = narrateTabScreen('history', {
          walletConnected,
          senderBalanceUsdc,
          senderBalanceSol,
          contacts,
          transactions,
        });
        setPhoneTab('history');
        setStatusMessage(msg);
        setMetrics({ sttMs, nluMs, resolveMs: 40, txMs: 0, ttsMs: 105, engineLabel });
        speakOut(msg, 'tick');
        return;
      }

      // Payment Send Flow
      setPhoneTab('home');
      setPendingTransfer(null);

      const validation = validateIntent(intent);
      if (!validation.valid) {
        setVoiceStage('error');
        const msg = validation.promptText ?? VOICE_SCRIPTS.unknownIntent();
        setStatusMessage(msg);
        setMetrics({ sttMs, nluMs, resolveMs: 0, txMs: 0, ttsMs: 110, engineLabel });
        speakOut(msg, 'error');
        return;
      }

      // Step 4: Contact Resolution (Supabase primary + On-Chain PDA fallback)
      const resolution = resolveContact(contacts, intent.recipient ?? '');
      const resolveMs = resolution.source === 'on_chain' ? 420 : 75;

      if (resolution.status === 'not_found' || !resolution.contact) {
        const name = intent.recipient ?? 'tersebut';
        const msg = VOICE_SCRIPTS.contactNotFound(name);
        setVoiceStage('error');
        setMissingContactName(name);
        setStatusMessage(msg);
        setMetrics({ sttMs, nluMs, resolveMs, txMs: 0, ttsMs: 110, engineLabel });
        speakOut(msg, 'error');
        return;
      }

      if (resolution.status === 'ambiguous') {
        const msg = VOICE_SCRIPTS.ambiguousContact(
          resolution.candidates.map((c) => c.name)
        );
        setVoiceStage('error');
        setStatusMessage(msg);
        setMetrics({ sttMs, nluMs, resolveMs, txMs: 0, ttsMs: 110, engineLabel });
        speakOut(msg, 'error');
        return;
      }

      // Step 5: Mandatory Confirmation Modal (NEVER auto-send!)
      const recipient = resolution.contact;
      const source = resolution.source ?? 'supabase';
      setPendingTransfer({
        intent,
        recipient,
        resolutionSource: source,
        transcript: cleaned,
      });
      setMirrorContactId(recipient.id);
      setVoiceStage('confirming');
      setMetrics({ sttMs, nluMs, resolveMs, txMs: 0, ttsMs: 105, engineLabel });
      speakOut(
        VOICE_SCRIPTS.confirmSend(
          intent.amount!,
          intent.currency ?? 'USDC',
          recipient.name
        ),
        'confirm'
      );
    },
    [
      nluMode,
      contacts,
      transactions,
      voiceprintProfile,
      activeSpeaker,
      phoneTab,
      walletConnected,
      senderBalanceUsdc,
      senderBalanceSol,
      spokenLine,
      pendingTransfer,
      handleConfirmTransfer,
      handleCancelTransfer,
      speakOut,
    ]
  );

  // Triggered by the Top Bar "Run Demo Flow" CTA
  useEffect(() => {
    if (demoTriggerNonce !== lastHandledDemoRef.current) {
      lastHandledDemoRef.current = demoTriggerNonce;
      void processTranscript('Kirim 5 dolar ke Ahmad');
    }
  }, [demoTriggerNonce, processTranscript]);

  const handleMicToggle = () => {
    if (voiceStage === 'recording') {
      recognitionRef.current?.stop();
      setVoiceStage('idle');
      return;
    }

    if (voiceStage === 'processing' || voiceStage === 'sending') return;

    setLastHaptic('listen');

    const SpeechCtor =
      typeof window !== 'undefined'
        ? (
            window as unknown as {
              SpeechRecognition?: new () => BrowserSpeechRecognition;
              webkitSpeechRecognition?: new () => BrowserSpeechRecognition;
            }
          ).SpeechRecognition ||
          (
            window as unknown as {
              webkitSpeechRecognition?: new () => BrowserSpeechRecognition;
            }
          ).webkitSpeechRecognition
        : undefined;

    if (!SpeechCtor) {
      setVoiceStage('recording');
      setStatusMessage('Browser Speech API tidak tersedia — mensimulasikan audio demo...');
      setTimeout(() => {
        void processTranscript(pendingTransfer ? 'Ya' : 'Kirim 5 dolar ke Ahmad');
      }, 600);
      return;
    }

    try {
      const rec = new SpeechCtor();
      rec.lang = 'id-ID';
      rec.interimResults = false;
      rec.maxAlternatives = 1;

      rec.onresult = (event) => {
        const text = event.results[0]?.[0]?.transcript ?? '';
        if (text) {
          void processTranscript(text);
        } else {
          setVoiceStage('error');
          setLastHaptic('error');
          setStatusMessage('Suara tidak terdeteksi. Coba lagi atau pilih contoh perintah.');
        }
      };

      rec.onerror = () => {
        setVoiceStage('error');
        setLastHaptic('error');
        setStatusMessage(
          'Akses mikrofon diblokir atau tidak tersedia. Gunakan input teks atau contoh perintah di kanan.'
        );
      };

      rec.onend = () => {
        setVoiceStage((curr) => (curr === 'recording' ? 'idle' : curr));
      };

      recognitionRef.current = rec;
      setVoiceStage('recording');
      setStatusMessage('Bicara sekarang... contoh: "Cek saldo" atau "Kirim 5 dolar ke Ahmad"');
      rec.start();
    } catch {
      setVoiceStage('error');
      setLastHaptic('error');
      setStatusMessage('Gagal memulai mikrofon browser. Gunakan contoh perintah di samping.');
    }
  };

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customCommand.trim()) return;
    void processTranscript(customCommand);
    setCustomCommand('');
  };

  const mirrorContact = contacts.find((c) => c.id === mirrorContactId) ?? contacts[0];
  const scribeKeyterms = buildScribeKeyterms(contacts);
  const totalLatencyMs =
    metrics.sttMs + metrics.nluMs + metrics.resolveMs + metrics.txMs + metrics.ttsMs;
  const activeHapticInfo = lastHaptic ? HAPTIC_DESCRIPTIONS[lastHaptic] : null;

  const vpBlocked = lastVoiceprintResult !== null && !lastVoiceprintResult.verified;

  const pipelineSteps = [
    {
      num: '00',
      title: 'On-Device Voiceprint Gate (Eagle)',
      detail: lastVoiceprintResult
        ? lastVoiceprintResult.bypassed
          ? 'Safe action bypass · accessibility open'
          : lastVoiceprintResult.verified
            ? `${lastVoiceprintResult.speakerLabel} · ${lastVoiceprintResult.scorePct}% match (≥75%)`
            : `BLOCKED · ${lastVoiceprintResult.scorePct}% < 75% threshold`
        : `${activeSpeaker === 'owner' ? voiceprintProfile.ownerLabel : 'Impostor B (Asing)'} · threshold 75%`,
      done: Boolean(lastVoiceprintResult?.verified),
      blocked: vpBlocked,
      active: false,
    },
    {
      num: '01',
      title: 'Audio Capture & Haptics (expo-audio)',
      detail: activeHapticInfo
        ? `${transcript ? '16kHz PCM captured' : 'Tap-anywhere ready'} · ${activeHapticInfo.label}`
        : 'Waiting for Tap-Anywhere or MicButton',
      done: Boolean(transcript),
      blocked: false,
      active: voiceStage === 'recording',
    },
    {
      num: '02',
      title: 'ElevenLabs STT (scribe_v2)',
      detail: transcript ? `"${transcript}"` : `${scribeKeyterms.length} nav + contact keyterms primed`,
      done: Boolean(transcript),
      blocked: false,
      active: voiceStage === 'processing' && !parsedIntent,
    },
    {
      num: '03',
      title: `Intent NLU (${nluMode === 'ai' ? 'Gemini AI' : 'Offline Fallback'})`,
      detail: parsedIntent
        ? parsedIntent.action === 'send'
          ? `send · ${parsedIntent.amount ?? '—'} ${parsedIntent.currency ?? ''} → ${parsedIntent.recipient ?? '—'}`
          : `${parsedIntent.action}${parsedIntent.targetTab ? ` → ${parsedIntent.targetTab}` : ''}`
        : 'Extracts unified Payment + VoiceNav JSON',
      done: Boolean(parsedIntent),
      blocked: false,
      active: voiceStage === 'processing',
    },
    {
      num: '04',
      title: 'Hybrid Contact Resolver',
      detail: pendingTransfer
        ? `${pendingTransfer.recipient.name} via ${pendingTransfer.resolutionSource === 'on_chain' ? 'ContactRegistry PDA' : 'Supabase'}`
        : lastInstruction
          ? 'Resolved & verified'
          : 'Supabase primary + Anchor PDA fallback',
      done: Boolean(pendingTransfer || lastInstruction),
      blocked: false,
      active: false,
    },
    {
      num: '05',
      title: 'Confirm + TTS (eleven_flash_v2_5)',
      detail:
        voiceStage === 'confirming'
          ? 'Awaiting voice "Ya" or tap — never auto-sends'
          : lastInstruction
            ? 'Confirmed explicitly by User A'
            : 'Spoken navbar + double haptic on send',
      done: Boolean(lastInstruction),
      blocked: false,
      active: voiceStage === 'confirming',
    },
    {
      num: '06',
      title: 'MWA 2.0 Seed Vault + TransferChecked',
      detail: lastInstruction
        ? `rawAmount=${lastInstruction.rawAmount} (6 decimals)`
        : 'Factor 2 biometric · solana:devnet',
      done: Boolean(lastInstruction),
      blocked: false,
      active: voiceStage === 'sending',
    },
  ];

  return (
    <section aria-label="Interactive Bicara Solana Mobile Prototype" className="space-y-5">
      {/* Compact Hero / Context Header */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 pb-4 border-b border-[#22272D]">
        <div className="space-y-1.5 max-w-2xl">
          <p className="text-xs font-medium text-[#94A3B8]">
            Eyes-Free Blind Accessibility · On-Device Voiceprint + MWA Seed Vault · Solana Devnet
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#F8FAFC] [text-wrap:balance]">
            Full-Voice Eyes-Free USDC Wallet on Solana Mobile
          </h1>
        </div>

        {/* Engine, Audio & Reset Controls */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <div
            role="group"
            aria-label="Intent Parser Engine"
            className="inline-flex items-center p-1 bg-[#14171A] border border-[#262B30] rounded-lg"
          >
            <button
              type="button"
              onClick={() => setNluMode('fallback')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                nluMode === 'fallback'
                  ? 'bg-[#22C55E] text-[#052E16]'
                  : 'text-[#94A3B8] hover:text-[#F8FAFC]'
              }`}
            >
              Offline Fallback
            </button>
            <button
              type="button"
              onClick={() => setNluMode('ai')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                nluMode === 'ai'
                  ? 'bg-[#22C55E] text-[#052E16]'
                  : 'text-[#94A3B8] hover:text-[#F8FAFC]'
              }`}
            >
              Gemini AI NLU
            </button>
          </div>

          <button
            type="button"
            onClick={() => setTtsEnabled((v) => !v)}
            aria-pressed={ttsEnabled}
            aria-label={ttsEnabled ? 'Matikan suara TTS' : 'Aktifkan suara TTS'}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-[#E2E8F0] bg-[#14171A] border border-[#262B30] hover:border-[#3A414A] rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            {ttsEnabled ? (
              <>
                <Volume2 className="w-3.5 h-3.5 text-[#22C55E]" />
                <span>TTS On</span>
              </>
            ) : (
              <>
                <VolumeX className="w-3.5 h-3.5 text-[#64748B]" />
                <span>TTS Muted</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={() => {
              onResetBalances();
              setLastDeltaContactId(null);
              setLastDeltaAmount(0);
              setVoiceStage('idle');
              setStatusMessage(null);
              setPendingTransfer(null);
              setLastInstruction(null);
              setLastVoiceprintResult(null);
              setActiveSpeaker('owner');
              setScreenCurtain(false);
            }}
            aria-label="Reset Devnet demo balances"
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-[#94A3B8] hover:text-[#F8FAFC] bg-[#14171A] border border-[#262B30] rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Reset Devnet</span>
          </button>
        </div>
      </div>

      {/* Eyes-Free Accessibility & Speaker Verification Simulator Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 bg-[#14171A] border border-[#23282E] rounded-xl">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-xs text-[#94A3B8]">
            <Fingerprint className="w-4 h-4 text-[#22C55E]" aria-hidden="true" />
            <span className="font-medium text-[#E2E8F0]">Speaker Voiceprint:</span>
          </div>

          <div
            role="group"
            aria-label="Simulasi Identitas Pembicara"
            className="inline-flex items-center p-1 bg-[#0B0D0E] border border-[#262B30] rounded-lg"
          >
            <button
              type="button"
              data-testid="speaker-owner"
              onClick={() => {
                setActiveSpeaker('owner');
                setLastVoiceprintResult(null);
              }}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                activeSpeaker === 'owner'
                  ? 'bg-[#22C55E] text-[#052E16]'
                  : 'text-[#94A3B8] hover:text-[#F8FAFC]'
              }`}
            >
              User A (Pemilik · 94%)
            </button>
            <button
              type="button"
              data-testid="speaker-impostor"
              onClick={() => {
                setActiveSpeaker('impostor');
                setLastVoiceprintResult(null);
              }}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                activeSpeaker === 'impostor'
                  ? 'bg-[#EF4444] text-white'
                  : 'text-[#94A3B8] hover:text-[#F8FAFC]'
              }`}
            >
              Impostor B (Asing · 28%)
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            data-testid="open-onboarding"
            onClick={() => {
              setScreenCurtain(false);
              setShowOnboarding(true);
            }}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-[#E2E8F0] bg-[#0E1114] hover:bg-[#191E24] border border-[#262B30] hover:border-[#22C55E]/50 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#22C55E]" aria-hidden="true" />
            <span>Onboarding Suara</span>
          </button>

          <button
            type="button"
            data-testid="toggle-eyes-free"
            aria-pressed={eyesFreeMode}
            onClick={() => {
              const next = !eyesFreeMode;
              setEyesFreeMode(next);
              if (next) {
                speakOut(
                  'Mode Eyes-Free aktif. Semua menu dibacakan dan sentuh layar di mana saja untuk bicara.',
                  'tick'
                );
              }
            }}
            className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap cursor-pointer ${
              eyesFreeMode
                ? 'bg-[#112016] border-[#22C55E]/50 text-[#86EFAC]'
                : 'bg-[#0E1114] border-[#262B30] text-[#94A3B8] hover:text-[#F8FAFC]'
            }`}
          >
            <Volume2 className="w-3.5 h-3.5" aria-hidden="true" />
            <span>{eyesFreeMode ? 'Eyes-Free: On' : 'Eyes-Free: Off'}</span>
          </button>

          <button
            type="button"
            data-testid="toggle-curtain"
            aria-pressed={screenCurtain}
            onClick={() => {
              const next = !screenCurtain;
              setScreenCurtain(next);
              if (next) {
                setEyesFreeMode(true);
                speakOut(
                  'Mode layar gelap aktif untuk demo tunanetra. Sentuh layar di mana saja untuk bicara.',
                  'tick'
                );
              }
            }}
            className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap cursor-pointer ${
              screenCurtain
                ? 'bg-[#1D2430] border-[#60A5FA]/60 text-[#BFDBFE]'
                : 'bg-[#0E1114] border-[#262B30] text-[#E2E8F0] hover:border-[#3A414A]'
            }`}
          >
            {screenCurtain ? (
              <Eye className="w-3.5 h-3.5" aria-hidden="true" />
            ) : (
              <EyeOff className="w-3.5 h-3.5" aria-hidden="true" />
            )}
            <span>{screenCurtain ? 'Matikan Layar Gelap' : 'Layar Gelap (Demo Tunanetra)'}</span>
          </button>
        </div>
      </div>

      {/* Main 12-Column Split: Seeker Phone Simulator (5 cols) + Live Pipeline & Two-Phone Mirror (7 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN: Phone A — Bicara Seeker Mobile Simulator */}
        <div className="lg:col-span-5 flex flex-col items-center">
          <div className="w-full max-w-[390px] bg-[#0B0D0E] border border-[#2A3038] rounded-[28px] overflow-hidden shadow-2xl shadow-black/60 flex flex-col h-[710px] relative">
            {/* Phone Status Strip */}
            <div className="px-5 pt-3 pb-2 flex items-center justify-between gap-2 text-[11px] font-mono text-[#64748B] border-b border-[#181C21]">
              <span className="whitespace-nowrap">Seeker · MWA</span>
              <span className="whitespace-nowrap">
                {voiceprintProfile.enrolled ? 'Eagle Ready' : 'Unenrolled'} · devnet
              </span>
            </div>

            {/* Phone Top Bar */}
            <div className="px-4 py-2.5 flex items-center justify-between gap-2 border-b border-[#181C21]">
              <div className="flex items-center gap-2">
                <span className="font-display text-base font-bold tracking-tight text-[#F8FAFC]">
                  Bicara
                </span>
                <span className="text-[11px] font-mono text-[#64748B]">
                  {activeSpeaker === 'owner' ? 'User A' : 'Impostor B'}
                </span>
              </div>
              <button
                type="button"
                onClick={onToggleWallet}
                aria-label={walletConnected ? 'Putuskan wallet Solana' : 'Hubungkan wallet Solana'}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-mono transition-colors cursor-pointer whitespace-nowrap ${
                  walletConnected
                    ? 'bg-[#14171A] border border-[#262B30] text-[#E2E8F0] hover:border-[#3A414A]'
                    : 'bg-[#22C55E] text-[#052E16] font-sans font-medium hover:bg-[#16A34A]'
                }`}
              >
                <Wallet className="w-3.5 h-3.5" aria-hidden="true" />
                <span>
                  {walletConnected
                    ? truncateWallet(DEMO_SENDER_WALLET, 4, 3)
                    : 'Connect Wallet'}
                </span>
              </button>
            </div>

            {/* Accessible Spoken Narration & Haptic Cue Bar */}
            {eyesFreeMode && (
              <div
                aria-live="polite"
                data-testid="spoken-cue-bar"
                className="px-3.5 py-2 bg-[#101418] border-b border-[#1D232A] space-y-1"
              >
                <div className="flex items-center justify-between gap-2 text-[10px] font-mono">
                  <span className="text-[#4ADE80] truncate">
                    {activeHapticInfo ? `Haptic: ${activeHapticInfo.label}` : 'Eyes-Free Audio Active'}
                  </span>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => void processTranscript('Ulangi')}
                      className="inline-flex items-center gap-0.5 text-[#94A3B8] hover:text-[#F8FAFC] cursor-pointer"
                    >
                      <RotateCcw className="w-3 h-3" aria-hidden="true" />
                      <span>Ulangi</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => void processTranscript('Bantuan')}
                      className="inline-flex items-center gap-0.5 text-[#94A3B8] hover:text-[#F8FAFC] cursor-pointer"
                    >
                      <HelpCircle className="w-3 h-3" aria-hidden="true" />
                      <span>Bantuan</span>
                    </button>
                  </div>
                </div>
                <p className="text-[11px] text-[#CBD5E1] leading-snug line-clamp-2">
                  {spokenLine ?? 'Sentuh layar di mana saja lalu ucapkan perintah.'}
                </p>
              </div>
            )}

            {/* Phone Screen Body */}
            <div className="flex-1 p-4 overflow-hidden flex flex-col relative">
              {phoneTab === 'home' && (
                <div
                  onClick={(e) => {
                    if (!eyesFreeMode) return;
                    const target = e.target as HTMLElement;
                    if (target.closest('button, a, input, select, label')) return;
                    handleMicToggle();
                  }}
                  className={`flex flex-col h-full justify-between ${
                    eyesFreeMode ? 'cursor-pointer' : ''
                  }`}
                >
                  {/* Balance Display */}
                  <div className="text-center pt-1 space-y-1">
                    <div className="text-xs text-[#94A3B8]">Saldo Devnet USDC</div>
                    <div
                      data-testid="sender-balance"
                      className="text-3xl font-bold font-mono tabular-nums text-[#F8FAFC] tracking-tight"
                    >
                      {walletConnected ? `${senderBalanceUsdc.toFixed(2)} USDC` : '—.— USDC'}
                    </div>
                    <div className="text-xs font-mono tabular-nums text-[#64748B]">
                      {walletConnected
                        ? `${senderBalanceSol.toFixed(3)} SOL gas · Eagle + MWA`
                        : 'Hubungkan wallet untuk transaksi'}
                    </div>
                  </div>

                  {/* VoiceFeedback Waveform & Transcript Zone */}
                  <div className="my-2 min-h-[112px] flex flex-col items-center justify-center space-y-2.5 px-1">
                    {voiceStage === 'recording' ? (
                      <div
                        className="flex items-center justify-center gap-1.5 h-12"
                        aria-label="Recording voice waveform"
                      >
                        {WAVEFORM_HEIGHTS.map((h, i) => (
                          <motion.span
                            key={i}
                            className="w-1.5 rounded-full bg-[#EF4444]"
                            style={{ height: 40 }}
                            animate={{ scaleY: [0.25, h, 0.35] }}
                            transition={{
                              duration: 0.65,
                              repeat: Infinity,
                              delay: i * 0.05,
                              ease: 'easeInOut',
                            }}
                          />
                        ))}
                      </div>
                    ) : transcript ? (
                      <div className="w-full p-2.5 bg-[#14171A] border border-[#22272D] rounded-xl text-center space-y-1">
                        <div className="text-[10px] font-mono text-[#64748B]">
                          Transkrip scribe_v2 ·{' '}
                          {lastVoiceprintResult
                            ? lastVoiceprintResult.verified
                              ? `Voiceprint ${lastVoiceprintResult.scorePct}% ✓`
                              : `Voiceprint ${lastVoiceprintResult.scorePct}% BLOCKED`
                            : 'Menunggu'}
                        </div>
                        <p className="text-sm font-medium text-[#F8FAFC]">
                          &ldquo;{transcript}&rdquo;
                        </p>
                      </div>
                    ) : (
                      <p className="text-xs text-[#64748B] text-center max-w-[260px] leading-relaxed">
                        {eyesFreeMode
                          ? 'Mode Eyes-Free: sentuh layar di mana saja lalu ucapkan "Cek saldo", "Buka kontak", atau "Kirim 5 dolar ke Ahmad".'
                          : 'Tekan mikrofon lalu ucapkan jumlah dan nama penerima. Contoh: "Kirim 5 dolar ke Ahmad".'}
                      </p>
                    )}

                    {/* Feedback Banner (Success / Error / Info) */}
                    {statusMessage && (
                      <div
                        role={voiceStage === 'error' ? 'alert' : 'status'}
                        data-testid="phone-status-banner"
                        className={`w-full p-2.5 rounded-xl border text-xs leading-relaxed flex items-start gap-2 ${
                          voiceStage === 'success'
                            ? 'bg-[#0F1F15] border-[#22C55E]/40 text-[#86EFAC]'
                            : voiceStage === 'error'
                              ? 'bg-[#211214] border-[#EF4444]/40 text-[#FCA5A5]'
                              : 'bg-[#14171A] border-[#262B30] text-[#CBD5E1]'
                        }`}
                      >
                        {voiceStage === 'success' ? (
                          <CheckCircle2 className="w-4 h-4 text-[#22C55E] shrink-0 mt-0.5" />
                        ) : voiceStage === 'error' ? (
                          vpBlocked ? (
                            <ShieldAlert className="w-4 h-4 text-[#EF4444] shrink-0 mt-0.5" />
                          ) : (
                            <AlertCircle className="w-4 h-4 text-[#EF4444] shrink-0 mt-0.5" />
                          )
                        ) : null}
                        <div className="space-y-1.5 flex-1">
                          <p>{statusMessage}</p>
                          {missingContactName && (
                            <button
                              type="button"
                              onClick={() => {
                                setPrefillContactName(missingContactName);
                                handleSelectPhoneTab('contacts');
                              }}
                              className="text-xs font-medium text-[#22C55E] hover:underline cursor-pointer"
                            >
                              Tambah &ldquo;{missingContactName}&rdquo; ke Kontak →
                            </button>
                          )}
                          {voiceStage === 'error' && nluMode === 'ai' && !vpBlocked && (
                            <button
                              type="button"
                              onClick={() => setNluMode('fallback')}
                              className="block text-xs font-medium text-[#4ADE80] hover:underline cursor-pointer"
                            >
                              Gunakan Offline Fallback Parser
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Signature 108px MicButton */}
                  <div className="flex flex-col items-center pb-2 space-y-2.5">
                    <div className="relative flex items-center justify-center">
                      {voiceStage === 'recording' && (
                        <motion.span
                          aria-hidden="true"
                          className="absolute w-32 h-32 rounded-full border-2 border-[#EF4444]/60"
                          animate={{ scale: [0.95, 1.25], opacity: [0.7, 0] }}
                          transition={{ duration: 1.1, repeat: Infinity, ease: 'easeOut' }}
                        />
                      )}
                      <motion.button
                        type="button"
                        onClick={handleMicToggle}
                        disabled={voiceStage === 'processing' || voiceStage === 'sending'}
                        aria-label={
                          voiceStage === 'recording'
                            ? 'Berhenti merekam suara'
                            : 'Mulai bicara perintah pembayaran atau navigasi'
                        }
                        whileTap={{ scale: 0.96 }}
                        className={`w-[104px] h-[104px] rounded-full flex items-center justify-center transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4ADE80] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B0D0E] ${
                          voiceStage === 'recording'
                            ? 'bg-[#EF4444] text-white'
                            : voiceStage === 'processing' || voiceStage === 'sending'
                              ? 'bg-[#1D2228] text-[#94A3B8] border border-[#2E353E]'
                              : 'bg-[#22C55E] hover:bg-[#16A34A] text-[#052E16]'
                        }`}
                      >
                        {voiceStage === 'processing' || voiceStage === 'sending' ? (
                          <Loader2 className="w-10 h-10 animate-spin" />
                        ) : voiceStage === 'recording' ? (
                          <MicOff className="w-10 h-10" />
                        ) : (
                          <Mic className="w-10 h-10" />
                        )}
                      </motion.button>
                    </div>
                    <span className="text-xs font-medium text-[#94A3B8]">
                      {voiceStage === 'recording'
                        ? 'Bicara sekarang... (ketuk lagi untuk selesai)'
                        : voiceStage === 'processing'
                          ? 'Memverifikasi sidik suara & perintah...'
                          : voiceStage === 'sending'
                            ? 'Menandatangani via MWA Seed Vault...'
                            : eyesFreeMode
                              ? 'Sentuh layar di mana saja untuk bicara'
                              : 'Tekan dan bicara'}
                    </span>
                  </div>
                </div>
              )}

              {phoneTab === 'contacts' && (
                <PhoneContactsTab
                  contacts={contacts}
                  onAddContact={onAddContact}
                  onDeleteContact={onDeleteContact}
                  onSelectForQuickSend={(name) => {
                    void processTranscript(`Kirim 5 dolar ke ${name}`);
                  }}
                  prefillName={prefillContactName}
                  onClearPrefill={() => setPrefillContactName(null)}
                />
              )}

              {phoneTab === 'history' && <PhoneHistoryTab transactions={transactions} />}

              {/* Mandatory TransactionConfirm Bottom Sheet Overlay */}
              {pendingTransfer && (
                <motion.div
                  initial={{ opacity: 0, y: 24 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.18 }}
                  role="dialog"
                  aria-modal="true"
                  aria-label="Konfirmasi Pengiriman USDC"
                  className="absolute inset-x-0 bottom-0 z-20 bg-[#14171A] border-t border-[#2E3640] rounded-t-2xl p-4 space-y-3 shadow-2xl shadow-black"
                >
                  <div className="w-10 h-1 bg-[#2E3640] rounded-full mx-auto" aria-hidden="true" />
                  <div className="space-y-0.5">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-semibold text-[#F8FAFC]">
                        Konfirmasi Pengiriman
                      </h3>
                      <span className="text-[11px] font-mono text-[#4ADE80]">
                        TransferChecked
                      </span>
                    </div>
                    <p className="text-[11px] text-[#94A3B8]">
                      Ucapkan &ldquo;Ya&rdquo; / &ldquo;Batal&rdquo; atau ketuk tombol. Factor 1 Voiceprint ✓ · Factor 2 MWA Seed Vault.
                    </p>
                  </div>

                  <div className="bg-[#0B0D0E] border border-[#22272D] rounded-xl p-3 space-y-1.5 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-[#94A3B8]">Kepada</span>
                      <span className="font-semibold text-[#F8FAFC]">
                        {pendingTransfer.recipient.name}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[#94A3B8]">Wallet Address</span>
                      <span
                        data-testid="confirm-wallet"
                        className="font-mono text-[#E2E8F0] tabular-nums"
                      >
                        {truncateWallet(pendingTransfer.recipient.wallet, 5, 4)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[#94A3B8]">Sumber Kontak</span>
                      <span className="text-[#4ADE80]">
                        {pendingTransfer.resolutionSource === 'on_chain'
                          ? 'On-chain ContactRegistry PDA'
                          : 'Supabase Cache'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t border-[#1E2329]">
                      <span className="text-[#94A3B8]">Jumlah</span>
                      <span className="text-base font-bold font-mono tabular-nums text-[#22C55E]">
                        {pendingTransfer.intent.amount?.toFixed(2)}{' '}
                        {pendingTransfer.intent.currency ?? 'USDC'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-[#64748B] font-mono tabular-nums">
                      <span>Raw 6-decimal units</span>
                      <span>
                        {usdcToRawUnits(pendingTransfer.intent.amount ?? 0).toString()}
                      </span>
                    </div>
                  </div>

                  {!pendingTransfer.recipient.hasUsdcAta && (
                    <label className="flex items-start gap-2 p-2.5 bg-[#1F1A11] border border-[#F59E0B]/40 rounded-lg text-[11px] text-[#FDE68A] cursor-pointer">
                      <input
                        type="checkbox"
                        checked={autoCreateAta}
                        onChange={(e) => setAutoCreateAta(e.target.checked)}
                        className="mt-0.5 accent-[#F59E0B]"
                      />
                      <span>
                        {pendingTransfer.recipient.name} belum punya USDC ATA. Buat otomatis
                        (idempotent, +0.002039 SOL rent).
                      </span>
                    </label>
                  )}

                  <div className="grid grid-cols-2 gap-2.5 pt-1">
                    <button
                      type="button"
                      onClick={handleCancelTransfer}
                      disabled={voiceStage === 'sending'}
                      className="min-h-[44px] px-4 py-2 text-xs font-medium text-[#CBD5E1] bg-[#1C2127] hover:bg-[#252B33] rounded-xl transition-colors cursor-pointer"
                    >
                      Batal
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleConfirmTransfer()}
                      disabled={voiceStage === 'sending'}
                      className="min-h-[44px] px-4 py-2 text-xs font-semibold text-[#052E16] bg-[#22C55E] hover:bg-[#16A34A] rounded-xl transition-colors cursor-pointer inline-flex items-center justify-center gap-1.5"
                    >
                      {voiceStage === 'sending' ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Mengirim...</span>
                        </>
                      ) : (
                        <span>Konfirmasi</span>
                      )}
                    </button>
                  </div>
                </motion.div>
              )}

              {/* Screen Curtain Blind Demo Overlay */}
              {screenCurtain && !showOnboarding && (
                <div
                  data-testid="screen-curtain-overlay"
                  onClick={(e) => {
                    const target = e.target as HTMLElement;
                    if (target.closest('button')) return;
                    handleMicToggle();
                  }}
                  className="absolute inset-0 z-25 bg-[#050607]/96 p-5 flex flex-col justify-between cursor-pointer"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 text-xs font-mono text-[#93C5FD]">
                      <EyeOff className="w-4 h-4" aria-hidden="true" />
                      <span>Mode Layar Gelap</span>
                    </div>
                    <button
                      type="button"
                      data-testid="disable-curtain"
                      onClick={() => setScreenCurtain(false)}
                      className="px-2.5 py-1.5 text-[11px] font-medium text-[#E2E8F0] bg-[#161B22] border border-[#2D3642] hover:border-[#4B5563] rounded-lg cursor-pointer"
                    >
                      Matikan Layar Gelap
                    </button>
                  </div>

                  <div className="my-auto text-center space-y-4">
                    <div className="w-16 h-16 mx-auto rounded-full bg-[#0F1712] border border-[#22C55E]/40 flex items-center justify-center">
                      <Mic className="w-7 h-7 text-[#22C55E]" aria-hidden="true" />
                    </div>
                    <div className="space-y-1.5">
                      <p className="text-xs font-mono text-[#64748B]">
                        Tab aktif: {phoneTab} ·{' '}
                        {activeSpeaker === 'owner' ? 'User A (Pemilik)' : 'Impostor B'}
                      </p>
                      <p className="text-sm font-medium text-[#F8FAFC]">
                        Sentuh layar di mana saja lalu bicara
                      </p>
                      {activeHapticInfo && (
                        <p className="text-[11px] font-mono text-[#4ADE80]">
                          Haptic: {activeHapticInfo.label}
                        </p>
                      )}
                    </div>

                    <div className="p-3 bg-[#0E1216] border border-[#1E252E] rounded-xl text-left space-y-1">
                      <div className="text-[10px] font-mono text-[#64748B]">
                        Narasi TTS Aktif (Terbaca untuk Juri)
                      </div>
                      <p className="text-xs text-[#E2E8F0] leading-relaxed">
                        &ldquo;{spokenLine ?? 'Menunggu perintah suara...'}&rdquo;
                      </p>
                    </div>
                  </div>

                  {pendingTransfer ? (
                    <div className="grid grid-cols-2 gap-2.5">
                      <button
                        type="button"
                        onClick={() => void processTranscript('Batal')}
                        className="min-h-[44px] px-3 py-2 text-xs font-medium text-[#CBD5E1] bg-[#1B2027] rounded-xl cursor-pointer"
                      >
                        Ucapkan &ldquo;Batal&rdquo;
                      </button>
                      <button
                        type="button"
                        onClick={() => void processTranscript('Ya')}
                        className="min-h-[44px] px-3 py-2 text-xs font-semibold text-[#052E16] bg-[#22C55E] rounded-xl cursor-pointer"
                      >
                        Ucapkan &ldquo;Ya&rdquo;
                      </button>
                    </div>
                  ) : (
                    <p className="text-[11px] text-center text-[#64748B]">
                      Layar digelapkan untuk membuktikan 100% navigasi tanpa visual.
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Bottom Tab Navigation (Home / Contacts / History — Spoken on Tap) */}
            <nav
              aria-label="Navigasi Aplikasi Bicara"
              className="grid grid-cols-3 border-t border-[#1E2329] bg-[#0F1215]"
            >
              {(
                [
                  { id: 'home', label: 'Home', Icon: Mic },
                  { id: 'contacts', label: 'Contacts', Icon: Users },
                  { id: 'history', label: 'History', Icon: Clock },
                ] as const
              ).map(({ id, label, Icon }) => {
                const active = phoneTab === id;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => handleSelectPhoneTab(id)}
                    aria-current={active ? 'page' : undefined}
                    className={`min-h-[54px] flex flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors cursor-pointer ${
                      active ? 'text-[#22C55E]' : 'text-[#64748B] hover:text-[#CBD5E1]'
                    }`}
                  >
                    <Icon className="w-4 h-4" aria-hidden="true" />
                    <span>{label}</span>
                  </button>
                );
              })}
            </nav>

            {/* Full-Screen Voice-Guided Onboarding Overlay */}
            {showOnboarding && (
              <VoiceOnboardingOverlay
                walletConnected={walletConnected}
                onConnectWallet={onToggleWallet}
                onSpeak={(text, haptic) => speakOut(text, haptic)}
                onComplete={(profile) => {
                  setVoiceprintProfile(profile);
                  setActiveSpeaker('owner');
                  setShowOnboarding(false);
                  setPhoneTab('home');
                  setStatusMessage(
                    'Sidik suara User A (Azhar) aktif 100% dan terikat ke dompet Solana.'
                  );
                  speakOut(
                    'Onboarding selesai. Sidik suara kamu aktif 100 persen. Sentuh layar di mana saja untuk mulai bicara.',
                    'success'
                  );
                }}
                onClose={() => setShowOnboarding(false)}
              />
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Voice Utterance Simulator, Phone B Mirror & Live Pipeline */}
        <div className="lg:col-span-7 space-y-5">
          {/* Quick Voice Scenarios + Custom Input */}
          <div className="bg-[#14171A] border border-[#23282E] rounded-xl p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-sm font-semibold text-[#F8FAFC]">
                  Eyes-Free Voice Command Simulator
                </h2>
                <p className="text-xs text-[#94A3B8]">
                  Test spoken navigation, balance queries, voice confirmation, and Voiceprint blocking
                </p>
              </div>
              <span className="text-xs font-mono text-[#64748B]">{metrics.engineLabel}</span>
            </div>

            <div className="flex flex-wrap gap-2">
              {DEMO_UTTERANCES.map((item) => {
                const highlightConfirm = item.text === 'Ya' && Boolean(pendingTransfer);
                return (
                  <button
                    key={item.text}
                    type="button"
                    onClick={() => void processTranscript(item.text)}
                    className={`px-3 py-2 text-xs text-left rounded-lg border transition-colors cursor-pointer ${
                      highlightConfirm
                        ? 'bg-[#122618] border-[#22C55E] text-[#86EFAC]'
                        : 'bg-[#0E1114] hover:bg-[#191E24] border-[#242A31] hover:border-[#22C55E]/50'
                    }`}
                  >
                    <span className="block text-[10px] text-[#64748B]">{item.label}</span>
                    <span className={highlightConfirm ? 'text-[#86EFAC] font-semibold' : 'text-[#E2E8F0]'}>
                      &ldquo;{item.text}&rdquo;
                    </span>
                  </button>
                );
              })}
            </div>

            <form onSubmit={handleCustomSubmit} className="flex items-center gap-2">
              <label htmlFor="custom-voice-input" className="sr-only">
                Ketik simulasi suara
              </label>
              <input
                id="custom-voice-input"
                type="text"
                value={customCommand}
                onChange={(e) => setCustomCommand(e.target.value)}
                placeholder='Coba: "buka kontak", "cek saldo", "kembali ke beranda", atau "kirim 2.5 dolar ke Siti"'
                className="flex-1 px-3.5 py-2.5 text-xs bg-[#0B0D0E] border border-[#262B30] rounded-lg text-[#F8FAFC] placeholder:text-[#64748B] focus:outline-none focus:border-[#22C55E]"
              />
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium text-[#052E16] bg-[#22C55E] hover:bg-[#16A34A] rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Simulasikan</span>
              </button>
            </form>
          </div>

          {/* Two-Phone Demo Mirror (Phone B — Recipient Wallet) */}
          <div className="bg-[#14171A] border border-[#23282E] rounded-xl p-5 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-[#22C55E]" aria-hidden="true" />
                <h2 className="text-sm font-semibold text-[#F8FAFC]">
                  Phone B: Recipient Wallet Mirror (Two-Phone Demo View)
                </h2>
              </div>
              <label className="inline-flex items-center gap-2 text-xs text-[#94A3B8]">
                <span>Monitor:</span>
                <select
                  aria-label="Pilih wallet penerima untuk Phone B"
                  value={mirrorContact?.id ?? ''}
                  onChange={(e) => setMirrorContactId(e.target.value)}
                  className="bg-[#0B0D0E] border border-[#262B30] rounded-md px-2.5 py-1 text-xs text-[#F8FAFC] focus:outline-none focus:border-[#22C55E]"
                >
                  {contacts.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            {mirrorContact && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
                <div className="p-3 bg-[#0E1114] border border-[#22272D] rounded-lg">
                  <div className="text-[11px] text-[#64748B]">Recipient</div>
                  <div className="mt-0.5 text-sm font-semibold text-[#F8FAFC]">
                    {mirrorContact.name}
                  </div>
                  <div className="font-mono text-[11px] text-[#94A3B8]">
                    {truncateWallet(mirrorContact.wallet, 5, 4)}
                  </div>
                </div>
                <div className="p-3 bg-[#0E1114] border border-[#22272D] rounded-lg">
                  <div className="text-[11px] text-[#64748B]">Devnet USDC Balance</div>
                  <div
                    data-testid="recipient-balance"
                    className="mt-0.5 text-lg font-bold font-mono tabular-nums text-[#F8FAFC]"
                  >
                    {mirrorContact.balanceUsdc.toFixed(2)} USDC
                  </div>
                  {lastDeltaContactId === mirrorContact.id && lastDeltaAmount > 0 && (
                    <div className="text-[11px] font-mono tabular-nums text-[#22C55E]">
                      +{lastDeltaAmount.toFixed(2)} USDC received
                    </div>
                  )}
                </div>
                <div className="p-3 bg-[#0E1114] border border-[#22272D] rounded-lg">
                  <div className="text-[11px] text-[#64748B]">On-Chain Status</div>
                  <div className="mt-0.5 text-xs font-medium text-[#E2E8F0]">
                    {mirrorContact.onChain ? 'Registered in ContactRegistry' : 'Supabase Only'}
                  </div>
                  <div className="font-mono text-[11px] text-[#64748B]">
                    {mirrorContact.hasUsdcAta ? 'USDC ATA Ready' : 'ATA Init Needed'}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Live Architecture Pipeline Inspector */}
          <div className="bg-[#14171A] border border-[#23282E] rounded-xl p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[#1E2329]">
              <div>
                <h2 className="text-sm font-semibold text-[#F8FAFC]">
                  Live Pipeline &amp; Payload Inspector
                </h2>
                <p className="text-xs text-[#94A3B8]">
                  Stage 00 Voiceprint Gate → STT → Unified NLU → Contact PDA → MWA Seed Vault
                </p>
              </div>
              <div className="text-right font-mono text-xs tabular-nums">
                <span className="text-[#64748B]">Est. E2E: </span>
                <span className="text-[#22C55E] font-semibold">
                  {totalLatencyMs > 0 ? `${(totalLatencyMs / 1000).toFixed(2)}s` : '—'}
                </span>
                <span className="text-[#64748B]"> / 7.0s budget</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {pipelineSteps.map((step) => (
                <div
                  key={step.num}
                  data-testid={`pipeline-step-${step.num}`}
                  className={`p-3 rounded-lg border transition-colors ${
                    step.blocked
                      ? 'bg-[#211214] border-[#EF4444]/60'
                      : step.active
                        ? 'bg-[#17231B] border-[#22C55E]/60'
                        : step.done
                          ? 'bg-[#0E1114] border-[#22C55E]/30'
                          : 'bg-[#0E1114] border-[#1F242B]'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-[#F8FAFC]">
                      <span className="font-mono text-[#64748B] mr-1.5">{step.num}.</span>
                      {step.title}
                    </span>
                    {step.blocked ? (
                      <ShieldAlert className="w-3.5 h-3.5 text-[#EF4444] shrink-0" aria-hidden="true" />
                    ) : step.done ? (
                      <ShieldCheck className="w-3.5 h-3.5 text-[#22C55E] shrink-0" aria-hidden="true" />
                    ) : null}
                  </div>
                  <p
                    className={`mt-1 text-[11px] font-mono truncate ${
                      step.blocked ? 'text-[#FCA5A5]' : 'text-[#94A3B8]'
                    }`}
                  >
                    {step.detail}
                  </p>
                </div>
              ))}
            </div>

            {/* Structured Payloads Side-by-Side */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
              <div className="space-y-1.5">
                <div className="text-[11px] font-medium text-[#94A3B8]">
                  Parsed Unified Intent JSON
                </div>
                <pre className="bg-[#0B0D0E] border border-[#22272D] rounded-lg p-3 text-[11px] font-mono text-[#86EFAC] overflow-x-auto min-h-[132px]">
                  <code>
                    {parsedIntent
                      ? JSON.stringify(parsedIntent, null, 2)
                      : '{\n  "action": "idle",\n  "hint": "Run a voice nav or payment utterance"\n}'}
                  </code>
                </pre>
              </div>

              <div className="space-y-1.5">
                <div className="text-[11px] font-medium text-[#94A3B8]">
                  Voiceprint Gate, Haptics &amp; Solana Instruction
                </div>
                <pre className="bg-[#0B0D0E] border border-[#22272D] rounded-lg p-3 text-[11px] font-mono text-[#E2E8F0] overflow-x-auto min-h-[132px]">
                  <code>
                    {lastInstruction
                      ? JSON.stringify(
                          {
                            voiceprint: lastVoiceprintResult
                              ? `${lastVoiceprintResult.speakerLabel} (${lastVoiceprintResult.scorePct}%)`
                              : voiceprintProfile.ownerLabel,
                            haptic: activeHapticInfo?.pattern ?? null,
                            instruction: lastInstruction.program,
                            mint: truncateWallet(USDC_MINT_DEVNET, 6, 4),
                            amountRaw: `${lastInstruction.rawAmount}n`,
                            feeSol: lastInstruction.estimatedFeeSol,
                          },
                          null,
                          2
                        )
                      : JSON.stringify(
                          {
                            voiceprint: lastVoiceprintResult
                              ? {
                                  verified: lastVoiceprintResult.verified,
                                  scorePct: lastVoiceprintResult.scorePct,
                                  thresholdPct: Math.round(lastVoiceprintResult.threshold * 100),
                                  speaker: lastVoiceprintResult.speakerLabel,
                                }
                              : {
                                  enrolled: voiceprintProfile.enrolled,
                                  owner: voiceprintProfile.ownerLabel,
                                  activeSpeaker,
                                },
                            haptic: activeHapticInfo?.pattern ?? null,
                            keyterms_count: scribeKeyterms.length,
                            tts_model: 'eleven_flash_v2_5 (~100ms)',
                          },
                          null,
                          2
                        )}
                  </code>
                </pre>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
