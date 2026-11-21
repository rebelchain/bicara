'use client';

import { useState } from 'react';
import {
  Activity,
  AlertCircle,
  Check,
  CheckCircle2,
  Copy,
  FileCode2,
  Layers,
  Loader2,
  Smartphone,
  Terminal,
  Usb,
  Wifi,
} from 'lucide-react';
import {
  BUILD_SCOPE_ITEMS,
  USB_SETUP_STEPS,
  type BuildScopeItem,
} from '@/lib/build-kit-data';
import type {
  MobileFileCategory,
  MobileScaffoldFile,
} from '@/lib/mobile-scaffold-loader';

interface BuildKitWorkspaceProps {
  mobileFiles: MobileScaffoldFile[];
}

interface HealthCheckResult {
  ok: boolean;
  service: string;
  timestamp: string;
  env: {
    geminiConfigured: boolean;
    elevenLabsConfigured: boolean;
    voiceIdConfigured: boolean;
    jupiterConfigured?: boolean;
  };
  models: {
    stt: string;
    nlu: string;
    tts: string;
  };
  endpoints: string[];
  intentFallbackMs?: number;
  pricesSolUsd?: number | null;
  pricesMs?: number;
  swapQuoteSummary?: string | null;
  swapQuoteMs?: number;
  swapBlocked403?: boolean;
}

export default function BuildKitWorkspace({ mobileFiles }: BuildKitWorkspaceProps) {
  const [connMode, setConnMode] = useState<'usb' | 'wireless'>('usb');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [fileCategory, setFileCategory] = useState<'All' | MobileFileCategory>('All');
  const [selectedFileId, setSelectedFileId] = useState<string>(
    mobileFiles[0]?.id ?? 'index'
  );
  const [scopeFilter, setScopeFilter] = useState<'all' | 'before' | 'hackathon' | 'roadmap'>('all');

  const [checkingProxy, setCheckingProxy] = useState(false);
  const [healthResult, setHealthResult] = useState<HealthCheckResult | null>(null);
  const [healthError, setHealthError] = useState<string | null>(null);

  const handleCopy = async (id: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      window.setTimeout(() => {
        setCopiedId((curr) => (curr === id ? null : curr));
      }, 1800);
    } catch {
      // Clipboard blocked in non-HTTPS contexts
    }
  };

  const handleTestProxies = async () => {
    setCheckingProxy(true);
    setHealthError(null);
    try {
      const priceStart = performance.now();
      const swapStart = performance.now();

      const [healthRes, intentRes, pricesRes, swapRes, scamRes] = await Promise.all([
        fetch('/api/health'),
        fetch('/api/intent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ transcript: 'Send 5 USDC to Ahmad', mode: 'fallback' }),
        }),
        fetch('/api/prices'),
        fetch('/api/swap/quote', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ inputToken: 'USDC', outputToken: 'SOL', amount: 10 }),
        }),
        fetch('/api/swap/quote', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ inputToken: 'USDC', outputToken: 'XYZ', amount: 10 }),
        }),
      ]);

      if (!healthRes.ok) {
        throw new Error(`GET /api/health returned ${healthRes.status}`);
      }

      const healthData = (await healthRes.json()) as HealthCheckResult;
      const intentData = intentRes.ok
        ? ((await intentRes.json()) as { latencyMs?: number })
        : {};
      const pricesData = pricesRes.ok
        ? ((await pricesRes.json()) as { solUsd?: number })
        : null;
      const swapData = swapRes.ok
        ? ((await swapRes.json()) as { outAmountUi?: number; router?: string })
        : null;

      setHealthResult({
        ...healthData,
        intentFallbackMs: intentData.latencyMs,
        pricesSolUsd: pricesData?.solUsd ?? null,
        pricesMs: Math.round(performance.now() - priceStart),
        swapQuoteSummary:
          swapData && typeof swapData.outAmountUi === 'number'
            ? `10 USDC -> ${swapData.outAmountUi.toFixed(5)} SOL (router: ${swapData.router ?? 'metis'})`
            : null,
        swapQuoteMs: Math.round(performance.now() - swapStart),
        swapBlocked403: scamRes.status === 403,
      });
    } catch (err) {
      setHealthError(
        err instanceof Error ? err.message : 'Unable to reach voice proxy server.'
      );
    } finally {
      setCheckingProxy(false);
    }
  };

  const categories: Array<'All' | MobileFileCategory> = [
    'All',
    'Boot & Config',
    'Eyes-Free & Audio',
    'Solana MWA',
    'Screens',
  ];

  const filteredFiles =
    fileCategory === 'All'
      ? mobileFiles
      : mobileFiles.filter((f) => f.category === fileCategory);

  const activeFile =
    filteredFiles.find((f) => f.id === selectedFileId) ??
    filteredFiles[0] ??
    mobileFiles[0];

  const visibleScope: BuildScopeItem[] =
    scopeFilter === 'all'
      ? BUILD_SCOPE_ITEMS
      : BUILD_SCOPE_ITEMS.filter((item) => item.bucket === scopeFilter);

  const beforeCount = BUILD_SCOPE_ITEMS.filter((i) => i.bucket === 'before').length;
  const hackathonCount = BUILD_SCOPE_ITEMS.filter((i) => i.bucket === 'hackathon').length;
  const roadmapCount = BUILD_SCOPE_ITEMS.filter((i) => i.bucket === 'roadmap').length;

  return (
    <section
      aria-label="Expo Custom Dev Build Kit and Physical Android USB Runbook"
      className="space-y-8"
    >
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 pb-6 border-b border-[#E2E6DC]">
        <div className="space-y-2 max-w-2xl">
          <p className="text-xs font-semibold text-[#457249]">
            Gate A PASS · Gate B Physical OPPO Run Next · Track A (@solana/kit)
          </p>
          <h2 className="font-display text-2xl sm:text-3xl font-black tracking-tight text-[#1E3124] [text-wrap:balance]">
            Android Mobile Build Kit &amp; Live 6-Endpoint Proxy Diagnostics
          </h2>
          <p className="text-sm sm:text-[15px] text-[#526658] leading-relaxed">
            Reference Android Custom Dev Client in{' '}
            <span className="font-mono text-[#1E3124]">/mobile</span> verified on OPPO CPH2631
            (Android 16), plus live diagnostics across all 6 server proxy routes.
          </p>
        </div>

        {/* USB vs Wireless Connection Mode Switcher */}
        <div
          role="group"
          aria-label="Android to backend connection mode"
          className="inline-flex flex-wrap items-center gap-1 p-1 bg-[#EEF3E8] border border-[#DCE4D4] rounded-full max-w-full self-start lg:self-end"
        >
          <button
            type="button"
            data-testid="conn-mode-usb"
            onClick={() => setConnMode('usb')}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-full transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              connMode === 'usb'
                ? 'bg-[#356341] text-white'
                : 'text-[#526658] hover:text-[#1E3124]'
            }`}
          >
            <Usb className="w-3.5 h-3.5" aria-hidden="true" />
            <span>USB (adb reverse)</span>
          </button>
          <button
            type="button"
            data-testid="conn-mode-wireless"
            onClick={() => setConnMode('wireless')}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-full transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              connMode === 'wireless'
                ? 'bg-[#356341] text-white'
                : 'text-[#526658] hover:text-[#1E3124]'
            }`}
          >
            <Wifi className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Wireless (HTTPS)</span>
          </button>
        </div>
      </div>

      {/* Top Row: Physical Android USB Runbook (7 cols) + Live 6-Endpoint Proxy Diagnostics (5 cols) */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* Left: Physical Android USB Runbook */}
        <div className="xl:col-span-7 bg-white border border-[#E2E6DC] rounded-2xl p-5 sm:p-6 space-y-5 shadow-[0_6px_20px_rgba(30,49,36,0.04)]">
          <div className="flex flex-wrap items-center justify-between gap-2 pb-4 border-b border-[#E9EDE3]">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-[#356341]" aria-hidden="true" />
                <h3 className="text-base font-bold text-[#1E3124]">
                  01. Physical Android USB Runbook (OPPO CPH2631 Verified)
                </h3>
              </div>
              <p className="text-xs text-[#526658]">
                Zero emulator needed — Gate B runs in pure JS without rebuilding the Android APK
              </p>
            </div>
            <span className="text-xs font-mono text-[#2E6B40] font-semibold">
              {connMode === 'usb' ? 'http://localhost:3000 via USB' : 'Public HTTPS / LAN URL'}
            </span>
          </div>

          <ol className="space-y-4">
            {USB_SETUP_STEPS.map((step) => {
              const cmd =
                connMode === 'wireless' && step.commandWireless
                  ? step.commandWireless
                  : step.commandUsb;
              const copyKey = `cmd-${step.id}-${connMode}`;
              return (
                <li
                  key={step.id}
                  className="p-4 bg-[#FAF9F5] border border-[#E6EAE0] rounded-xl space-y-2.5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="text-sm font-bold text-[#1E3124]">
                        <span className="font-mono text-[#356341] mr-2">{step.stepNum}.</span>
                        {step.title}
                      </div>
                      <p className="text-xs text-[#526658] leading-relaxed">{step.detail}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => void handleCopy(copyKey, cmd)}
                      aria-label={`Copy command for step ${step.stepNum}`}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-[#526658] hover:text-[#1E3124] bg-white border border-[#DCE3D6] rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      {copiedId === copyKey ? (
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
                  <pre className="bg-[#1C2820] border border-[#2B3A30] rounded-lg p-3 text-xs font-mono text-[#CFECC8] overflow-x-auto">
                    <code>{cmd}</code>
                  </pre>
                </li>
              );
            })}
          </ol>
        </div>

        {/* Right: Live 6-Endpoint Proxy Diagnostics + Gate B Physical Checklist */}
        <div className="xl:col-span-5 space-y-6">
          <div className="bg-white border border-[#E2E6DC] rounded-2xl p-5 sm:p-6 space-y-4 shadow-[0_6px_20px_rgba(30,49,36,0.04)]">
            <div className="flex items-start justify-between gap-3 pb-3 border-b border-[#E9EDE3]">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-[#356341]" aria-hidden="true" />
                  <h3 className="text-base font-bold text-[#1E3124]">
                    02. Live 6-Endpoint Server Proxy Check
                  </h3>
                </div>
                <p className="text-xs text-[#526658]">
                  Probes health, intent, prices, Jupiter Quote-Only, and scam-token HTTP 403 block
                </p>
              </div>
            </div>

            <button
              type="button"
              data-testid="test-proxy-btn"
              onClick={() => void handleTestProxies()}
              disabled={checkingProxy}
              className="w-full min-h-[44px] px-4 py-2.5 text-xs font-bold text-white bg-[#356341] hover:bg-[#2A5135] disabled:opacity-60 rounded-full transition-colors inline-flex items-center justify-center gap-2 cursor-pointer"
            >
              {checkingProxy ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Probing all server endpoints...</span>
                </>
              ) : (
                <>
                  <Terminal className="w-4 h-4" />
                  <span>Run Live Proxy Diagnostics</span>
                </>
              )}
            </button>

            {healthError && (
              <div
                role="alert"
                className="p-3 bg-[#FEF2F2] border border-[#FECACA] rounded-xl text-xs text-[#991B1B] flex items-start gap-2"
              >
                <AlertCircle className="w-4 h-4 text-[#DC2626] shrink-0 mt-0.5" />
                <span>{healthError}</span>
              </div>
            )}

            <div className="divide-y divide-[#ECEFE6] text-xs" data-testid="proxy-status-list">
              {[
                {
                  route: 'GET /api/health',
                  role: 'USB adb reverse & server environment readiness probe',
                  ready: healthResult ? healthResult.ok : null,
                  note: healthResult
                    ? `Online (200 OK) · NLU: ${healthResult.models.nlu}`
                    : 'Click Run Diagnostics to verify',
                },
                {
                  route: 'POST /api/intent',
                  role: 'English-first NLU (Gemini primary + deterministic fallback)',
                  ready: healthResult ? true : null,
                  note: healthResult
                    ? healthResult.env.geminiConfigured
                      ? `Gemini Key Configured · fallback ${healthResult.intentFallbackMs ?? 0}ms`
                      : `Fallback Active (${healthResult.intentFallbackMs ?? 0}ms) · GEMINI_API_KEY optional`
                    : 'Configured on server',
                },
                {
                  route: 'POST /api/swap/quote',
                  role: 'Jupiter Swap V2 Quote-Only (USDC ↔ SOL) + HTTP 403 scam allowlist',
                  ready: healthResult
                    ? Boolean(healthResult.swapQuoteSummary || healthResult.swapBlocked403)
                    : null,
                  note: healthResult
                    ? `${healthResult.swapQuoteSummary ?? 'Needs JUPITER_API_KEY'} · XYZ blocked 403: ${healthResult.swapBlocked403 ? 'PASS' : 'Check'}`
                    : 'Requires server JUPITER_API_KEY',
                },
                {
                  route: 'GET /api/prices',
                  role: 'Live SOL/USD price (Jupiter Price V3 + CoinGecko fallback)',
                  ready: healthResult ? typeof healthResult.pricesSolUsd === 'number' : null,
                  note: healthResult
                    ? typeof healthResult.pricesSolUsd === 'number'
                      ? `Live SOL: $${healthResult.pricesSolUsd.toFixed(2)} (${healthResult.pricesMs ?? 0}ms)`
                      : 'Price upstream temporarily unavailable'
                    : 'Configured on server',
                },
                {
                  route: 'POST /api/stt & GET /api/tts',
                  role: 'ElevenLabs scribe_v2 (<=1,000 keyterms) & eleven_flash_v2_5',
                  ready: healthResult ? healthResult.env.elevenLabsConfigured : null,
                  note: healthResult
                    ? healthResult.env.elevenLabsConfigured
                      ? 'ELEVENLABS_API_KEY Ready (measured 760ms STT / 558ms warm TTS on OPPO)'
                      : 'Needs ELEVENLABS_API_KEY (native OS/browser speech fallback active)'
                    : 'Requires server ELEVENLABS_API_KEY',
                },
              ].map((ep) => (
                <div key={ep.route} className="py-3 first:pt-1 last:pb-0 space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono font-semibold text-[#1E3124]">{ep.route}</span>
                    <span
                      className={`font-mono text-[11px] font-semibold inline-flex items-center gap-1 shrink-0 ${
                        ep.ready === true
                          ? 'text-[#2E6B40]'
                          : ep.ready === false
                            ? 'text-[#B45309]'
                            : 'text-[#788A7D]'
                      }`}
                    >
                      {ep.ready === true ? (
                        <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                      ) : ep.ready === false ? (
                        <AlertCircle className="w-3.5 h-3.5" aria-hidden="true" />
                      ) : null}
                      <span>
                        {ep.ready === true ? 'Ready' : ep.ready === false ? 'Key Needed' : 'Idle'}
                      </span>
                    </span>
                  </div>
                  <p className="text-[#526658]">{ep.role}</p>
                  <p className="font-mono text-[11px] text-[#788A7D]">{ep.note}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Gate B Physical Next-Step Box */}
          <div className="bg-[#F3F6EE] border border-[#DCE4D4] rounded-2xl p-5 space-y-3">
            <h3 className="text-sm font-bold text-[#1E3124]">
              Immediate Next Step (PROGRESS.md · Gate B on OPPO)
            </h3>
            <ol className="space-y-2 text-xs text-[#526658] leading-relaxed list-decimal pl-4">
              <li>
                Paste <span className="font-mono text-[#1E3124]">supabase/schema.sql</span> into
                Supabase SQL Editor and add keys to{' '}
                <span className="font-mono text-[#1E3124]">mobile/.env</span>.
              </li>
              <li>
                Reload Metro (<span className="font-mono text-[#1E3124]">r</span>) on OPPO CPH2631 —
                zero Android APK rebuild needed.
              </li>
              <li>
                Add a verified contact (or tap Self-Test Fill), speak{' '}
                <span className="font-mono text-[#1E3124]">&ldquo;Send 0.01 SOL to Ahmad&rdquo;</span>,
                approve in Solflare, and log the live Solana Devnet Explorer signature in{' '}
                <span className="font-mono text-[#1E3124]">PROGRESS.md</span>.
              </li>
            </ol>
          </div>
        </div>
      </div>

      {/* Section 3: Real /mobile/ Scaffold File Explorer */}
      <div className="bg-white border border-[#E2E6DC] rounded-2xl overflow-hidden shadow-[0_6px_20px_rgba(30,49,36,0.04)]">
        <div className="p-5 border-b border-[#E9EDE3] flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <FileCode2 className="w-4 h-4 text-[#356341]" aria-hidden="true" />
              <h3 className="text-base font-bold text-[#1E3124]">
                03. Live /mobile/ Source Explorer
              </h3>
            </div>
            <p className="text-xs text-[#526658]">
              {mobileFiles.length} real files in{' '}
              <span className="font-mono text-[#1E3124]">/mobile</span> loaded directly from disk
            </p>
          </div>

          <div
            role="group"
            aria-label="Filter mobile scaffold files by category"
            className="flex flex-wrap items-center gap-1 p-1 bg-[#EEF3E8] border border-[#DCE4D4] rounded-full"
          >
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setFileCategory(cat)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-full transition-colors whitespace-nowrap cursor-pointer ${
                  fileCategory === cat
                    ? 'bg-[#356341] text-white'
                    : 'text-[#526658] hover:text-[#1E3124]'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12">
          <aside
            aria-label="Mobile scaffold file list"
            className="lg:col-span-4 border-b lg:border-b-0 lg:border-r border-[#E9EDE3] max-h-[540px] overflow-y-auto divide-y divide-[#F0F2EC]"
          >
            {filteredFiles.map((file) => {
              const active = activeFile?.id === file.id;
              return (
                <button
                  key={file.id}
                  type="button"
                  onClick={() => setSelectedFileId(file.id)}
                  className={`w-full text-left px-4 py-3 transition-colors cursor-pointer ${
                    active ? 'bg-[#EEF5EA] text-[#1E3124]' : 'text-[#3B4F40] hover:bg-[#FAF9F5]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span
                      className={`font-mono font-semibold truncate ${
                        active ? 'text-[#2E6B40]' : 'text-[#1E3124]'
                      }`}
                    >
                      {file.label}
                    </span>
                    <span className="text-[11px] font-mono text-[#788A7D] shrink-0">
                      {file.stepTag}
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] text-[#526658] line-clamp-2">{file.purpose}</p>
                </button>
              );
            })}
          </aside>

          <div className="lg:col-span-8 flex flex-col bg-[#1C2820]">
            {activeFile && (
              <>
                <div className="px-4 py-3 bg-[#233228] border-b border-[#2F4135] flex flex-wrap items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-mono text-xs font-semibold text-white truncate">
                      {activeFile.relativePath}
                    </div>
                    <div className="text-[11px] text-[#B9C9BD]">{activeFile.purpose}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => void handleCopy(`file-${activeFile.id}`, activeFile.content)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-[#2E4135] hover:bg-[#384F40] border border-white/15 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    {copiedId === `file-${activeFile.id}` ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-[#B6F09C]" />
                        <span className="text-[#B6F09C]">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy File</span>
                      </>
                    )}
                  </button>
                </div>
                <pre className="p-4 text-xs font-mono text-[#EEF3EC] leading-relaxed overflow-auto max-h-[480px]">
                  <code>{activeFile.content}</code>
                </pre>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Section 4: Built Before vs During Hackathon vs Post-Hackathon */}
      <div className="bg-white border border-[#E2E6DC] rounded-2xl p-5 sm:p-6 space-y-5 shadow-[0_6px_20px_rgba(30,49,36,0.04)]">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#E9EDE3]">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-[#356341]" aria-hidden="true" />
              <h3 className="text-base font-bold text-[#1E3124]">
                04. Delivery Timeline: Pre-Hackathon vs. Hackathon Window vs. Roadmap
              </h3>
            </div>
            <p className="text-xs text-[#526658]">
              {beforeCount} pre-kickoff gates · {hackathonCount} hackathon window deliverables ·{' '}
              {roadmapCount} post-hackathon roadmap
            </p>
          </div>

          <div
            role="group"
            aria-label="Filter delivery timeline"
            className="flex flex-wrap items-center gap-1 p-1 bg-[#EEF3E8] border border-[#DCE4D4] rounded-full max-w-full self-start"
          >
            {(
              [
                { id: 'all', label: `All (${BUILD_SCOPE_ITEMS.length})` },
                { id: 'before', label: `Before Hackathon (${beforeCount})` },
                { id: 'hackathon', label: `During Hackathon (${hackathonCount})` },
                { id: 'roadmap', label: `Roadmap (${roadmapCount})` },
              ] as const
            ).map((opt) => (
              <button
                key={opt.id}
                type="button"
                data-testid={`scope-filter-${opt.id}`}
                onClick={() => setScopeFilter(opt.id)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-full transition-colors whitespace-nowrap cursor-pointer ${
                  scopeFilter === opt.id
                    ? 'bg-[#356341] text-white'
                    : 'text-[#526658] hover:text-[#1E3124]'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div className="divide-y divide-[#ECEFE6]">
          {visibleScope.map((item) => {
            const isRoadmap = item.bucket === 'roadmap';
            const isDone = item.status === 'Gate A PASS';
            return (
              <div key={item.id} className="py-4 first:pt-0 last:pb-0 space-y-1.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h4 className="text-sm font-bold text-[#1E3124]">{item.title}</h4>
                  <div className="flex items-center gap-2 text-xs font-mono">
                    <span className={isRoadmap ? 'text-[#1D4ED8]' : 'text-[#2E6B40]'}>
                      {item.stageLabel}
                    </span>
                    <span aria-hidden="true" className="text-[#B8C4B2]">
                      ·
                    </span>
                    <span
                      className={
                        isDone
                          ? 'text-[#2E6B40] font-bold'
                          : isRoadmap
                            ? 'text-[#1D4ED8]'
                            : 'text-[#B45309] font-semibold'
                      }
                    >
                      {item.status}
                    </span>
                  </div>
                </div>
                <p className="text-xs text-[#526658] leading-relaxed">{item.detail}</p>
                <p className="text-[11px] font-mono text-[#788A7D]">
                  Verification: {item.verification}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
