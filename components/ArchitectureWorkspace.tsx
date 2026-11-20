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
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 pb-6 border-b border-[#E2E6DC]">
        <div className="space-y-2 max-w-2xl">
          <p className="text-xs font-semibold text-[#457249]">
            accessible-signing Architecture · Verified 2026 SDK Matrix · Voice Identifies, Hardware Authorizes
          </p>
          <h2 className="font-display text-2xl sm:text-3xl font-black tracking-tight text-[#1E3124] [text-wrap:balance]">
            accessible-signing &amp; 2026 SDK Architecture Blueprint
          </h2>
          <p className="text-sm sm:text-[15px] text-[#526658] leading-relaxed">
            Reusable spoken transaction verification architecture verified against Solana Mobile MWA 2.0,
            @solana/kit, ElevenLabs Scribe v2 &amp; Flash v2.5, Jupiter Swap V2 (Quote-Only), Expo Audio,
            optional Picovoice Eagle, and Anchor ContactRegistry PDA.
          </p>
        </div>

        <div
          role="group"
          aria-label="Solana SDK Track"
          className="inline-flex items-center p-1 bg-[#EEF3E8] border border-[#DCE4D4] rounded-full shrink-0 self-start lg:self-end"
        >
          <button
            type="button"
            onClick={() => setTrack('kit')}
            className={`px-3.5 py-2 text-xs font-semibold rounded-full transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              track === 'kit'
                ? 'bg-[#356341] text-white'
                : 'text-[#526658] hover:text-[#1E3124]'
            }`}
          >
            Track A: @solana/kit (Recommended)
          </button>
          <button
            type="button"
            onClick={() => setTrack('web3v1')}
            className={`px-3.5 py-2 text-xs font-semibold rounded-full transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              track === 'web3v1'
                ? 'bg-[#356341] text-white'
                : 'text-[#526658] hover:text-[#1E3124]'
            }`}
          >
            Track B: @solana/web3.js v1
          </button>
        </div>
      </div>

      {/* Track Summary Comparison Strip */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border border-[#E2E6DC] rounded-2xl p-5 space-y-1.5 shadow-[0_6px_20px_rgba(30,49,36,0.04)]">
          <div className="flex items-center justify-between text-xs text-[#526658]">
            <span>Active Solana Track</span>
            <Layers className="w-4 h-4 text-[#356341]" aria-hidden="true" />
          </div>
          <p className="text-base font-bold text-[#1E3124]">
            {track === 'kit' ? '@solana/kit + Codama' : '@solana/web3.js v1.99 + Anchor'}
          </p>
          <p className="text-xs text-[#526658] leading-relaxed">
            {track === 'kit'
              ? 'Lightest React Native bundle via @wallet-ui/react-native-kit and @solana-program/token.'
              : 'Drop-in compatibility with @anchor-lang/core IDL and legacy Anchor tutorials.'}
          </p>
        </div>

        <div className="bg-white border border-[#E2E6DC] rounded-2xl p-5 space-y-1.5 shadow-[0_6px_20px_rgba(30,49,36,0.04)]">
          <div className="flex items-center justify-between text-xs text-[#526658]">
            <span>Voice Latency Target</span>
            <Zap className="w-4 h-4 text-[#356341]" aria-hidden="true" />
          </div>
          <p className="text-base font-bold text-[#1E3124] font-mono tabular-nums">
            4.0s – 6.9s E2E
          </p>
          <p className="text-xs text-[#526658] leading-relaxed">
            Upgrading TTS from multilingual_v2 to eleven_flash_v2_5 saves ~900ms per voice prompt.
          </p>
        </div>

        <div className="bg-white border border-[#E2E6DC] rounded-2xl p-5 space-y-1.5 shadow-[0_6px_20px_rgba(30,49,36,0.04)]">
          <div className="flex items-center justify-between text-xs text-[#526658]">
            <span>Critical Mobile Constraint</span>
            <ShieldAlert className="w-4 h-4 text-[#B45309]" aria-hidden="true" />
          </div>
          <p className="text-base font-bold text-[#1E3124]">
            Custom Dev Client Mandatory
          </p>
          <p className="text-xs text-[#526658] leading-relaxed">
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
              ? 'text-[#B91C1C]'
              : entry.impact === 'Security'
                ? 'text-[#B45309]'
                : 'text-[#2E6B40]';

          return (
            <article
              key={entry.id}
              className="bg-white border border-[#E2E6DC] rounded-2xl overflow-hidden shadow-[0_6px_20px_rgba(30,49,36,0.04)]"
            >
              <div className="p-5 sm:p-6 grid grid-cols-1 xl:grid-cols-12 gap-6">
                <div className="xl:col-span-5 space-y-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-xs text-[#526658]">
                      <span className="font-mono tabular-nums">0{idx + 1}.</span>
                      <span>{entry.layer}</span>
                      <span aria-hidden="true">·</span>
                      <span className={`font-semibold ${impactColor}`}>{entry.impact} Update</span>
                    </div>
                    <h3 className="text-lg font-bold text-[#1E3124]">{entry.layer}</h3>
                  </div>

                  <div className="space-y-2 text-xs">
                    <div className="bg-[#FAF9F5] border border-[#E6EAE0] rounded-xl p-3 space-y-1">
                      <div className="text-[#788A7D]">Previous Draft Spec</div>
                      <div className="font-mono text-[#687A6D] line-through decoration-[#9BA99F] break-words">
                        {entry.oldSpec}
                      </div>
                    </div>
                    <div className="flex justify-center text-[#8C9C91]" aria-hidden="true">
                      <ArrowRight className="w-3.5 h-3.5 rotate-90" />
                    </div>
                    <div className="bg-[#F2F7EE] border border-[#C6DBC2] rounded-xl p-3 space-y-1">
                      <div className="text-[#2E6B40] font-semibold">Verified 2026 Target</div>
                      <div className="font-mono text-[#1E3124] break-words">
                        {entry.verified2026}
                      </div>
                    </div>
                  </div>

                  <p className="text-sm text-[#526658] leading-relaxed">{entry.summary}</p>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs text-[#526658]">
                      <span className="inline-flex items-center gap-1.5">
                        <Terminal className="w-3.5 h-3.5" aria-hidden="true" />
                        Install Command
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCopy(`${entry.id}-cmd`, entry.installCmd)}
                        className="inline-flex items-center gap-1 text-xs text-[#526658] hover:text-[#1E3124] transition-colors cursor-pointer whitespace-nowrap"
                        aria-label={`Copy install command for ${entry.layer}`}
                      >
                        {copiedId === `${entry.id}-cmd` ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-[#2E6B40]" />
                            <span className="text-[#2E6B40] font-semibold">Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>Copy</span>
                          </>
                        )}
                      </button>
                    </div>
                    <pre className="bg-[#1C2820] border border-[#2B3A30] rounded-xl p-3 text-xs font-mono text-[#CFECC8] overflow-x-auto">
                      <code>{entry.installCmd}</code>
                    </pre>
                  </div>
                </div>

                <div className="xl:col-span-7 flex flex-col">
                  <div className="flex items-center justify-between px-3.5 py-2.5 bg-[#233228] border border-[#2B3A30] border-b-0 rounded-t-xl text-xs text-[#C7D6CA]">
                    <span className="font-mono">
                      {track === 'web3v1' && entry.snippetWeb3v1
                        ? 'Reference Pattern · Web3.js v1'
                        : 'Reference Pattern · 2026 Recommended'}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopy(`${entry.id}-code`, activeSnippet)}
                      className="inline-flex items-center gap-1.5 text-xs text-[#C7D6CA] hover:text-white transition-colors cursor-pointer whitespace-nowrap"
                      aria-label={`Copy code snippet for ${entry.layer}`}
                    >
                      {copiedId === `${entry.id}-code` ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-[#B6F09C]" />
                          <span className="text-[#B6F09C]">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copy Snippet</span>
                        </>
                      )}
                    </button>
                  </div>
                  <pre className="flex-1 bg-[#1C2820] border border-[#2B3A30] rounded-b-xl p-4 text-xs font-mono text-[#EEF3EC] leading-relaxed overflow-x-auto">
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
