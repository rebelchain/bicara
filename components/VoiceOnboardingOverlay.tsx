'use client';

import { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import {
  Volume2,
  Wallet,
  Mic,
  CheckCircle2,
  X,
  RotateCcw,
  Fingerprint,
} from 'lucide-react';
import {
  DEMO_SENDER_WALLET,
  HAPTIC_DESCRIPTIONS,
  ONBOARDING_STEPS,
  truncateWallet,
  type HapticPatternId,
  type VoiceprintProfile,
} from '@/lib/bicara-engine';

interface VoiceOnboardingOverlayProps {
  walletConnected: boolean;
  onConnectWallet: () => void;
  onSpeak: (text: string, haptic: HapticPatternId) => void;
  onComplete: (profile: VoiceprintProfile) => void;
  onClose: () => void;
}

export default function VoiceOnboardingOverlay({
  walletConnected,
  onConnectWallet,
  onSpeak,
  onComplete,
  onClose,
}: VoiceOnboardingOverlayProps) {
  const [stepIdx, setStepIdx] = useState(0);
  const [capturing, setCapturing] = useState(false);
  const lastSpokenStepRef = useRef<number>(-1);

  const step = ONBOARDING_STEPS[stepIdx];
  const hapticMeta = HAPTIC_DESCRIPTIONS[step.haptic];

  useEffect(() => {
    if (lastSpokenStepRef.current !== stepIdx) {
      lastSpokenStepRef.current = stepIdx;
      onSpeak(step.spokenInstruction, step.haptic);
    }
  }, [stepIdx, step.spokenInstruction, step.haptic, onSpeak]);

  const handleAdvance = () => {
    if (capturing) return;

    if (step.id === 'wallet' && !walletConnected) {
      onConnectWallet();
    }

    if (step.id === 'phrase_1' || step.id === 'phrase_2' || step.id === 'phrase_3') {
      setCapturing(true);
      onSpeak(`Merekam contoh suara: ${step.promptPhrase}`, 'listen');
      window.setTimeout(() => {
        setCapturing(false);
        setStepIdx((prev) => Math.min(prev + 1, ONBOARDING_STEPS.length - 1));
      }, 520);
      return;
    }

    if (step.id === 'complete') {
      onComplete({
        ownerLabel: 'User A (Azhar)',
        boundWallet: DEMO_SENDER_WALLET,
        enrolled: true,
        enrollmentStepsDone: 3,
        threshold: 0.75,
      });
      return;
    }

    setStepIdx((prev) => Math.min(prev + 1, ONBOARDING_STEPS.length - 1));
  };

  const isPhraseStep =
    step.id === 'phrase_1' || step.id === 'phrase_2' || step.id === 'phrase_3';

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18 }}
      role="dialog"
      aria-modal="true"
      aria-label="Panduan Onboarding Suara Bicara"
      data-testid="voice-onboarding-overlay"
      className="absolute inset-0 z-30 bg-[#0B0D0E] flex flex-col justify-between p-4"
    >
      {/* Top Header & Progress */}
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-xs text-[#94A3B8]">
            <Fingerprint className="w-4 h-4 text-[#22C55E]" aria-hidden="true" />
            <span className="font-mono tabular-nums">
              Langkah {stepIdx + 1}/{ONBOARDING_STEPS.length} · {step.progressPct}%
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup onboarding suara"
            className="min-h-[36px] min-w-[36px] inline-flex items-center justify-center rounded-lg text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#171B20] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Enrollment Progress Bar */}
        <div className="h-1.5 w-full bg-[#1A1F25] rounded-full overflow-hidden">
          <div
            className="h-full bg-[#22C55E] transition-transform duration-300 origin-left"
            style={{ transform: `scaleX(${Math.max(step.progressPct, 6) / 100})` }}
          />
        </div>
      </div>

      {/* Main Spoken Guidance Content */}
      <div className="my-auto py-4 space-y-4">
        <div className="space-y-1.5">
          <p className="text-[11px] font-mono text-[#4ADE80]">
            Voice-Guided Onboarding · Picovoice Eagle
          </p>
          <h3 className="text-lg font-bold text-[#F8FAFC] tracking-tight">
            {step.title}
          </h3>
        </div>

        {/* Spoken Instruction Card */}
        <div
          aria-live="polite"
          className="p-3.5 bg-[#14171A] border border-[#262C34] rounded-xl space-y-2.5"
        >
          <div className="flex items-center justify-between gap-2 text-[11px] text-[#94A3B8]">
            <span className="inline-flex items-center gap-1.5">
              <Volume2 className="w-3.5 h-3.5 text-[#22C55E]" aria-hidden="true" />
              <span>Dibacakan Otomatis</span>
            </span>
            <button
              type="button"
              onClick={() => onSpeak(step.spokenInstruction, step.haptic)}
              className="inline-flex items-center gap-1 text-[#4ADE80] hover:underline cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Ulangi</span>
            </button>
          </div>
          <p className="text-xs text-[#E2E8F0] leading-relaxed">
            &ldquo;{step.spokenInstruction}&rdquo;
          </p>
          <div className="pt-2 border-t border-[#1F252C] flex items-center justify-between text-[11px] font-mono text-[#64748B]">
            <span>Haptic: {hapticMeta.label}</span>
          </div>
        </div>

        {/* Step-specific Interactive Panel */}
        {step.id === 'wallet' && (
          <div className="p-3 bg-[#101418] border border-[#232A32] rounded-xl flex items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2 min-w-0">
              <Wallet className="w-4 h-4 text-[#22C55E] shrink-0" aria-hidden="true" />
              <div className="min-w-0">
                <div className="text-[#F8FAFC] font-medium">
                  {walletConnected ? 'Dompet Terhubung' : 'Siap Hubungkan MWA'}
                </div>
                <div className="font-mono text-[11px] text-[#64748B] truncate">
                  {walletConnected
                    ? `${truncateWallet(DEMO_SENDER_WALLET, 5, 4)} · Seed Vault`
                    : 'solana:devnet · Mobile Wallet Adapter'}
                </div>
              </div>
            </div>
            {walletConnected && (
              <CheckCircle2 className="w-4 h-4 text-[#22C55E] shrink-0" aria-hidden="true" />
            )}
          </div>
        )}

        {isPhraseStep && step.promptPhrase && (
          <button
            type="button"
            onClick={handleAdvance}
            disabled={capturing}
            className="w-full text-left p-4 bg-[#101A14] border border-[#22C55E]/40 hover:border-[#22C55E] rounded-xl space-y-2 transition-colors cursor-pointer"
          >
            <div className="flex items-center justify-between text-[11px] font-mono text-[#4ADE80]">
              <span>{capturing ? 'Merekam 16kHz PCM...' : 'Ketuk & Ucapkan Frasa Ini'}</span>
              <Mic className="w-4 h-4" aria-hidden="true" />
            </div>
            <p className="text-sm font-semibold text-[#F8FAFC]">
              &ldquo;{step.promptPhrase}&rdquo;
            </p>
          </button>
        )}

        {step.id === 'complete' && (
          <div className="p-3.5 bg-[#0F1F15] border border-[#22C55E]/40 rounded-xl space-y-1.5 text-xs">
            <div className="flex items-center gap-2 font-semibold text-[#86EFAC]">
              <CheckCircle2 className="w-4 h-4 text-[#22C55E]" aria-hidden="true" />
              <span>Voiceprint Terikat ke Dompet</span>
            </div>
            <p className="font-mono text-[11px] text-[#94A3B8]">
              User A (Azhar) · {truncateWallet(DEMO_SENDER_WALLET, 5, 4)} · Threshold 75%
            </p>
            <p className="text-[11px] text-[#CBD5E1]">
              Factor 1: On-Device Eagle Voiceprint · Factor 2: MWA Seed Vault Biometric
            </p>
          </div>
        )}
      </div>

      {/* Bottom Accessible Action Bar */}
      <div className="space-y-2">
        <button
          type="button"
          onClick={handleAdvance}
          disabled={capturing}
          data-testid="onboarding-next-btn"
          className="w-full min-h-[48px] px-4 py-3 text-sm font-semibold text-[#052E16] bg-[#22C55E] hover:bg-[#16A34A] disabled:opacity-60 rounded-xl transition-colors cursor-pointer"
        >
          {capturing
            ? 'Memverifikasi Sampel Suara...'
            : step.id === 'welcome'
              ? 'Mulai Panduan Suara'
              : step.id === 'wallet'
                ? walletConnected
                  ? 'Lanjut Daftar Sidik Suara'
                  : 'Hubungkan Dompet & Lanjut'
                : isPhraseStep
                  ? `Ucapkan Frasa (${step.progressPct}%)`
                  : 'Selesai & Mulai Bicara'}
        </button>
      </div>
    </motion.div>
  );
}
