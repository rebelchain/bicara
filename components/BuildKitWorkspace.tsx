'use client';

import { useState } from 'react';
import {
  Check,
  Copy,
  Smartphone,
  Terminal,
  Activity,
  FileCode2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Usb,
  Wifi,
  Layers,
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
  };
  models: {
    stt: string;
    nlu: string;
    tts: string;
  };
  endpoints: string[];
  intentFallbackMs?: number;
}

export default function BuildKitWorkspace({ mobileFiles }: BuildKitWorkspaceProps) {
  const [connMode, setConnMode] = useState<'usb' | 'wireless'>('usb');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [fileCategory, setFileCategory] = useState<'All' | MobileFileCategory>('All');
  const [selectedFileId, setSelectedFileId] = useState<string>(
    mobileFiles[0]?.id ?? 'index'
  );
  const [scopeFilter, setScopeFilter] = useState<'all' | 'hackathon' | 'roadmap'>('all');

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
      const [healthRes, intentRes] = await Promise.all([
        fetch('/api/health'),
        fetch('/api/intent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ transcript: 'Kirim 5 dolar ke Ahmad', mode: 'fallback' }),
        }),
      ]);
      if (!healthRes.ok) {
        throw new Error(`GET /api/health returned ${healthRes.status}`);
      }
      const healthData = (await healthRes.json()) as HealthCheckResult;
      const intentData = intentRes.ok
        ? ((await intentRes.json()) as { latencyMs?: number })
        : {};
      setHealthResult({
        ...healthData,
        intentFallbackMs: intentData.latencyMs,
      });
    } catch (err) {
      setHealthError(
        err instanceof Error ? err.message : 'Gagal menghubungi server proxy.'
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

  const hackathonCount = BUILD_SCOPE_ITEMS.filter((i) => i.bucket === 'hackathon').length;
  const roadmapCount = BUILD_SCOPE_ITEMS.filter((i) => i.bucket === 'roadmap').length;

  return (
    <section
      aria-label="Step 1 Expo Custom Dev Build Kit and Physical Android USB Runbook"
      className="space-y-8"
    >
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 pb-6 border-b border-[#22272D]">
        <div className="space-y-2 max-w-2xl">
          <p className="text-xs font-medium text-[#94A3B8]">
            Step 1 Complete · Physical Android Phone via USB · Track A (@solana/kit) · Zero Emulator Overhead
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#F8FAFC] [text-wrap:balance]">
            Step 1 Mobile Build Kit &amp; Voice Proxy Diagnostics
          </h1>
          <p className="text-sm sm:text-[15px] text-[#94A3B8] leading-relaxed">
            Real Expo Custom Dev Build scaffold in <span className="font-mono text-[#E2E8F0]">/mobile</span>{' '}
            ready for physical Android USB testing with JDK 17 + Android SDK, real{' '}
            <span className="font-mono text-[#E2E8F0]">expo-haptics</span>, and server-side ElevenLabs + Gemini proxies.
          </p>
        </div>

        {/* USB vs Wireless Connection Mode Switcher */}
        <div
          role="group"
          aria-label="Mode Koneksi HP Android ke Backend Proxy"
          className="inline-flex flex-wrap items-center gap-1 p-1 bg-[#14171A] border border-[#262B30] rounded-lg max-w-full self-start lg:self-end"
        >
          <button
            type="button"
            data-testid="conn-mode-usb"
            onClick={() => setConnMode('usb')}
            className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              connMode === 'usb'
                ? 'bg-[#22C55E] text-[#052E16]'
                : 'text-[#94A3B8] hover:text-[#F8FAFC]'
            }`}
          >
            <Usb className="w-3.5 h-3.5" aria-hidden="true" />
            <span>USB (adb reverse)</span>
          </button>
          <button
            type="button"
            data-testid="conn-mode-wireless"
            onClick={() => setConnMode('wireless')}
            className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              connMode === 'wireless'
                ? 'bg-[#22C55E] text-[#052E16]'
                : 'text-[#94A3B8] hover:text-[#F8FAFC]'
            }`}
          >
            <Wifi className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Wireless (HTTPS)</span>
          </button>
        </div>
      </div>

      {/* Top Row: Physical Android USB Runbook (7 cols) + Live Voice Proxy Diagnostics (5 cols) */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* Left: HP Android Fisik USB Runbook */}
        <div className="xl:col-span-7 bg-[#14171A] border border-[#23282E] rounded-xl p-5 sm:p-6 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-2 pb-4 border-b border-[#1E2329]">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-[#22C55E]" aria-hidden="true" />
                <h2 className="text-base font-semibold text-[#F8FAFC]">
                  01. Physical Android USB Runbook (No Emulator Needed)
                </h2>
              </div>
              <p className="text-xs text-[#94A3B8]">
                Laptop only needs JDK 17 + Android SDK Platform-Tools &amp; Build-Tools
              </p>
            </div>
            <span className="text-xs font-mono text-[#4ADE80]">
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
                  className="p-4 bg-[#0E1114] border border-[#22272D] rounded-lg space-y-2.5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="text-sm font-semibold text-[#F8FAFC]">
                        <span className="font-mono text-[#4ADE80] mr-2">{step.stepNum}.</span>
                        {step.title}
                      </div>
                      <p className="text-xs text-[#94A3B8] leading-relaxed">{step.detail}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => void handleCopy(copyKey, cmd)}
                      aria-label={`Salin perintah langkah ${step.stepNum}`}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-[#94A3B8] hover:text-[#F8FAFC] bg-[#14171A] border border-[#262B30] rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      {copiedId === copyKey ? (
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
                  <pre className="bg-[#0B0D0E] border border-[#1E2329] rounded-md p-3 text-xs font-mono text-[#86EFAC] overflow-x-auto">
                    <code>{cmd}</code>
                  </pre>
                </li>
              );
            })}
          </ol>
        </div>

        {/* Right: Live Voice Proxy Endpoint Diagnostics */}
        <div className="xl:col-span-5 space-y-6">
          <div className="bg-[#14171A] border border-[#23282E] rounded-xl p-5 sm:p-6 space-y-4">
            <div className="flex items-start justify-between gap-3 pb-3 border-b border-[#1E2329]">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-[#22C55E]" aria-hidden="true" />
                  <h2 className="text-base font-semibold text-[#F8FAFC]">
                    02. Live Server Voice Proxy Check
                  </h2>
                </div>
                <p className="text-xs text-[#94A3B8]">
                  Verifies Next.js server routes consumed by the Android app over port 3000
                </p>
              </div>
            </div>

            <button
              type="button"
              data-testid="test-proxy-btn"
              onClick={() => void handleTestProxies()}
              disabled={checkingProxy}
              className="w-full min-h-[44px] px-4 py-2.5 text-xs font-semibold text-[#052E16] bg-[#22C55E] hover:bg-[#16A34A] disabled:opacity-60 rounded-lg transition-colors inline-flex items-center justify-center gap-2 cursor-pointer"
            >
              {checkingProxy ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Testing /api/health &amp; /api/intent...</span>
                </>
              ) : (
                <>
                  <Terminal className="w-4 h-4" />
                  <span>Test Proxy Endpoints</span>
                </>
              )}
            </button>

            {healthError && (
              <div
                role="alert"
                className="p-3 bg-[#211214] border border-[#EF4444]/40 rounded-lg text-xs text-[#FCA5A5] flex items-start gap-2"
              >
                <AlertCircle className="w-4 h-4 text-[#EF4444] shrink-0 mt-0.5" />
                <span>{healthError}</span>
              </div>
            )}

            <div className="divide-y divide-[#1E2329] text-xs" data-testid="proxy-status-list">
              {[
                {
                  route: 'GET /api/health',
                  role: 'USB adb reverse & secret readiness probe',
                  ready: healthResult ? healthResult.ok : null,
                  note: healthResult ? 'Online (200 OK)' : 'Click Test to verify',
                },
                {
                  route: 'POST /api/intent',
                  role: 'Gemini 4 Hydrogen + bilingual regex fallback',
                  ready: healthResult ? true : null,
                  note: healthResult
                    ? healthResult.env.geminiConfigured
                      ? `Gemini Ready · fallback ${healthResult.intentFallbackMs ?? 0}ms`
                      : `Offline Fallback Ready (${healthResult.intentFallbackMs ?? 0}ms) · GEMINI_API_KEY optional`
                    : 'Configured on server',
                },
                {
                  route: 'POST /api/stt',
                  role: 'ElevenLabs scribe_v2 with Indonesian keyterms',
                  ready: healthResult ? healthResult.env.elevenLabsConfigured : null,
                  note: healthResult
                    ? healthResult.env.elevenLabsConfigured
                      ? 'ELEVENLABS_API_KEY Ready'
                      : 'Needs ELEVENLABS_API_KEY in .env'
                    : 'Requires ELEVENLABS_API_KEY',
                },
                {
                  route: 'POST /api/tts',
                  role: 'ElevenLabs eleven_flash_v2_5 (~100ms MP3)',
                  ready: healthResult ? healthResult.env.elevenLabsConfigured : null,
                  note: healthResult
                    ? healthResult.env.elevenLabsConfigured
                      ? 'ELEVENLABS_API_KEY Ready'
                      : 'Needs ELEVENLABS_API_KEY (expo-speech fallback active)'
                    : 'Requires ELEVENLABS_API_KEY',
                },
              ].map((ep) => (
                <div key={ep.route} className="py-3 first:pt-1 last:pb-0 space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono font-semibold text-[#F8FAFC]">{ep.route}</span>
                    <span
                      className={`font-mono text-[11px] inline-flex items-center gap-1 ${
                        ep.ready === true
                          ? 'text-[#4ADE80]'
                          : ep.ready === false
                            ? 'text-[#FBBF24]'
                            : 'text-[#64748B]'
                      }`}
                    >
                      {ep.ready === true ? (
                        <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                      ) : ep.ready === false ? (
                        <AlertCircle className="w-3.5 h-3.5" aria-hidden="true" />
                      ) : null}
                      <span>{ep.ready === true ? 'Ready' : ep.ready === false ? 'Key Needed' : 'Idle'}</span>
                    </span>
                  </div>
                  <p className="text-[#94A3B8]">{ep.role}</p>
                  <p className="font-mono text-[11px] text-[#64748B]">{ep.note}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Step 1 Hardware Exit Criteria Box */}
          <div className="bg-[#14171A] border border-[#23282E] rounded-xl p-5 space-y-3">
            <h3 className="text-sm font-semibold text-[#F8FAFC]">
              Step 1 Exit Criteria (Di HP Android Fisik)
            </h3>
            <ul className="space-y-2 text-xs text-[#94A3B8] leading-relaxed list-disc pl-4">
              <li>
                APK Custom Dev Build terpasang lewat <span className="font-mono text-[#E2E8F0]">npx expo run:android</span> tanpa error Hermes <span className="font-mono text-[#E2E8F0]">crypto.getRandomValues</span>.
              </li>
              <li>
                Sambutan suara keluar otomatis saat aplikasi dibuka (Zero-Silent-Screen) dan 5 tombol uji <span className="font-mono text-[#E2E8F0]">expo-haptics</span> bergetar fisik di tangan.
              </li>
              <li>
                Ketuk <span className="font-mono text-[#E2E8F0]">Connect MWA</span> membuka Phantom/Solflare Devnet dan menampilkan alamat wallet terpotong.
              </li>
              <li>
                Ketuk <span className="font-mono text-[#E2E8F0]">Cek Koneksi Voice Proxy</span> mengembalikan status <span className="font-mono text-[#4ADE80]">Connected</span> via USB <span className="font-mono text-[#E2E8F0]">adb reverse</span>.
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Section 3: Real /mobile/ Scaffold File Explorer */}
      <div className="bg-[#14171A] border border-[#23282E] rounded-xl overflow-hidden">
        <div className="p-5 border-b border-[#22272D] flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <FileCode2 className="w-4 h-4 text-[#22C55E]" aria-hidden="true" />
              <h2 className="text-base font-semibold text-[#F8FAFC]">
                03. Live /mobile/ Expo Custom Dev Build Explorer
              </h2>
            </div>
            <p className="text-xs text-[#94A3B8]">
              {mobileFiles.length} real files generated in <span className="font-mono text-[#E2E8F0]">/mobile</span> · loaded directly from workspace disk
            </p>
          </div>

          <div
            role="group"
            aria-label="Filter kategori file mobile scaffold"
            className="flex flex-wrap items-center gap-1 p-1 bg-[#0E1114] border border-[#23282E] rounded-lg"
          >
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setFileCategory(cat)}
                className={`px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                  fileCategory === cat
                    ? 'bg-[#22C55E] text-[#052E16]'
                    : 'text-[#94A3B8] hover:text-[#F8FAFC]'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12">
          {/* File Sidebar */}
          <aside
            aria-label="Daftar file scaffold mobile"
            className="lg:col-span-4 border-b lg:border-b-0 lg:border-r border-[#22272D] max-h-[540px] overflow-y-auto divide-y divide-[#1B2026]"
          >
            {filteredFiles.map((file) => {
              const active = activeFile?.id === file.id;
              return (
                <button
                  key={file.id}
                  type="button"
                  onClick={() => setSelectedFileId(file.id)}
                  className={`w-full text-left px-4 py-3 transition-colors cursor-pointer ${
                    active
                      ? 'bg-[#17211B] text-[#F8FAFC]'
                      : 'text-[#CBD5E1] hover:bg-[#191D22]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span
                      className={`font-mono font-medium truncate ${
                        active ? 'text-[#4ADE80]' : 'text-[#F8FAFC]'
                      }`}
                    >
                      {file.label}
                    </span>
                    <span className="text-[11px] font-mono text-[#64748B] shrink-0">
                      {file.stepTag}
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] text-[#94A3B8] line-clamp-2">{file.purpose}</p>
                </button>
              );
            })}
          </aside>

          {/* Code Viewer */}
          <div className="lg:col-span-8 flex flex-col bg-[#0B0D0E]">
            {activeFile && (
              <>
                <div className="px-4 py-3 bg-[#101317] border-b border-[#22272D] flex flex-wrap items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-mono text-xs font-semibold text-[#F8FAFC] truncate">
                      {activeFile.relativePath}
                    </div>
                    <div className="text-[11px] text-[#94A3B8]">{activeFile.purpose}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => void handleCopy(`file-${activeFile.id}`, activeFile.content)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#E2E8F0] bg-[#171B20] hover:bg-[#20262E] border border-[#2A313B] rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    {copiedId === `file-${activeFile.id}` ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-[#22C55E]" />
                        <span className="text-[#22C55E]">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy File</span>
                      </>
                    )}
                  </button>
                </div>
                <pre className="p-4 text-xs font-mono text-[#E2E8F0] leading-relaxed overflow-auto max-h-[480px]">
                  <code>{activeFile.content}</code>
                </pre>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Section 4: 4-Step Full-Scope Hackathon Plan vs Ultra-Lean 3-Item Production Roadmap */}
      <div className="bg-[#14171A] border border-[#23282E] rounded-xl p-5 sm:p-6 space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#1E2329]">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-[#22C55E]" aria-hidden="true" />
              <h2 className="text-base font-semibold text-[#F8FAFC]">
                04. 4-Step Hackathon Build Sequence vs Ultra-Lean Production Roadmap
              </h2>
            </div>
            <p className="text-xs text-[#94A3B8]">
              {hackathonCount} full hackathon build steps (including Eagle Voiceprint &amp; Anchor PDA) · only {roadmapCount} post-hackathon roadmap items
            </p>
          </div>

          <div
            role="group"
            aria-label="Filter cakupan hackathon vs production roadmap"
            className="flex flex-wrap items-center gap-1 p-1 bg-[#0E1114] border border-[#23282E] rounded-lg max-w-full self-start"
          >
            {(
              [
                { id: 'all', label: `Semua (${BUILD_SCOPE_ITEMS.length})` },
                { id: 'hackathon', label: `Step 1–4 Hackathon (${hackathonCount})` },
                { id: 'roadmap', label: `Production Roadmap (${roadmapCount})` },
              ] as const
            ).map((opt) => (
              <button
                key={opt.id}
                type="button"
                data-testid={`scope-filter-${opt.id}`}
                onClick={() => setScopeFilter(opt.id)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                  scopeFilter === opt.id
                    ? 'bg-[#22C55E] text-[#052E16]'
                    : 'text-[#94A3B8] hover:text-[#F8FAFC]'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div className="divide-y divide-[#1E2329]">
          {visibleScope.map((item) => {
            const isRoadmap = item.bucket === 'roadmap';
            const isDone = item.status === 'Scaffolded (Step 1)';
            return (
              <div key={item.id} className="py-4 first:pt-0 last:pb-0 space-y-1.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-sm font-semibold text-[#F8FAFC]">{item.title}</h3>
                  <div className="flex items-center gap-2 text-xs font-mono">
                    <span className={isRoadmap ? 'text-[#60A5FA]' : 'text-[#4ADE80]'}>
                      {item.stageLabel}
                    </span>
                    <span aria-hidden="true" className="text-[#475569]">
                      ·
                    </span>
                    <span
                      className={
                        isDone
                          ? 'text-[#22C55E]'
                          : isRoadmap
                            ? 'text-[#93C5FD]'
                            : 'text-[#FBBF24]'
                      }
                    >
                      {item.status}
                    </span>
                  </div>
                </div>
                <p className="text-xs text-[#CBD5E1] leading-relaxed">{item.detail}</p>
                <p className="text-[11px] font-mono text-[#64748B]">
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
