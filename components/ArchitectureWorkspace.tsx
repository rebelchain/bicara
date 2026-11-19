'use client';

import { useState } from 'react';
import { Check, Copy, ArrowRight, Terminal, ShieldAlert, Zap, Layers } from 'lucide-react';
import { SDK_AUDIT_ENTRIES } from '@/lib/sdk-audit-data';

type SolanaTrack = 'kit' | 'web3v1';

export default function ArchitectureWorkspace() {
  const [track, setTrack] = useState<SolanaTrack>('kit');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopy = async (id: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId((prev) => (prev === id ? null : prev)), 1800);
    } catch {
      // Clipboard blocked in non-HTTPS contexts
    }
  };

  return (
    <section aria-label="2026 SDK Migration and Architecture Blueprint" className="space-y-8">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 pb-6 border-b border-[#22272D]">
        <div className="space-y-2 max-w-2xl">
          <p className="text-xs font-medium text-[#94A3B8]">
            Verified against official docs · November 2026 · 7 SDK boundaries audited
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#F8FAFC] [text-wrap:balance]">
            2026 SDK Migration &amp; Architecture Blueprint
          </h1>
          <p className="text-sm sm:text-[15px] text-[#94A3B8] leading-relaxed">
            Every outdated package or breaking change from the draft specs has been verified against
            Solana Mobile, Picovoice Eagle Voiceprint, Expo Audio, Anchor AVM, Solana Program Token,
            and ElevenLabs Scribe v2.
          </p>
        </div>

        <div
          role="group"
          aria-label="Solana SDK Track"
          className="inline-flex items-center p-1 bg-[#14171A] border border-[#262B30] rounded-lg shrink-0 self-start lg:self-end"
        >
          <button
            type="button"
            onClick={() => setTrack('kit')}
            className={`px-3.5 py-2 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              track === 'kit'
                ? 'bg-[#22C55E] text-[#052E16]'
                : 'text-[#94A3B8] hover:text-[#F8FAFC]'
            }`}
          >
            Track A: @solana/kit (Recommended)
          </button>
          <button
            type="button"
            onClick={() => setTrack('web3v1')}
            className={`px-3.5 py-2 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              track === 'web3v1'
                ? 'bg-[#22C55E] text-[#052E16]'
                : 'text-[#94A3B8] hover:text-[#F8FAFC]'
            }`}
          >
            Track B: @solana/web3.js v1
          </button>
        </div>
      </div>

      {/* Track Summary Comparison Strip */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-[#14171A] border border-[#23282E] rounded-xl p-5 space-y-1.5">
          <div className="flex items-center justify-between text-xs text-[#94A3B8]">
            <span>Active Solana Track</span>
            <Layers className="w-4 h-4 text-[#22C55E]" aria-hidden="true" />
          </div>
          <p className="text-base font-semibold text-[#F8FAFC]">
            {track === 'kit' ? '@solana/kit + Codama' : '@solana/web3.js v1.99 + Anchor'}
          </p>
          <p className="text-xs text-[#94A3B8] leading-relaxed">
            {track === 'kit'
              ? 'Lightest React Native bundle via @wallet-ui/react-native-kit and @solana-program/token.'
              : 'Drop-in compatibility with @anchor-lang/core IDL and legacy Anchor tutorials.'}
          </p>
        </div>

        <div className="bg-[#14171A] border border-[#23282E] rounded-xl p-5 space-y-1.5">
          <div className="flex items-center justify-between text-xs text-[#94A3B8]">
            <span>Voice Latency Target</span>
            <Zap className="w-4 h-4 text-[#22C55E]" aria-hidden="true" />
          </div>
          <p className="text-base font-semibold text-[#F8FAFC] font-mono tabular-nums">
            4.0s – 6.9s E2E
          </p>
          <p className="text-xs text-[#94A3B8] leading-relaxed">
            Upgrading TTS from multilingual_v2 to eleven_flash_v2_5 saves ~900ms per voice prompt.
          </p>
        </div>

        <div className="bg-[#14171A] border border-[#23282E] rounded-xl p-5 space-y-1.5">
          <div className="flex items-center justify-between text-xs text-[#94A3B8]">
            <span>Critical Mobile Constraint</span>
            <ShieldAlert className="w-4 h-4 text-[#F59E0B]" aria-hidden="true" />
          </div>
          <p className="text-base font-semibold text-[#F8FAFC]">
            Custom Dev Client Mandatory
          </p>
          <p className="text-xs text-[#94A3B8] leading-relaxed">
            Expo Go cannot invoke Android MWA Intents. Build locally with npx expo run:android.
          </p>
        </div>
      </div>

      {/* 6 SDK Audit Cards */}
      <div className="space-y-4">
        {SDK_AUDIT_ENTRIES.map((entry, idx) => {
          const activeSnippet =
            track === 'web3v1' && entry.snippetWeb3v1 ? entry.snippetWeb3v1 : entry.snippetKit;
          const impactColor =
            entry.impact === 'Breaking'
              ? 'text-[#F87171]'
              : entry.impact === 'Security'
                ? 'text-[#FBBF24]'
                : 'text-[#4ADE80]';

          return (
            <article
              key={entry.id}
              className="bg-[#14171A] border border-[#23282E] rounded-xl overflow-hidden"
            >
              <div className="p-5 sm:p-6 grid grid-cols-1 xl:grid-cols-12 gap-6">
                <div className="xl:col-span-5 space-y-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-xs text-[#94A3B8]">
                      <span className="font-mono tabular-nums">0{idx + 1}.</span>
                      <span>{entry.layer}</span>
                      <span aria-hidden="true">·</span>
                      <span className={`font-medium ${impactColor}`}>{entry.impact} Update</span>
                    </div>
                    <h2 className="text-lg font-semibold text-[#F8FAFC]">{entry.layer}</h2>
                  </div>

                  <div className="space-y-2 text-xs">
                    <div className="bg-[#0E1114] border border-[#22272D] rounded-lg p-3 space-y-1">
                      <div className="text-[#64748B]">Previous Draft Spec</div>
                      <div className="font-mono text-[#94A3B8] line-through decoration-[#64748B]/70 break-words">
                        {entry.oldSpec}
                      </div>
                    </div>
                    <div className="flex justify-center text-[#64748B]" aria-hidden="true">
                      <ArrowRight className="w-3.5 h-3.5 rotate-90" />
                    </div>
                    <div className="bg-[#0E1114] border border-[#22C55E]/35 rounded-lg p-3 space-y-1">
                      <div className="text-[#4ADE80]">Verified 2026 Target</div>
                      <div className="font-mono text-[#F8FAFC] break-words">
                        {entry.verified2026}
                      </div>
                    </div>
                  </div>

                  <p className="text-sm text-[#94A3B8] leading-relaxed">{entry.summary}</p>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs text-[#94A3B8]">
                      <span className="inline-flex items-center gap-1.5">
                        <Terminal className="w-3.5 h-3.5" aria-hidden="true" />
                        Install Command
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCopy(`${entry.id}-cmd`, entry.installCmd)}
                        className="inline-flex items-center gap-1 text-xs text-[#94A3B8] hover:text-[#F8FAFC] transition-colors cursor-pointer whitespace-nowrap"
                        aria-label={`Copy install command for ${entry.layer}`}
                      >
                        {copiedId === `${entry.id}-cmd` ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-[#22C55E]" />
                            <span className="text-[#22C55E]">Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>Copy</span>
                          </>
                        )}
                      </button>
                    </div>
                    <pre className="bg-[#0B0D0E] border border-[#22272D] rounded-lg p-3 text-xs font-mono text-[#86EFAC] overflow-x-auto">
                      <code>{entry.installCmd}</code>
                    </pre>
                  </div>
                </div>

                <div className="xl:col-span-7 flex flex-col">
                  <div className="flex items-center justify-between px-3.5 py-2.5 bg-[#0E1114] border border-[#22272D] border-b-0 rounded-t-lg text-xs text-[#94A3B8]">
                    <span className="font-mono">
                      {track === 'web3v1' && entry.snippetWeb3v1
                        ? 'Reference Pattern · Web3.js v1'
                        : 'Reference Pattern · 2026 Recommended'}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopy(`${entry.id}-code`, activeSnippet)}
                      className="inline-flex items-center gap-1.5 text-xs text-[#94A3B8] hover:text-[#F8FAFC] transition-colors cursor-pointer whitespace-nowrap"
                      aria-label={`Copy code snippet for ${entry.layer}`}
                    >
                      {copiedId === `${entry.id}-code` ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-[#22C55E]" />
                          <span className="text-[#22C55E]">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copy Snippet</span>
                        </>
                      )}
                    </button>
                  </div>
                  <pre className="flex-1 bg-[#0B0D0E] border border-[#22272D] rounded-b-lg p-4 text-xs font-mono text-[#E2E8F0] leading-relaxed overflow-x-auto">
                    <code>{activeSnippet}</code>
                  </pre>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
