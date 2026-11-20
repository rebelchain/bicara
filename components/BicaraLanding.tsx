'use client';

import Image from 'next/image';
import {
  ArrowRight,
  Code2,
  Fingerprint,
  Mic,
  ShieldAlert,
  ShieldCheck,
  Volume2,
  XCircle,
} from 'lucide-react';
import heroVisual from '@/src/assets/images/hero_spoken_verification_1795204566336.jpg';
import type { Contact, TransactionRecord } from '@/lib/bicara-engine';
import PrototypeWorkspace from './PrototypeWorkspace';

interface BicaraLandingProps {
  contacts: Contact[];
  transactions: TransactionRecord[];
  senderBalanceUsdc: number;
  senderBalanceSol: number;
  walletConnected: boolean;
  onToggleWallet: () => void;
  onAddContact: (c: Contact) => void;
  onDeleteContact: (id: string) => void;
  onCompleteTransfer: (
    tx: TransactionRecord,
    nextSenderBalance: number,
    recipientId: string
  ) => void;
  onResetBalances: () => void;
  demoTriggerNonce: number;
  onRunDemoFlow: () => void;
  onOpenDevelopers: (tab?: 'architecture' | 'buildkit' | 'docs') => void;
}

const MEASURED_BENCHMARKS = [
  {
    component: 'ElevenLabs Scribe v2 (STT + dynamic keyterms)',
    measured: '760–774 ms',
    device: 'OPPO CPH2631 · Android 16',
    outcome: 'Accurately recognized USDC, SOL, and saved contact "Ahmad"',
  },
  {
    component: 'ElevenLabs Flash v2.5 (Spoken TxSummary TTS)',
    measured: '558–732 ms',
    device: 'OPPO CPH2631 · Android 16',
    outcome: 'Warm on-device audio playback over USB proxy (1296 ms cold)',
  },
  {
    component: 'Jupiter Swap API V2 (Quote-Only, no taker)',
    measured: '322–724 ms',
    device: 'Server Proxy + OPPO E2E',
    outcome: '10 USDC -> 0.14434 SOL via metis router; transaction: null',
  },
  {
    component: 'Layer 3 Verified Token Allowlist',
    measured: 'HTTP 403',
    device: 'Live Proxy Policy Gate',
    outcome: 'Hard-blocked unverified token "XYZ" before quoting or signing',
  },
  {
    component: 'Solana Mobile Wallet Adapter (MWA 2.0)',
    measured: 'Verified',
    device: 'Solflare · solana:devnet',
    outcome: 'Authorized wallet on Android 16; hardware/wallet approval boundary active',
  },
] as const;

export default function BicaraLanding({
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
  onRunDemoFlow,
  onOpenDevelopers,
}: BicaraLandingProps) {
  return (
    <div className="space-y-24 pb-12">
      {/* 1. HERO SECTION (Proposition) */}
      <section aria-label="Bicara Overview" className="pt-6 sm:pt-10 space-y-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-stretch">
          {/* Left Narrative Column */}
          <div className="lg:col-span-7 flex flex-col justify-between space-y-8">
            <div className="space-y-5">
              <p className="text-sm font-medium text-[#A1A1AA]">
                Spoken transaction verification · Built blind-first for Solana Mobile
              </p>

              <h1 className="font-display font-extrabold tracking-tight text-[#F4F4F5] text-[clamp(2.4rem,4.5vw,3.95rem)] leading-[1.06] [text-wrap:balance]">
                Before you sign anything on Solana, hear exactly what will happen.
              </h1>

              <p className="text-base sm:text-lg text-[#A1A1AA] leading-relaxed max-w-2xl">
                No one reads a 44-character wallet address, and almost no one understands a DEX
                signing popup. In 2022 alone,{' '}
                <strong className="text-[#F4F4F5] font-semibold">$516.8 million</strong> was lost to
                approval phishing (Chainalysis). Bicara speaks every recipient, fee, rent cost, and
                risk warning out loud before your wallet signs — built blind-first so if it works
                with zero screen, it works better for everyone.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-4">
              <button
                type="button"
                onClick={() => {
                  onRunDemoFlow();
                  document.getElementById('live-demo')?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="inline-flex items-center justify-center gap-2.5 px-7 py-4 bg-[#CCFF00] hover:bg-[#B3E600] text-[#0F0F0F] font-bold text-sm sm:text-base rounded-2xl transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Mic className="w-4 h-4" aria-hidden="true" />
                <span>Try Live Voice Demo</span>
              </button>

              <a
                href="#security"
                className="inline-flex items-center justify-center gap-2 px-5 py-4 text-sm sm:text-base font-medium text-[#F4F4F5] hover:text-[#CCFF00] transition-colors whitespace-nowrap shrink-0"
              >
                <span>See 5-Layer Security</span>
                <ArrowRight className="w-4 h-4" aria-hidden="true" />
              </a>
            </div>
          </div>

          {/* Right Editorial Hardware Focal Visual */}
          <div className="lg:col-span-5 relative min-h-[300px] lg:min-h-[380px] rounded-[2rem] overflow-hidden bg-[#1A1A1A] border border-[#CCFF00]/20">
            <Image
              src={heroVisual}
              alt="Matte-black Android smartphone resting on obsidian slate emitting electric neon lime acoustic verification waves"
              fill
              priority
              sizes="(max-width: 1024px) 100vw, 42vw"
              className="object-cover"
              referrerPolicy="no-referrer"
            />
            <div
              className="absolute inset-0 bg-gradient-to-t from-[#0F0F0F]/90 via-[#0F0F0F]/20 to-transparent"
              aria-hidden="true"
            />
            <div className="absolute bottom-0 inset-x-0 p-6 space-y-1.5">
              <p className="text-xs font-medium text-[#CCFF00]">
                Voice Identifies · Hardware Authorizes
              </p>
              <p className="text-sm font-medium text-[#F4F4F5] leading-snug">
                Verified on physical OPPO Android 16 over USB with Solflare MWA, ElevenLabs Scribe
                v2 &amp; Flash v2.5, and Jupiter Swap API V2 Quote-Only.
              </p>
            </div>
          </div>
        </div>

        {/* Full-Width 4-Column Evidence Strip */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
          <div className="bg-[#1A1A1A] border border-[#262626] rounded-2xl p-5 space-y-1">
            <p className="font-mono text-2xl sm:text-3xl font-bold text-[#CCFF00] tabular-nums">
              $516.8M
            </p>
            <p className="text-xs sm:text-sm text-[#A1A1AA] leading-snug">
              Lost to approval phishing in 2022 (Chainalysis)
            </p>
          </div>
          <div className="bg-[#1A1A1A] border border-[#262626] rounded-2xl p-5 space-y-1">
            <p className="font-mono text-2xl sm:text-3xl font-bold text-[#F4F4F5] tabular-nums">
              760 ms
            </p>
            <p className="text-xs sm:text-sm text-[#A1A1AA] leading-snug">
              Measured Scribe v2 STT latency on OPPO Android 16
            </p>
          </div>
          <div className="bg-[#1A1A1A] border border-[#262626] rounded-2xl p-5 space-y-1">
            <p className="font-mono text-2xl sm:text-3xl font-bold text-[#F4F4F5] tabular-nums">
              558 ms
            </p>
            <p className="text-xs sm:text-sm text-[#A1A1AA] leading-snug">
              Measured ElevenLabs Flash v2.5 warm audio playback
            </p>
          </div>
          <div className="bg-[#1A1A1A] border border-[#262626] rounded-2xl p-5 space-y-1">
            <p className="font-mono text-2xl sm:text-3xl font-bold text-[#F4F4F5] tabular-nums">
              322 ms
            </p>
            <p className="text-xs sm:text-sm text-[#A1A1AA] leading-snug">
              Live Jupiter V2 Quote-Only check (transaction: null)
            </p>
          </div>
        </div>
      </section>

      {/* 2. HOW IT WORKS (Mechanism — Asymmetric Editorial Bento) */}
      <section id="how-it-works" aria-label="How Bicara Works" className="space-y-8 scroll-mt-24">
        <div className="max-w-2xl space-y-2">
          <p className="text-sm font-medium text-[#CCFF00]">How It Works</p>
          <h2 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-[#F4F4F5] [text-wrap:balance]">
            Three spoken steps from voice intent to hardware authorization.
          </h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Step 01 — Featured Wide Card */}
          <div className="lg:col-span-7 bg-[#1A1A1A] border border-[#CCFF00]/20 rounded-[2rem] p-8 flex flex-col justify-between gap-6">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-2">
                <p className="font-mono text-xs text-[#CCFF00]">01. Say it naturally</p>
                <h3 className="font-display text-xl sm:text-2xl font-bold text-[#F4F4F5]">
                  Tap anywhere on the screen and speak your transaction
                </h3>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-[#0F0F0F] border border-[#CCFF00]/30 flex items-center justify-center shrink-0">
                <Mic className="w-5 h-5 text-[#CCFF00]" aria-hidden="true" />
              </div>
            </div>
            <p className="text-sm sm:text-base text-[#A1A1AA] leading-relaxed">
              The entire Android Home canvas is a single tap target — zero hunting for tiny icons.
              ElevenLabs <span className="font-mono text-[#F4F4F5]">scribe_v2</span> uses dynamic{' '}
              <span className="font-mono text-[#F4F4F5]">keyterms</span> synced from your verified
              address book so contact names like Ahmad and token symbols like USDC or SOL transcribe
              cleanly.
            </p>
            <p className="font-mono text-xs text-[#A1A1AA]">
              &ldquo;Send 5 USDC to Ahmad&rdquo; · &ldquo;Swap 10 USDC to SOL&rdquo; · &ldquo;Check
              balance&rdquo;
            </p>
          </div>

          {/* Step 02 */}
          <div className="lg:col-span-5 bg-[#1A1A1A] border border-[#262626] rounded-[2rem] p-8 flex flex-col justify-between gap-6">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-2">
                <p className="font-mono text-xs text-[#A855F7]">02. Hear what actually happens</p>
                <h3 className="font-display text-xl sm:text-2xl font-bold text-[#F4F4F5]">
                  Full spoken TxSummary from live RPC
                </h3>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-[#0F0F0F] border border-[#262626] flex items-center justify-center shrink-0">
                <Volume2 className="w-5 h-5 text-[#A855F7]" aria-hidden="true" />
              </div>
            </div>
            <p className="text-sm sm:text-base text-[#A1A1AA] leading-relaxed">
              Before anything reaches your wallet, Bicara inspects Solana Devnet RPC and speaks the
              exact recipient status, last 4 address characters, live network fee, first-time USDC
              token-account rent (~0.00204 SOL), or Jupiter price impact via{' '}
              <span className="font-mono text-[#F4F4F5]">eleven_flash_v2_5</span>.
            </p>
          </div>

          {/* Step 03 — Full Width Closing Mechanism */}
          <div className="lg:col-span-12 bg-[#1A1A1A] border border-[#262626] rounded-[2rem] p-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-start gap-5 max-w-3xl">
              <div className="w-12 h-12 rounded-2xl bg-[#0F0F0F] border border-[#CCFF00]/30 flex items-center justify-center shrink-0 mt-0.5">
                <Fingerprint className="w-5 h-5 text-[#CCFF00]" aria-hidden="true" />
              </div>
              <div className="space-y-2">
                <p className="font-mono text-xs text-[#CCFF00]">03. Authorize with hardware</p>
                <h3 className="font-display text-xl sm:text-2xl font-bold text-[#F4F4F5]">
                  Random spoken challenge + Solana Mobile Wallet Adapter signing
                </h3>
                <p className="text-sm sm:text-base text-[#A1A1AA] leading-relaxed">
                  A runtime 3-digit spoken challenge blocks static audio replay clips, and private
                  keys never touch Bicara. Final fund authorization always happens inside Solflare,
                  Phantom, or Solana Seeker Seed Vault via MWA 2.0.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => onOpenDevelopers('architecture')}
              className="inline-flex items-center gap-2 px-5 py-3 text-sm font-semibold text-[#F4F4F5] bg-[#0F0F0F] hover:border-[#CCFF00] border border-[#2E2E2E] rounded-xl transition-colors whitespace-nowrap shrink-0 self-start md:self-center cursor-pointer"
            >
              <Code2 className="w-4 h-4 text-[#CCFF00]" aria-hidden="true" />
              <span>Inspect Architecture</span>
            </button>
          </div>
        </div>
      </section>

      {/* 3. INTERACTIVE LIVE VOICE DEMO */}
      <section id="live-demo" aria-label="Interactive Bicara Demo" className="space-y-6 scroll-mt-24">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-4 border-b border-[#262626]">
          <div className="space-y-2 max-w-2xl">
            <p className="text-sm font-medium text-[#CCFF00]">Interactive Sandbox</p>
            <h2 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-[#F4F4F5] [text-wrap:balance]">
              Test the spoken verification loop right here.
            </h2>
            <p className="text-sm sm:text-base text-[#A1A1AA]">
              Run voice or preset commands, preview a verified Quote-Only USDC ↔ SOL swap, test the
              HTTP 403 scam-token block, and hear the exact pre-sign narration.
            </p>
          </div>
        </div>

        <PrototypeWorkspace
          contacts={contacts}
          transactions={transactions}
          senderBalanceUsdc={senderBalanceUsdc}
          senderBalanceSol={senderBalanceSol}
          walletConnected={walletConnected}
          onToggleWallet={onToggleWallet}
          onAddContact={onAddContact}
          onDeleteContact={onDeleteContact}
          onCompleteTransfer={onCompleteTransfer}
          onResetBalances={onResetBalances}
          demoTriggerNonce={demoTriggerNonce}
        />
      </section>

      {/* 4. SECURITY COMPARISON & FIVE-LAYER DEFENSE */}
      <section id="security" aria-label="Security Model Comparison" className="space-y-8 scroll-mt-24">
        <div className="max-w-2xl space-y-2">
          <p className="text-sm font-medium text-[#CCFF00]">Security Through Clarity</p>
          <h2 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-[#F4F4F5] [text-wrap:balance]">
            Voice identifies intent. Hardware authorizes funds.
          </h2>
          <p className="text-sm sm:text-base text-[#A1A1AA] leading-relaxed">
            Bicara never claims voice verification stops AI voice clones. Instead, five explicit
            layers protect users against blind signing, address poisoning, fake tokens, and replay
            clips — with hardware signing as the true security boundary.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Standard Blind Signing */}
          <div className="bg-[#1A1A1A] border border-[#262626] rounded-[2rem] p-8 space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-xl font-bold text-[#F4F4F5]">
                Standard Blind-Signing Wallet
              </h3>
              <XCircle className="w-5 h-5 text-[#EF4444]" aria-hidden="true" />
            </div>
            <ul className="space-y-3.5 text-sm text-[#A1A1AA]">
              <li className="flex items-start gap-3">
                <ShieldAlert className="w-4 h-4 text-[#EF4444] shrink-0 mt-0.5" aria-hidden="true" />
                <span>Displays truncated 44-character Base58 strings that nobody reads aloud or verifies end-to-end.</span>
              </li>
              <li className="flex items-start gap-3">
                <ShieldAlert className="w-4 h-4 text-[#EF4444] shrink-0 mt-0.5" aria-hidden="true" />
                <span>Allows swaps against spoofed tickers and unverified scam mints with identical visual logos.</span>
              </li>
              <li className="flex items-start gap-3">
                <ShieldAlert className="w-4 h-4 text-[#EF4444] shrink-0 mt-0.5" aria-hidden="true" />
                <span>Hides first-time Associated Token Account rent and real slippage inside cramped small-print popups.</span>
              </li>
              <li className="flex items-start gap-3">
                <ShieldAlert className="w-4 h-4 text-[#EF4444] shrink-0 mt-0.5" aria-hidden="true" />
                <span>Unusable for blind and low-vision users who depend on screen readers.</span>
              </li>
            </ul>
          </div>

          {/* Bicara Spoken Verification */}
          <div className="bg-[#1A1A1A] border border-[#CCFF00]/30 rounded-[2rem] p-8 space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-xl font-bold text-[#F4F4F5]">
                Bicara Accessible-Signing Layer
              </h3>
              <ShieldCheck className="w-5 h-5 text-[#CCFF00]" aria-hidden="true" />
            </div>
            <ul className="space-y-3.5 text-sm text-[#D4D4D8]">
              <li className="flex items-start gap-3">
                <ShieldCheck className="w-4 h-4 text-[#CCFF00] shrink-0 mt-0.5" aria-hidden="true" />
                <span><strong className="text-[#F4F4F5]">Layer 2 Random Spoken Challenge:</strong> Runtime 3-digit check defeats static pre-recorded replay clips.</span>
              </li>
              <li className="flex items-start gap-3">
                <ShieldCheck className="w-4 h-4 text-[#CCFF00] shrink-0 mt-0.5" aria-hidden="true" />
                <span><strong className="text-[#F4F4F5]">Layer 3 Strict Allowlists:</strong> Voice can only send to verified contacts and hard-blocks unknown swap tokens (HTTP 403).</span>
              </li>
              <li className="flex items-start gap-3">
                <ShieldCheck className="w-4 h-4 text-[#CCFF00] shrink-0 mt-0.5" aria-hidden="true" />
                <span><strong className="text-[#F4F4F5]">Layer 4 Full Spoken TxSummary:</strong> Reads recipient, last-4 digits, live RPC fee, and ~0.00204 SOL ATA rent aloud before signing.</span>
              </li>
              <li className="flex items-start gap-3">
                <ShieldCheck className="w-4 h-4 text-[#CCFF00] shrink-0 mt-0.5" aria-hidden="true" />
                <span><strong className="text-[#F4F4F5]">Layer 5 Hardware Boundary (MWA):</strong> Private keys never leave Solflare / Phantom / Seed Vault.</span>
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* 5. REAL MEASURED HARDWARE PROOF (No Fake Testimonials) */}
      <section id="benchmarks" aria-label="Measured Hardware Benchmarks" className="space-y-8 scroll-mt-24">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="max-w-2xl space-y-2">
            <p className="text-sm font-medium text-[#CCFF00]">Real Hardware Evidence</p>
            <h2 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-[#F4F4F5] [text-wrap:balance]">
              Measured on physical Android 16 hardware — zero fabricated quotes.
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-[#A1A1AA] max-w-md">
            Honest validation disclosure: <strong className="text-[#F4F4F5]">0</strong> real blind
            users tested yet — 2–3 TalkBack walkthroughs are scheduled prior to kickoff and will be
            logged verbatim in <span className="font-mono text-[#CCFF00]">PROJECT.md</span>.
          </p>
        </div>

        <div className="bg-[#1A1A1A] border border-[#262626] rounded-[2rem] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#262626] text-xs font-medium text-[#A1A1AA]">
                  <th className="py-4 px-6">Pipeline Component</th>
                  <th className="py-4 px-6">Measured Result</th>
                  <th className="py-4 px-6">Environment</th>
                  <th className="py-4 px-6">Verified Outcome</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#262626] text-sm">
                {MEASURED_BENCHMARKS.map((row) => (
                  <tr key={row.component} className="hover:bg-[#1F1F1F] transition-colors">
                    <td className="py-4 px-6 font-medium text-[#F4F4F5]">{row.component}</td>
                    <td className="py-4 px-6 font-mono font-semibold text-[#CCFF00] tabular-nums whitespace-nowrap">
                      {row.measured}
                    </td>
                    <td className="py-4 px-6 text-[#A1A1AA] whitespace-nowrap">{row.device}</td>
                    <td className="py-4 px-6 text-[#D4D4D8]">{row.outcome}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Bottom Judges & Developers Conversion Block */}
        <div className="bg-[#1A1A1A] border border-[#CCFF00]/25 rounded-[2rem] p-8 sm:p-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <p className="text-xs font-medium text-[#CCFF00]">
              Dev3pack Global Hackathon · MIT Open Source · Solana Devnet + Quote-Only Swaps
            </p>
            <h3 className="font-display text-2xl sm:text-3xl font-bold text-[#F4F4F5]">
              Evaluating Bicara as a judge or Solana builder?
            </h3>
            <p className="text-sm sm:text-base text-[#A1A1AA]">
              Inspect the reusable <span className="font-mono text-[#F4F4F5]">accessible-signing</span>{' '}
              architecture, full mobile Expo Dev Client scaffold, and complete repository
              documentation inside the Developers &amp; Judges Studio.
            </p>
          </div>
          <button
            type="button"
            onClick={() => onOpenDevelopers('architecture')}
            className="inline-flex items-center justify-center gap-2.5 px-7 py-4 bg-[#CCFF00] hover:bg-[#B3E600] text-[#0F0F0F] font-bold text-sm sm:text-base rounded-2xl transition-colors whitespace-nowrap shrink-0 self-start lg:self-center cursor-pointer"
          >
            <Code2 className="w-4 h-4" aria-hidden="true" />
            <span>Open Developers &amp; Judges Studio</span>
          </button>
        </div>
      </section>
    </div>
  );
}
