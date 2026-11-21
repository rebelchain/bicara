'use client';

import { useState } from 'react';
import {
  ArrowRight,
  Check,
  CheckCircle2,
  Copy,
  Layers,
  ShieldAlert,
  Terminal,
  Zap,
} from 'lucide-react';
import {
  HACKATHON_PROVENANCE_ROWS,
  HARDWARE_MEASUREMENT_ROWS,
  HONEST_KNOWN_LIMITATIONS,
  SDK_AUDIT_ENTRIES,
} from '@/lib/sdk-audit-data';

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
    <section
      aria-label="Architecture, Hackathon Provenance Audit, and 2026 SDK Matrix"
      className="space-y-8"
    >
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 pb-6 border-b border-[#E2E6DC]">
        <div className="space-y-2 max-w-2xl">
          <p className="text-xs font-semibold text-[#457249]">
            accessible-signing Architecture · Measured on OPPO Android 16 · Voice Identifies,
            Hardware Authorizes
          </p>
          <h2 className="font-display text-2xl sm:text-3xl font-black tracking-tight text-[#1E3124] [text-wrap:balance]">
            Architecture, Measured Benchmarks &amp; Hackathon Transparency Audit
          </h2>
          <p className="text-sm sm:text-[15px] text-[#526658] leading-relaxed">
            Every figure below reflects real physical hardware measurements from OPPO CPH2631
            (Android 16) and separates pre-hackathon prototyping from Dev3pack hackathon commits
            after the <span className="font-mono text-[#1E3124]">hackathon-start</span> tag.
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
            Mobile: @solana/kit
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
            Web Demo: @solana/web3.js
          </button>
        </div>
      </div>

      {/* Measured Summary Strip (Zero fabricated numbers) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border border-[#E2E6DC] rounded-2xl p-5 space-y-1.5 shadow-[0_6px_20px_rgba(30,49,36,0.04)]">
          <div className="flex items-center justify-between text-xs text-[#526658]">
            <span>Measured STT + TTS (OPPO Android 16)</span>
            <Zap className="w-4 h-4 text-[#356341]" aria-hidden="true" />
          </div>
          <p className="text-base font-bold text-[#1E3124] font-mono tabular-nums">
            760–774ms STT · 558–732ms TTS
          </p>
          <p className="text-xs text-[#526658] leading-relaxed">
            Live over USB adb reverse using ElevenLabs scribe_v2 (dynamic keyterms) and
            eleven_flash_v2_5 (warm).
          </p>
        </div>

        <div className="bg-white border border-[#E2E6DC] rounded-2xl p-5 space-y-1.5 shadow-[0_6px_20px_rgba(30,49,36,0.04)]">
          <div className="flex items-center justify-between text-xs text-[#526658]">
            <span>Measured Jupiter V2 Quote-Only</span>
            <Layers className="w-4 h-4 text-[#356341]" aria-hidden="true" />
          </div>
          <p className="text-base font-bold text-[#1E3124] font-mono tabular-nums">
            724ms E2E · 322ms Server
          </p>
          <p className="text-xs text-[#526658] leading-relaxed">
            Strict USDC ↔ SOL allowlist (transaction: null). Unverified token XYZ blocked with HTTP
            403.
          </p>
        </div>

        <div className="bg-white border border-[#E2E6DC] rounded-2xl p-5 space-y-1.5 shadow-[0_6px_20px_rgba(30,49,36,0.04)]">
          <div className="flex items-center justify-between text-xs text-[#526658]">
            <span>Security Posture (Honest Disclosure)</span>
            <ShieldAlert className="w-4 h-4 text-[#B45309]" aria-hidden="true" />
          </div>
          <p className="text-base font-bold text-[#1E3124]">
            Layers 2–5 Active · Eagle Deferred
          </p>
          <p className="text-xs text-[#526658] leading-relaxed">
            Optional Layer 1 voiceprint deferred post-Gate B; external Solflare popup requires sight
            to approve.
          </p>
        </div>
      </div>

      {/* Section 1: Transparent Provenance Table (Built Before vs During Hackathon) */}
      <div className="bg-white border border-[#E2E6DC] rounded-2xl p-5 sm:p-6 space-y-4 shadow-[0_6px_20px_rgba(30,49,36,0.04)]">
        <div className="space-y-1 pb-3 border-b border-[#E9EDE3]">
          <h3 className="text-base font-bold text-[#1E3124]">
            01. Hackathon Provenance Split (Built Before vs. During Hackathon)
          </h3>
          <p className="text-xs text-[#526658]">
            Mirrored verbatim from root <span className="font-mono text-[#1E3124]">README.md</span>{' '}
            and <span className="font-mono text-[#1E3124]">bicara-docs/PROGRESS.md</span> · MIT
            License.
          </p>
        </div>

        <div className="divide-y divide-[#ECEFE6]">
          {HACKATHON_PROVENANCE_ROWS.map((row) => (
            <div
              key={row.bucket}
              className="py-4 first:pt-1 last:pb-0 grid grid-cols-1 lg:grid-cols-12 gap-3 text-xs"
            >
              <div className="lg:col-span-3 space-y-0.5">
                <p className="font-bold text-sm text-[#1E3124]">{row.bucket}</p>
                <p className="font-mono text-[11px] text-[#526658]">{row.window}</p>
              </div>
              <div className="lg:col-span-6 text-[#3B4F40] leading-relaxed">{row.scope}</div>
              <div className="lg:col-span-3 lg:text-right font-mono font-semibold text-[#2E6B40]">
                {row.status}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Section 2: Real Hardware Measurement Log + Honest Limitations */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        <div className="xl:col-span-7 bg-white border border-[#E2E6DC] rounded-2xl p-5 sm:p-6 space-y-4 shadow-[0_6px_20px_rgba(30,49,36,0.04)]">
          <div className="space-y-1 pb-3 border-b border-[#E9EDE3]">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#356341]" aria-hidden="true" />
              <h3 className="text-base font-bold text-[#1E3124]">
                02. Physical Hardware Measurement Log (OPPO CPH2631 · Android 16)
              </h3>
            </div>
            <p className="text-xs text-[#526658]">
              Real recorded results from Gate A &amp; current Gate B readiness.
            </p>
          </div>

          <div className="divide-y divide-[#ECEFE6]">
            {HARDWARE_MEASUREMENT_ROWS.map((item) => {
              const statusColor =
                item.status === 'PASS'
                  ? 'text-[#2E6B40]'
                  : item.status === 'MEASURED'
                    ? 'text-[#1D4ED8]'
                    : item.status === 'DEFERRED'
                      ? 'text-[#B45309]'
                      : 'text-[#356341]';
              return (
                <div key={item.check} className="py-3 first:pt-0 last:pb-0 space-y-1 text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-[#1E3124]">{item.check}</span>
                    <span className={`font-mono font-bold shrink-0 ${statusColor}`}>
                      {item.status}
                    </span>
                  </div>
                  <p className="text-[#526658] leading-relaxed">{item.measuredValue}</p>
                </div>
              );
            })}
          </div>
        </div>

        <div className="xl:col-span-5 bg-[#FAF7F0] border border-[#E6DFC8] rounded-2xl p-5 sm:p-6 space-y-4">
          <div className="space-y-1 pb-3 border-b border-[#EAE3CE]">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-[#B45309]" aria-hidden="true" />
              <h3 className="text-base font-bold text-[#1E3124]">
                03. Honest Known Limitations
              </h3>
            </div>
            <p className="text-xs text-[#6B5D3E]">
              Explicit disclosures so judges evaluate real engineering rather than pitch hype.
            </p>
          </div>

          <div className="divide-y divide-[#EDE6D4]">
            {HONEST_KNOWN_LIMITATIONS.map((lim) => (
              <div key={lim.title} className="py-3.5 first:pt-0 last:pb-0 space-y-1 text-xs">
                <p className="font-bold text-[#1E3124]">{lim.title}</p>
                <p className="text-[#526658] leading-relaxed">{lim.reality}</p>
                <p className="text-[#356341] leading-relaxed font-medium">
                  Mitigation: {lim.mitigation}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Section 4: Verified 2026 SDK Audit Cards */}
      <div className="space-y-4">
        <div className="space-y-1">
          <h3 className="text-base font-bold text-[#1E3124]">
            04. Verified 2026 SDK &amp; Security Layer Breakdown
          </h3>
          <p className="text-xs text-[#526658]">
            Exact packages, protocol boundaries, and live code patterns running in /mobile and web.
          </p>
        </div>

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
                    <div className="flex flex-wrap items-center gap-2 text-xs text-[#526658]">
                      <span className="font-mono tabular-nums">0{idx + 1}.</span>
                      <span className={`font-semibold ${impactColor}`}>{entry.impact}</span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono text-[#2E6B40]">{entry.measuredStatus}</span>
                    </div>
                    <h4 className="text-lg font-bold text-[#1E3124]">{entry.layer}</h4>
                  </div>

                  <div className="space-y-2 text-xs">
                    <div className="bg-[#FAF9F5] border border-[#E6EAE0] rounded-xl p-3 space-y-1">
                      <div className="text-[#788A7D]">Previous Approach</div>
                      <div className="font-mono text-[#687A6D] line-through decoration-[#9BA99F] break-words">
                        {entry.oldSpec}
                      </div>
                    </div>
                    <div className="flex justify-center text-[#8C9C91]" aria-hidden="true">
                      <ArrowRight className="w-3.5 h-3.5 rotate-90" />
                    </div>
                    <div className="bg-[#F2F7EE] border border-[#C6DBC2] rounded-xl p-3 space-y-1">
                      <div className="text-[#2E6B40] font-semibold">Current Verified Implementation</div>
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
                        Command
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCopy(`${entry.id}-cmd`, entry.installCmd)}
                        className="inline-flex items-center gap-1 text-xs text-[#526658] hover:text-[#1E3124] transition-colors cursor-pointer whitespace-nowrap"
                        aria-label={`Copy command for ${entry.layer}`}
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
                        ? 'Web Demo Pattern · @solana/web3.js'
                        : 'Mobile Pattern · @solana/kit'}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopy(`${entry.id}-code`, activeSnippet)}
                      className="inline-flex items-center gap-1 text-xs text-[#D8E5DA] hover:text-white transition-colors cursor-pointer whitespace-nowrap"
                      aria-label={`Copy code pattern for ${entry.layer}`}
                    >
                      {copiedId === `${entry.id}-code` ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-[#B6F09C]" />
                          <span className="text-[#B6F09C]">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copy Pattern</span>
                        </>
                      )}
                    </button>
                  </div>
                  <pre className="flex-1 bg-[#1C2820] border border-[#2B3A30] rounded-b-xl p-4 text-xs font-mono text-[#EEF3EC] overflow-x-auto leading-relaxed">
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
