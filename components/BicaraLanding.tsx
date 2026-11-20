'use client';

import { useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  Calculator,
  CheckCircle2,
  Code2,
  Eye,
  Fingerprint,
  Lock,
  Mic,
  PlayCircle,
  ShieldCheck,
  Smartphone,
  Users,
  Volume2,
  XCircle,
  Zap,
} from 'lucide-react';

interface BicaraLandingProps {
  onOpenDemo: () => void;
  onOpenDevelopers: (tab?: 'architecture' | 'buildkit' | 'docs') => void;
}

const SAMPLE_READOUT =
  'You are about to send 5 USDC to Ahmad, a saved contact. The network fee is under one cent. Say yes to continue, or cancel to stop.';

export default function BicaraLanding({
  onOpenDemo,
  onOpenDevelopers,
}: BicaraLandingProps) {
  const [speakingSample, setSpeakingSample] = useState(false);

  const handleHearSample = () => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      return;
    }
    try {
      window.speechSynthesis.cancel();
      if (speakingSample) {
        setSpeakingSample(false);
        return;
      }
      const utterance = new SpeechSynthesisUtterance(SAMPLE_READOUT);
      utterance.lang = 'en-US';
      utterance.rate = 0.98;
      utterance.onend = () => setSpeakingSample(false);
      utterance.onerror = () => setSpeakingSample(false);
      setSpeakingSample(true);
      window.speechSynthesis.speak(utterance);
    } catch {
      setSpeakingSample(false);
    }
  };

  return (
    <div className="space-y-24 pb-16">
      {/* 1. HERO SECTION — Consumer-Friendly, Clean Split */}
      <section aria-label="Bicara Overview" className="pt-6 sm:pt-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* Left Narrative */}
          <div className="lg:col-span-6 space-y-7">
            <p className="text-sm font-medium text-[#CCFF00]">
              Live on Solana Devnet · Built blind-first for everyone
            </p>

            <h1 className="font-display font-extrabold tracking-tight text-[#F4F4F5] text-[clamp(2.8rem,5.4vw,4.5rem)] leading-[1.05] [text-wrap:balance]">
              Speak Before{' '}
              <span className="text-[#CCFF00]">You Sign</span>
            </h1>

            <p className="text-base sm:text-lg text-[#A1A1AA] leading-relaxed max-w-xl">
              Before you approve any transaction on Solana, Bicara reads aloud exactly what will
              happen — who gets paid, how much, and every fee. Never blind-sign again.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 pt-1">
              <button
                type="button"
                onClick={onOpenDemo}
                className="inline-flex items-center justify-center gap-2.5 px-7 py-4 bg-[#CCFF00] hover:bg-[#B3E600] text-[#0F0F0F] font-bold text-base rounded-2xl transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <PlayCircle className="w-5 h-5" aria-hidden="true" />
                <span>Try Interactive Demo</span>
              </button>

              <button
                type="button"
                onClick={() => onOpenDevelopers('buildkit')}
                className="inline-flex items-center justify-center gap-2.5 px-7 py-4 bg-[#1A1A1A] hover:bg-[#242424] text-[#F4F4F5] font-semibold text-base rounded-2xl border border-white/10 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Smartphone className="w-5 h-5 text-[#CCFF00]" aria-hidden="true" />
                <span>Get for Solana Mobile</span>
              </button>
            </div>
          </div>

          {/* Right Focal Visual — Conversational Spoken Verification Preview */}
          <div className="lg:col-span-6 relative">
            <div
              className="absolute -inset-4 bg-[#CCFF00]/10 rounded-[3rem] blur-3xl pointer-events-none"
              aria-hidden="true"
            />

            <div className="relative bg-[#1A1A1A] border border-white/10 rounded-[2.5rem] p-5 sm:p-6 shadow-2xl overflow-hidden">
              <div
                className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#CCFF00] via-[#3B82F6] to-[#A855F7]"
                aria-hidden="true"
              />

              <div className="bg-[#0F0F0F] rounded-[1.75rem] p-6 border border-white/5 space-y-6">
                {/* Preview Header */}
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3.5">
                    <div className="w-12 h-12 rounded-full bg-[#CCFF00]/15 border border-[#CCFF00]/40 flex items-center justify-center shrink-0">
                      <Mic className="w-5 h-5 text-[#CCFF00]" aria-hidden="true" />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-[#A1A1AA]">You said</p>
                      <p className="font-display font-bold text-lg text-[#F4F4F5]">
                        &ldquo;Send 5 USDC to Ahmad&rdquo;
                      </p>
                    </div>
                  </div>
                </div>

                {/* Spoken Readout Bubble */}
                <div className="p-5 rounded-2xl bg-[#1A1A1A] border border-[#CCFF00]/20 space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#CCFF00]">
                      <Volume2 className="w-4 h-4" aria-hidden="true" />
                      <span>Bicara speaks aloud</span>
                    </span>
                    <button
                      type="button"
                      onClick={handleHearSample}
                      className="text-xs font-semibold text-[#F4F4F5] hover:text-[#CCFF00] transition-colors whitespace-nowrap cursor-pointer"
                    >
                      {speakingSample ? 'Stop audio' : 'Hear sample'}
                    </button>
                  </div>
                  <p className="text-sm sm:text-[15px] text-[#D4D4D8] leading-relaxed">
                    &ldquo;You are about to send{' '}
                    <strong className="text-[#F4F4F5] font-semibold">5 USDC</strong> to{' '}
                    <strong className="text-[#F4F4F5] font-semibold">Ahmad</strong>, a saved
                    contact. The network fee is under one cent. Say yes to continue, or cancel to
                    stop.&rdquo;
                  </p>
                </div>

                {/* Hardware Confirmation Cue */}
                <div className="flex flex-col items-center justify-center pt-2 pb-1 gap-3">
                  <button
                    type="button"
                    onClick={onOpenDemo}
                    aria-label="Open interactive voice demo"
                    className="w-20 h-20 rounded-full bg-[#CCFF00] hover:bg-[#B3E600] text-[#0F0F0F] flex items-center justify-center shadow-[0_0_28px_rgba(204,255,0,0.32)] transition-transform active:scale-95 cursor-pointer"
                  >
                    <Fingerprint className="w-9 h-9" aria-hidden="true" />
                  </button>
                  <p className="text-xs text-[#A1A1AA]">
                    Final approval always stays in your phone&apos;s wallet
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. HOW IT WORKS — "As simple as speaking" */}
      <section
        id="how-it-works"
        aria-label="How Bicara works"
        className="py-16 sm:py-20 px-6 sm:px-10 bg-[#1A1A1A] rounded-[2.5rem] border border-white/[0.06] scroll-mt-24"
      >
        <div className="text-center max-w-2xl mx-auto mb-14 space-y-3">
          <p className="text-sm font-medium text-[#CCFF00]">How it works</p>
          <h2 className="font-display font-bold text-3xl sm:text-5xl tracking-tight text-[#F4F4F5] [text-wrap:balance]">
            As simple as speaking
          </h2>
          <p className="text-base sm:text-lg text-[#A1A1AA] leading-relaxed">
            No more squinting at confusing crypto screens. Bicara turns every transaction into
            clear, spoken English.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Step 1 */}
          <div className="p-8 rounded-[2rem] bg-[#0F0F0F] border border-white/[0.06] flex flex-col justify-between gap-6">
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-[#3B82F6]/15 text-[#3B82F6] font-display font-bold text-xl flex items-center justify-center">
                1
              </div>
              <h3 className="font-display text-2xl font-bold text-[#F4F4F5]">Say it</h3>
              <p className="text-sm sm:text-base text-[#A1A1AA] leading-relaxed">
                &ldquo;Send 5 USDC to Ahmad&rdquo; or &ldquo;Swap 10 USDC for SOL.&rdquo; Just
                speak in everyday words — no menus to hunt through.
              </p>
            </div>
            <div className="p-4 rounded-2xl bg-[#1A1A1A] border border-white/[0.06] flex items-center gap-3">
              <Mic className="w-5 h-5 text-[#3B82F6] shrink-0" aria-hidden="true" />
              <span className="text-sm text-[#D4D4D8]">&ldquo;Send 5 USDC to Ahmad&rdquo;</span>
            </div>
          </div>

          {/* Step 2 — Highlighted */}
          <div className="p-8 rounded-[2rem] bg-[#0F0F0F] border border-[#CCFF00]/35 flex flex-col justify-between gap-6">
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-[#CCFF00]/15 text-[#CCFF00] font-display font-bold text-xl flex items-center justify-center">
                2
              </div>
              <h3 className="font-display text-2xl font-bold text-[#F4F4F5]">Hear it</h3>
              <p className="text-sm sm:text-base text-[#A1A1AA] leading-relaxed">
                Bicara reads back exactly who receives your money, the total amount, and every fee
                out loud before anything is approved.
              </p>
            </div>
            <div className="p-4 rounded-2xl bg-[#CCFF00]/10 border border-[#CCFF00]/25 flex items-center gap-3">
              <Volume2 className="w-5 h-5 text-[#CCFF00] shrink-0" aria-hidden="true" />
              <span className="text-sm text-[#CCFF00] font-medium">
                &ldquo;You are about to send 5 USDC...&rdquo;
              </span>
            </div>
          </div>

          {/* Step 3 */}
          <div className="p-8 rounded-[2rem] bg-[#0F0F0F] border border-white/[0.06] flex flex-col justify-between gap-6">
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-[#A855F7]/15 text-[#A855F7] font-display font-bold text-xl flex items-center justify-center">
                3
              </div>
              <h3 className="font-display text-2xl font-bold text-[#F4F4F5]">Approve it</h3>
              <p className="text-sm sm:text-base text-[#A1A1AA] leading-relaxed">
                Confirm with your voice check, then sign securely with your phone&apos;s own
                fingerprint or Face ID wallet screen.
              </p>
            </div>
            <div className="p-4 rounded-2xl bg-[#1A1A1A] border border-white/[0.06] flex items-center gap-3">
              <Fingerprint className="w-5 h-5 text-[#A855F7] shrink-0" aria-hidden="true" />
              <span className="text-sm text-[#D4D4D8]">Protected by hardware biometrics</span>
            </div>
          </div>
        </div>
      </section>

      {/* 3. FEATURES — "More than just voice" */}
      <section id="features" aria-label="Core Features" className="space-y-12 scroll-mt-24">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="max-w-2xl space-y-3">
            <p className="text-sm font-medium text-[#CCFF00]">Features</p>
            <h2 className="font-display font-bold text-3xl sm:text-5xl tracking-tight text-[#F4F4F5] [text-wrap:balance]">
              More than just voice
            </h2>
            <p className="text-base sm:text-lg text-[#A1A1AA] leading-relaxed">
              Built blind-first, which means we removed every confusing visual element of crypto.
              Security through clarity.
            </p>
          </div>
          <button
            type="button"
            onClick={onOpenDemo}
            className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-[#1A1A1A] border border-white/10 hover:border-[#CCFF00] text-sm font-semibold text-[#F4F4F5] hover:text-[#CCFF00] transition-colors whitespace-nowrap shrink-0 self-start md:self-auto cursor-pointer"
          >
            <span>Experience it live</span>
            <ArrowRight className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-[#1A1A1A] border border-[#CCFF00]/20 hover:border-[#CCFF00]/60 transition-colors rounded-[2rem] p-8 flex flex-col sm:flex-row gap-6 items-start">
            <div className="w-14 h-14 rounded-2xl bg-[#0F0F0F] border border-[#CCFF00]/30 flex items-center justify-center shrink-0">
              <Eye className="w-7 h-7 text-[#CCFF00]" aria-hidden="true" />
            </div>
            <div className="space-y-2">
              <h3 className="font-display text-xl font-bold text-[#F4F4F5]">
                Accessibility-First
              </h3>
              <p className="text-sm sm:text-base text-[#A1A1AA] leading-relaxed">
                Designed from day one for blind and low-vision users. Tap anywhere to speak, with
                clear audio and gentle vibrations guiding every step.
              </p>
            </div>
          </div>

          <div className="bg-[#1A1A1A] border border-[#CCFF00]/20 hover:border-[#CCFF00]/60 transition-colors rounded-[2rem] p-8 flex flex-col sm:flex-row gap-6 items-start">
            <div className="w-14 h-14 rounded-2xl bg-[#0F0F0F] border border-[#CCFF00]/30 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-7 h-7 text-[#CCFF00]" aria-hidden="true" />
            </div>
            <div className="space-y-2">
              <h3 className="font-display text-xl font-bold text-[#F4F4F5]">
                Stop Blind Signing
              </h3>
              <p className="text-sm sm:text-base text-[#A1A1AA] leading-relaxed">
                Turns unreadable approval popups into plain spoken English, catching suspicious
                transfers and fake tokens before you confirm.
              </p>
            </div>
          </div>

          <div className="bg-[#1A1A1A] border border-[#CCFF00]/20 hover:border-[#CCFF00]/60 transition-colors rounded-[2rem] p-8 flex flex-col sm:flex-row gap-6 items-start">
            <div className="w-14 h-14 rounded-2xl bg-[#0F0F0F] border border-[#CCFF00]/30 flex items-center justify-center shrink-0">
              <Users className="w-7 h-7 text-[#CCFF00]" aria-hidden="true" />
            </div>
            <div className="space-y-2">
              <h3 className="font-display text-xl font-bold text-[#F4F4F5]">Saved Contacts</h3>
              <p className="text-sm sm:text-base text-[#A1A1AA] leading-relaxed">
                Stop verifying 44-character wallet codes. Send money to verified names you know and
                trust, with manual protection against address tampering.
              </p>
            </div>
          </div>

          <div className="bg-[#1A1A1A] border border-[#CCFF00]/20 hover:border-[#CCFF00]/60 transition-colors rounded-[2rem] p-8 flex flex-col sm:flex-row gap-6 items-start">
            <div className="w-14 h-14 rounded-2xl bg-[#0F0F0F] border border-[#CCFF00]/30 flex items-center justify-center shrink-0">
              <Calculator className="w-7 h-7 text-[#CCFF00]" aria-hidden="true" />
            </div>
            <div className="space-y-2">
              <h3 className="font-display text-xl font-bold text-[#F4F4F5]">
                Upfront Fees &amp; Rates
              </h3>
              <p className="text-sm sm:text-base text-[#A1A1AA] leading-relaxed">
                Hear exact network fees, one-time account setup costs, and swap rates upfront so
                there are zero surprises after you confirm.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 4. SECURITY DEEP DIVE — "The $516.8M Problem" */}
      <section id="security" aria-label="Why spoken verification matters" className="scroll-mt-24">
        <div className="bg-[#1A1A1A] border border-[#CCFF00]/25 rounded-[2.5rem] p-8 sm:p-14 relative overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center relative z-10">
            <div className="lg:col-span-6 space-y-6">
              <p className="inline-flex items-center gap-2 text-sm font-semibold text-[#CCFF00]">
                <AlertTriangle className="w-4 h-4" aria-hidden="true" />
                <span>The $516.8M Blind-Signing Problem</span>
              </p>

              <h2 className="font-display font-bold text-3xl sm:text-5xl tracking-tight text-[#F4F4F5] leading-[1.08] [text-wrap:balance]">
                Blind-first means safer for everyone.
              </h2>

              <div className="space-y-4 text-base text-[#D4D4D8] leading-relaxed">
                <p>
                  Blind signing isn&apos;t only an accessibility barrier — it&apos;s one of
                  crypto&apos;s costliest traps. In 2022 alone, approval phishing stole{' '}
                  <strong className="text-[#F4F4F5] font-semibold">$516.8 million</strong> from
                  everyday self-custodial wallets (Chainalysis).
                </p>
                <p className="text-[#A1A1AA]">
                  Tiny visual popups fail sighted users and exclude blind users altogether. Hearing
                  what a transaction will do in plain speech gives everyone a clear moment to stop
                  before money leaves their wallet.
                </p>
              </div>
            </div>

            <div className="lg:col-span-6 grid grid-cols-1 sm:grid-cols-2 gap-5">
              {/* Standard Wallet */}
              <div className="bg-[#0F0F0F] p-6 rounded-[1.75rem] border border-white/[0.08] space-y-4">
                <XCircle className="w-7 h-7 text-[#EF4444]" aria-hidden="true" />
                <h3 className="font-display text-lg font-bold text-[#F4F4F5]">Standard Wallet</h3>
                <p className="text-sm text-[#A1A1AA] leading-relaxed">
                  &ldquo;Approve transaction? Program: 3mN3...9xKp&rdquo;
                </p>
                <p className="text-xs font-medium text-[#FCA5A5] pt-2 border-t border-white/[0.06]">
                  User blindly taps approve — funds drained.
                </p>
              </div>

              {/* With Bicara */}
              <div className="bg-[#0F0F0F] p-6 rounded-[1.75rem] border border-[#CCFF00]/35 space-y-4">
                <CheckCircle2 className="w-7 h-7 text-[#CCFF00]" aria-hidden="true" />
                <h3 className="font-display text-lg font-bold text-[#F4F4F5]">With Bicara</h3>
                <p className="text-sm text-[#D4D4D8] leading-relaxed">
                  &ldquo;Warning: This transfer sends to an unknown address. Say cancel to
                  stop.&rdquo;
                </p>
                <p className="text-xs font-medium text-[#CCFF00] pt-2 border-t border-white/[0.06]">
                  User says &ldquo;Cancel&rdquo; — funds stay safe.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. HUMAN-FRIENDLY SAFETY HIGHLIGHTS (Replaces Fake 5-Star Testimonials) */}
      <section aria-label="Built for peace of mind" className="space-y-12">
        <div className="text-center max-w-2xl mx-auto space-y-3">
          <p className="text-sm font-medium text-[#CCFF00]">Built for peace of mind</p>
          <h2 className="font-display font-bold text-3xl sm:text-5xl tracking-tight text-[#F4F4F5] [text-wrap:balance]">
            Simple rules that keep you in control
          </h2>
          <p className="text-base sm:text-lg text-[#A1A1AA]">
            No hype, no confusing promises — just three clear protections built into every tap and
            word.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-[#1A1A1A] p-8 rounded-[2rem] border border-white/[0.06] space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-[#0F0F0F] border border-[#CCFF00]/25 flex items-center justify-center">
              <Lock className="w-5 h-5 text-[#CCFF00]" aria-hidden="true" />
            </div>
            <h3 className="font-display text-xl font-bold text-[#F4F4F5]">
              Your keys stay in your wallet
            </h3>
            <p className="text-sm sm:text-base text-[#A1A1AA] leading-relaxed">
              Voice starts the conversation, never custody. Your funds remain inside your own
              Solana wallet, and every payment still requires your personal fingerprint approval.
            </p>
          </div>

          <div className="bg-[#1A1A1A] p-8 rounded-[2rem] border border-[#CCFF00]/25 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-[#0F0F0F] border border-[#CCFF00]/25 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-[#CCFF00]" aria-hidden="true" />
            </div>
            <h3 className="font-display text-xl font-bold text-[#F4F4F5]">
              Scams blocked before you sign
            </h3>
            <p className="text-sm sm:text-base text-[#A1A1AA] leading-relaxed">
              Voice can never send to an unverified contact or swap into an unknown scam token.
              Risky requests are stopped automatically with a clear spoken alert.
            </p>
          </div>

          <div className="bg-[#1A1A1A] p-8 rounded-[2rem] border border-white/[0.06] space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-[#0F0F0F] border border-[#CCFF00]/25 flex items-center justify-center">
              <Zap className="w-5 h-5 text-[#CCFF00]" aria-hidden="true" />
            </div>
            <h3 className="font-display text-xl font-bold text-[#F4F4F5]">
              Clear answers in under a second
            </h3>
            <p className="text-sm sm:text-base text-[#A1A1AA] leading-relaxed">
              Tested on real Android hardware so spoken readouts feel calm, immediate, and natural
              whether you are checking a balance or confirming a transfer.
            </p>
          </div>
        </div>
      </section>

      {/* 6. CLOSING CTA BLOCK */}
      <section aria-label="Get started with Bicara">
        <div className="bg-[#1A1A1A] border border-white/[0.08] rounded-[2.5rem] px-6 py-14 sm:p-16 text-center space-y-6">
          <h2 className="font-display font-extrabold text-3xl sm:text-5xl tracking-tight text-[#F4F4F5] [text-wrap:balance]">
            Ready to hear what you sign?
          </h2>
          <p className="text-base sm:text-lg text-[#A1A1AA] max-w-xl mx-auto">
            Try the interactive voice walkthrough in your browser, or explore the open-source
            mobile app and architecture built for Solana.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4 pt-2">
            <button
              type="button"
              onClick={onOpenDemo}
              className="inline-flex items-center justify-center gap-2.5 px-8 py-4 bg-[#CCFF00] hover:bg-[#B3E600] text-[#0F0F0F] font-bold text-base rounded-2xl transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <PlayCircle className="w-5 h-5" aria-hidden="true" />
              <span>Try Interactive Demo</span>
            </button>
            <button
              type="button"
              onClick={() => onOpenDevelopers('architecture')}
              className="inline-flex items-center justify-center gap-2.5 px-8 py-4 bg-[#0F0F0F] hover:bg-[#161616] text-[#F4F4F5] font-semibold text-base rounded-2xl border border-white/15 hover:border-[#CCFF00] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Code2 className="w-5 h-5 text-[#CCFF00]" aria-hidden="true" />
              <span>Developers &amp; Judges</span>
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
