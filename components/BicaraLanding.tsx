'use client';

import { useEffect, useState } from 'react';
import Image, { type StaticImageData } from 'next/image';
import { motion, useReducedMotion } from 'motion/react';
import {
  ArrowRight,
  AudioLines,
  ChevronRight,
  Play,
  Square,
  Volume2,
} from 'lucide-react';
import heroHillsideImg from '@/src/assets/images/bicara_hero_hillside_1795211476293.jpg';
import previewSendImg from '@/src/assets/images/bicara_scene_send_voice_1795213373492.jpg';
import previewSafetyImg from '@/src/assets/images/bicara_scene_stop_blind_1795213372998.jpg';
import previewSwapImg from '@/src/assets/images/bicara_scene_eyesfree_balance_1795213374584.jpg';

interface BicaraLandingProps {
  onOpenDemo: (scenarioCommand?: string) => void;
  onOpenDevelopers: (tab?: 'architecture' | 'buildkit' | 'docs') => void;
}

interface PreviewCardItem {
  id: string;
  title: string;
  caption: string;
  command: string;
  image: StaticImageData;
  alt: string;
}

const LIVE_PREVIEW_CARDS: PreviewCardItem[] = [
  {
    id: 'send-by-voice',
    title: 'Send by Voice',
    caption: 'Try “Send 5 USDC to Ahmad”',
    command: 'Send 5 USDC to Ahmad',
    image: previewSendImg,
    alt: 'Two smiling friends at a sunlit outdoor garden table as one speaks hands-free with earbuds and the other receives a confirmed transfer on their phone',
  },
  {
    id: 'stop-blind-signing',
    title: 'Stop Blind Signing',
    caption: 'See unverified contacts blocked aloud',
    command: 'Send 5 USDC to Reza',
    image: previewSafetyImg,
    alt: 'A calm listener wearing wireless earbuds on a sunlit park path raising a firm stop hand gesture to refuse a suspicious unlabeled paper slip',
  },
  {
    id: 'eyes-free-balance',
    title: 'Eyes-Free Balance',
    caption: 'Hear your Solana portfolio spoken clearly',
    command: 'Check balance',
    image: previewSwapImg,
    alt: 'A relaxed person walking along a breezy sunlit hillside trail wearing wireless earbuds with their phone tucked safely untouched inside their tote bag pocket',
  },
];

const SAMPLE_VOICE_READOUT =
  'You are sending 5 U S D C to your saved contact Ahmad, wallet ending in 4 K 9 X. Network fee is less than one cent. Say yes to approve with your wallet, or say cancel to stop.';

export default function BicaraLanding({
  onOpenDemo,
  onOpenDevelopers,
}: BicaraLandingProps) {
  const prefersReducedMotion = useReducedMotion();
  const [isPlayingSample, setIsPlayingSample] = useState(false);

  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const handleToggleSampleAudio = () => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      onOpenDemo('Send 5 USDC to Ahmad');
      return;
    }

    if (isPlayingSample) {
      window.speechSynthesis.cancel();
      setIsPlayingSample(false);
      return;
    }

    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(SAMPLE_VOICE_READOUT);
      utterance.lang = 'en-US';
      utterance.rate = 0.96;
      utterance.onend = () => setIsPlayingSample(false);
      utterance.onerror = () => setIsPlayingSample(false);
      setIsPlayingSample(true);
      window.speechSynthesis.speak(utterance);
    } catch {
      setIsPlayingSample(false);
    }
  };

  const scrollToSection = (sectionId: string) => {
    document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth' });
  };

  const initialBlur = prefersReducedMotion
    ? { opacity: 1, y: 0, filter: 'blur(0px)' }
    : { opacity: 0, y: 18, filter: 'blur(8px)' };

  const visibleState = { opacity: 1, y: 0, filter: 'blur(0px)' };

  return (
    <div className="w-full bg-[#FAF9F5] text-[#1E3124]">
      {/* ================================================================= */}
      {/* FULL-BLEED SUNLIT ILLUSTRATED HERO (Meadowbell Architecture)       */}
      {/* ================================================================= */}
      <section className="relative w-full overflow-hidden bg-[#5AA4DF]">
        {/* Full-bleed hand-painted hillside scene with gentle living drift */}
        <div className="absolute inset-0 overflow-hidden" aria-hidden="true">
          <div className="bicara-living-scene relative w-full h-full">
            <Image
              src={heroHillsideImg}
              alt=""
              fill
              priority
              sizes="100vw"
              referrerPolicy="no-referrer"
              className="object-cover object-[18%_30%] sm:object-center"
            />
          </div>
          {/* Subtle measured atmospheric contrast veil — preserves vibrant sky & meadow */}
          <div className="absolute inset-0 bg-gradient-to-b from-[#175591]/30 via-[#1E5D99]/18 to-[#1B3A26]/38" />
          <div
            className="absolute inset-x-0 top-[26%] h-[36%] pointer-events-none"
            style={{
              background:
                'radial-gradient(ellipse 52% 60% at 50% 50%, rgba(20, 68, 122, 0.34) 0%, rgba(20, 68, 122, 0) 75%)',
            }}
          />
          <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-[#FAF9F5] via-[#FAF9F5]/45 to-transparent" />
        </div>

        {/* Hero Foreground Container */}
        <div className="relative z-10 max-w-[1320px] mx-auto px-5 sm:px-8 pt-5 sm:pt-6 pb-16 sm:pb-24 flex flex-col justify-between min-h-[100svh] lg:min-h-[960px]">
          {/* Floating Translucent Top Navigation */}
          <motion.header
            initial={prefersReducedMotion ? false : { opacity: 0, y: -14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
            className="flex items-center justify-between gap-4 sm:gap-6"
          >
            {/* Zone 1: Brand Wordmark with Soundwave Logo */}
            <button
              type="button"
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              className="inline-flex items-center gap-2.5 text-white drop-shadow-[0_2px_10px_rgba(24,66,118,0.3)] whitespace-nowrap shrink-0 cursor-pointer"
            >
              <AudioLines className="w-6 h-6 text-white shrink-0" strokeWidth={2.6} aria-hidden="true" />
              <span className="font-display text-2xl sm:text-[28px] font-black tracking-tight">
                Bicara
              </span>
            </button>

            {/* Zone 2: Translucent Frosted Sage Nav Pill (Landing Page Sections Only) */}
            <nav
              aria-label="Primary navigation"
              className="hidden lg:flex items-center gap-10 px-8 py-2.5 rounded-full bg-[#87AF8D]/48 backdrop-blur-md border border-white/25 shadow-[0_8px_28px_rgba(24,66,118,0.16)] text-white font-medium text-[15px]"
            >
              <button
                type="button"
                onClick={() => scrollToSection('live-previews')}
                className="hover:text-[#F4FFD9] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                Live Previews
              </button>
              <button
                type="button"
                onClick={() => scrollToSection('how-it-works')}
                className="hover:text-[#F4FFD9] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                How It Works
              </button>
              <button
                type="button"
                onClick={() => scrollToSection('safety')}
                className="hover:text-[#F4FFD9] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                Safety
              </button>
            </nav>

            {/* Zone 3: Standalone App Actions (Sandbox + Developers & Judges) */}
            <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
              <button
                type="button"
                onClick={() => onOpenDemo()}
                className="px-4 sm:px-5 py-2 sm:py-2.5 rounded-full bg-[#7CA683]/58 hover:bg-[#6E9976]/72 backdrop-blur-md border border-white/35 text-white font-semibold text-xs sm:text-[15px] shadow-[0_8px_24px_rgba(24,66,118,0.16)] hover:-translate-y-0.5 transition-all duration-150 whitespace-nowrap shrink-0 cursor-pointer"
              >
                Sandbox
              </button>
              <button
                type="button"
                onClick={() => onOpenDevelopers('architecture')}
                className="px-4 sm:px-5 py-2 sm:py-2.5 rounded-full bg-white hover:bg-[#F5FAF3] text-[#457249] font-semibold text-xs sm:text-[15px] shadow-[0_8px_24px_rgba(24,66,118,0.2)] hover:-translate-y-0.5 transition-all duration-150 whitespace-nowrap shrink-0 cursor-pointer"
              >
                Developers &amp; Judges
              </button>
            </div>
          </motion.header>

          {/* Centered Hero Copy Floating Over Open Blue Sky */}
          <div className="my-auto py-8 sm:py-16 lg:py-20 text-center max-w-4xl mx-auto">
            <motion.p
              initial={prefersReducedMotion ? false : { opacity: 0, filter: 'blur(6px)' }}
              animate={{ opacity: 1, filter: 'blur(0px)' }}
              transition={{ duration: 0.5, delay: 0.12 }}
              className="font-display font-black tracking-[0.06em] text-lg sm:text-2xl lg:text-[30px] text-white [text-shadow:0_3px_14px_rgba(20,58,108,0.52)]"
            >
              BICARA FOR SOLANA
            </motion.p>

            <h1 className="mt-2 sm:mt-3 font-display font-black text-white leading-[0.9] tracking-[-0.02em] text-[clamp(3rem,9.2vw,7.75rem)] [text-shadow:0_6px_22px_rgba(20,58,108,0.42)] [text-wrap:balance]">
              <motion.span
                initial={initialBlur}
                animate={visibleState}
                transition={{ duration: 0.6, delay: 0.22, ease: [0.16, 1, 0.3, 1] }}
                className="block"
              >
                SPEAK BEFORE
              </motion.span>
              <motion.span
                initial={initialBlur}
                animate={visibleState}
                transition={{ duration: 0.6, delay: 0.36, ease: [0.16, 1, 0.3, 1] }}
                className="block"
              >
                YOU SIGN
              </motion.span>
            </h1>

            <motion.p
              initial={prefersReducedMotion ? false : { opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.48, ease: [0.16, 1, 0.3, 1] }}
              className="mt-4 sm:mt-6 max-w-lg mx-auto text-[15px] sm:text-lg lg:text-[19px] leading-relaxed font-semibold text-white [text-shadow:0_2px_14px_rgba(16,52,96,0.75),0_1px_3px_rgba(16,52,96,0.55)]"
            >
              Hear every recipient, amount, and fee read aloud before your wallet ever signs.
              Built blind-first so anyone on Solana can move with calm, eyes-free clarity.
            </motion.p>

            {/* Dual Action Pills (Solid White + Frosted Mint Audio Preview) */}
            <motion.div
              initial={prefersReducedMotion ? false : { opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.58, ease: [0.16, 1, 0.3, 1] }}
              className="mt-6 sm:mt-8 flex flex-wrap items-center justify-center gap-3.5 sm:gap-4"
            >
              <button
                type="button"
                onClick={() => onOpenDemo()}
                className="inline-flex items-center justify-center px-7 py-3.5 rounded-full bg-white hover:bg-[#F5FAF3] text-[#3F6B43] font-bold text-base sm:text-[17px] shadow-[0_10px_28px_rgba(20,58,104,0.24)] hover:-translate-y-0.5 transition-all duration-150 whitespace-nowrap cursor-pointer"
              >
                Try Live Demo
              </button>

              <button
                type="button"
                onClick={handleToggleSampleAudio}
                className="inline-flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-full bg-[#B9CFA0]/72 hover:bg-[#C3D8AC]/82 backdrop-blur-md border border-white/35 text-white font-semibold text-base sm:text-[17px] shadow-[0_10px_28px_rgba(20,58,104,0.2)] hover:-translate-y-0.5 transition-all duration-150 whitespace-nowrap cursor-pointer"
              >
                {isPlayingSample ? (
                  <>
                    <Square className="w-4 h-4 fill-white text-white" aria-hidden="true" />
                    <span>Stop Sample</span>
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 fill-white text-white" aria-hidden="true" />
                    <span>Hear Sample</span>
                  </>
                )}
              </button>
            </motion.div>

            {/* Gentle inline caption strictly while sample voice is playing */}
            {isPlayingSample && (
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-[#1E3124]/75 backdrop-blur-md text-white/95 text-xs sm:text-sm max-w-lg mx-auto"
              >
                <Volume2 className="w-4 h-4 text-[#D9F99D] shrink-0" aria-hidden="true" />
                <span className="text-left leading-snug">
                  &ldquo;Sending 5 USDC to Ahmad, wallet ending in 4K9X. Fee under 1¢.&rdquo;
                </span>
              </motion.div>
            )}
          </div>

          {/* =============================================================== */}
          {/* BOTTOM-OF-HERO 3 ILLUSTRATED LIVE PREVIEW CARDS                 */}
          {/* =============================================================== */}
          <div id="live-previews" className="pt-6 scroll-mt-10">
            <motion.div
              initial={prefersReducedMotion ? false : { opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.68 }}
              className="flex items-end justify-between gap-4 mb-4"
            >
              <h2 className="font-display font-black text-2xl sm:text-3xl tracking-tight text-white drop-shadow-[0_3px_14px_rgba(20,50,36,0.5)]">
                LIVE PREVIEWS
              </h2>
              <button
                type="button"
                onClick={() => onOpenDemo()}
                className="group inline-flex items-center gap-1 text-sm sm:text-base font-semibold text-white drop-shadow-[0_2px_10px_rgba(20,50,36,0.5)] hover:text-[#F4FFD9] transition-colors whitespace-nowrap cursor-pointer"
              >
                <span>open full sandbox</span>
                <ChevronRight
                  className="w-4 h-4 transition-transform duration-150 group-hover:translate-x-1"
                  aria-hidden="true"
                />
              </button>
            </motion.div>

            {/* Swipeable row on small screens, crisp 3-up cards on desktop */}
            <div className="flex md:grid md:grid-cols-3 gap-4 sm:gap-6 overflow-x-auto md:overflow-visible pb-2 md:pb-0 snap-x snap-mandatory -mx-5 px-5 md:mx-0 md:px-0">
              {LIVE_PREVIEW_CARDS.map((card, index) => (
                <motion.button
                  key={card.id}
                  type="button"
                  onClick={() => onOpenDemo(card.command)}
                  initial={prefersReducedMotion ? false : { opacity: 0, y: 22 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    duration: 0.55,
                    delay: 0.74 + index * 0.1,
                    ease: [0.16, 1, 0.3, 1],
                  }}
                  className="group relative snap-start shrink-0 w-[82vw] sm:w-[340px] md:w-auto aspect-[4/3] rounded-2xl overflow-hidden text-left shadow-[0_18px_38px_rgba(22,48,34,0.24)] ring-1 ring-white/40 hover:-translate-y-2 transition-transform duration-200 cursor-pointer bg-[#8AB48E]"
                >
                  <Image
                    src={card.image}
                    alt={card.alt}
                    fill
                    sizes="(max-width: 768px) 82vw, 33vw"
                    referrerPolicy="no-referrer"
                    className="object-cover scale-[1.07] group-hover:scale-[1.13] transition-transform duration-300 ease-out"
                  />
                  {/* Measured bottom contrast scrim */}
                  <div className="absolute inset-0 bg-gradient-to-t from-[#16291D]/82 via-[#16291D]/20 to-transparent" />

                  {/* Bottom-left Play affordance + clean readable caption */}
                  <div className="absolute inset-x-0 bottom-0 p-4 sm:p-5 flex items-end gap-3.5">
                    <span className="w-11 h-11 rounded-full bg-white/95 text-[#356341] flex items-center justify-center shrink-0 shadow-md group-hover:scale-105 transition-transform">
                      <Play className="w-5 h-5 fill-[#356341] ml-0.5" aria-hidden="true" />
                    </span>
                    <div className="min-w-0">
                      <p className="font-display font-extrabold text-lg sm:text-xl text-white leading-tight">
                        {card.title}
                      </p>
                      <p className="text-xs sm:text-sm text-white/90 truncate mt-0.5">
                        {card.caption}
                      </p>
                    </div>
                  </div>
                </motion.button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ================================================================= */}
      {/* SUNLIT EDITORIAL CONTINUATION — HOW IT WORKS                      */}
      {/* ================================================================= */}
      <section
        id="how-it-works"
        className="max-w-[1160px] mx-auto px-5 sm:px-8 py-20 sm:py-28 scroll-mt-12"
      >
        <div className="max-w-2xl space-y-3">
          <p className="text-sm font-semibold text-[#457249]">How Bicara works</p>
          <h2 className="font-display font-black text-3xl sm:text-5xl tracking-tight text-[#1E3124] leading-[1.05] [text-wrap:balance]">
            Three calm steps from your voice to your wallet.
          </h2>
          <p className="text-base sm:text-lg text-[#526658] leading-relaxed">
            No hunting through tiny menus or squinting at 44-character wallet strings. Speak naturally
            and hear every consequence clearly before you approve.
          </p>
        </div>

        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-8 sm:gap-10">
          {[
            {
              num: '01.',
              title: 'Say what you want',
              desc: 'Tap anywhere on the screen — even while walking — and say “Send 5 USDC to Ahmad” or “Check my balance.”',
            },
            {
              num: '02.',
              title: 'Hear every detail aloud',
              desc: 'Bicara reads back the saved contact name, wallet ending, exact amount, and network fee in plain English.',
            },
            {
              num: '03.',
              title: 'Approve with your wallet',
              desc: 'Nothing moves on voice alone. Confirm with your fingerprint or Face ID inside your own Solana wallet.',
            },
          ].map((step) => (
            <div key={step.num} className="pt-6 border-t border-[#DCE3D6] space-y-3">
              <p className="font-display font-black text-2xl text-[#457249] tabular-nums">
                {step.num}
              </p>
              <h3 className="font-display font-extrabold text-2xl text-[#1E3124] tracking-tight">
                {step.title}
              </h3>
              <p className="text-[15px] text-[#526658] leading-relaxed">{step.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ================================================================= */}
      {/* SAFETY & CLARITY STORY — THE $516.8M BLIND-SIGNING PROBLEM        */}
      {/* ================================================================= */}
      <section
        id="safety"
        className="max-w-[1160px] mx-auto px-5 sm:px-8 pb-20 sm:pb-28 scroll-mt-12"
      >
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-start">
          {/* Left Editorial Argument */}
          <div className="lg:col-span-6 space-y-5">
            <p className="text-sm font-semibold text-[#457249]">Why clarity matters</p>
            <h2 className="font-display font-black text-3xl sm:text-5xl tracking-tight text-[#1E3124] leading-[1.06] [text-wrap:balance]">
              $516.8M lost to blind signing in a single year.
            </h2>
            <p className="text-base text-[#526658] leading-relaxed">
              Every day, people approve wallet popups they cannot decipher — and for blind or
              low-vision users, unreadable addresses lock them out completely. When you build for
              zero-screen clarity first, every transaction becomes safer for everyone.
            </p>
            <p className="text-xs text-[#738678]">
              Source: Chainalysis Crypto Crime Report · Blind-signing &amp; approval phishing losses.
            </p>
          </div>

          {/* Right Paper Sheet: 3 Plain-English Guarantees */}
          <div className="lg:col-span-6 bg-white border border-[#E2E6DC] rounded-3xl p-7 sm:p-9 shadow-[0_12px_36px_rgba(30,49,36,0.05)] divide-y divide-[#E9EDE3]">
            {[
              {
                title: 'Every word read aloud before signing',
                body: 'No silent transfers and no hidden fees. You hear the recipient, amount, and exact network cost before any approval prompt opens.',
              },
              {
                title: 'Saved contacts only for voice sends',
                body: 'Voice can only send to people you have already verified in your contact list, stopping typos and look-alike address traps.',
              },
              {
                title: 'Your wallet always holds the keys',
                body: 'Bicara never touches your seed phrase or private keys. Every final signature happens inside your own Solana wallet with biometrics.',
              },
            ].map((item) => (
              <div key={item.title} className="py-5 first:pt-0 last:pb-0 space-y-1.5">
                <h3 className="font-display font-extrabold text-xl text-[#1E3124]">
                  {item.title}
                </h3>
                <p className="text-sm sm:text-[15px] text-[#526658] leading-relaxed">
                  {item.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ================================================================= */}
      {/* QUIET SUNLIT CLOSING INVITATION                                   */}
      {/* ================================================================= */}
      <section className="max-w-[1160px] mx-auto px-5 sm:px-8 pb-20 sm:pb-28">
        <div className="rounded-3xl bg-[#EEF3E8] border border-[#DCE4D4] px-7 py-12 sm:px-14 sm:py-16 text-center space-y-5">
          <h2 className="font-display font-black text-3xl sm:text-5xl tracking-tight text-[#1E3124] [text-wrap:balance]">
            Ready to hear what you sign?
          </h2>
          <p className="max-w-xl mx-auto text-base sm:text-lg text-[#526658] leading-relaxed">
            Try the interactive browser sandbox right now, or explore the open-source mobile build
            kit and architecture docs.
          </p>
          <div className="pt-2 flex flex-wrap items-center justify-center gap-3.5">
            <button
              type="button"
              onClick={() => onOpenDemo()}
              className="inline-flex items-center gap-2 px-7 py-3.5 rounded-full bg-[#356341] hover:bg-[#2A5135] text-white font-bold text-base transition-colors whitespace-nowrap cursor-pointer"
            >
              <span>Try Live Demo</span>
              <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => onOpenDevelopers('buildkit')}
              className="inline-flex items-center gap-2 px-7 py-3.5 rounded-full bg-white hover:bg-[#FAFBF8] text-[#1E3124] border border-[#CFD8C7] font-semibold text-base transition-colors whitespace-nowrap cursor-pointer"
            >
              <span>Solana Mobile Build Kit</span>
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
