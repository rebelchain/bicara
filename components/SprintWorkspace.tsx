'use client';

import { useEffect, useState } from 'react';
import { CheckSquare, Square, Play, Pause, RotateCcw, AlertTriangle } from 'lucide-react';
import {
  DEMO_SCRIPT_STEPS,
  EMERGENCY_FALLBACKS,
  INITIAL_SPRINT_TASKS,
  type SprintTask,
} from '@/lib/sdk-audit-data';

const STORAGE_KEY = 'bicara_sprint_done_v2';

export default function SprintWorkspace() {
  const [completedIds, setCompletedIds] = useState<string[]>(() => {
    const defaults = INITIAL_SPRINT_TASKS.filter((t) => t.defaultDone).map((t) => t.id);
    if (typeof window === 'undefined') return defaults;
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {
      // ignore storage errors
    }
    return defaults;
  });
  const [phaseFilter, setPhaseFilter] = useState<string>('All');
  const [timerRunning, setTimerRunning] = useState(false);
  const [elapsedSec, setElapsedSec] = useState(0);

  useEffect(() => {
    if (!timerRunning) return;
    const id = window.setInterval(() => {
      setElapsedSec((prev) => {
        if (prev >= 45) {
          setTimerRunning(false);
          return 45;
        }
        return prev + 1;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [timerRunning]);

  const toggleTask = (taskId: string) => {
    setCompletedIds((prev) => {
      const next = prev.includes(taskId)
        ? prev.filter((id) => id !== taskId)
        : [...prev, taskId];
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        // ignore storage errors
      }
      return next;
    });
  };

  const resetProgress = () => {
    const initial = INITIAL_SPRINT_TASKS.filter((t) => t.defaultDone).map((t) => t.id);
    setCompletedIds(initial);
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
    } catch {
      // ignore
    }
  };

  const phases = [
    'All',
    'Phase 1: Env & MWA',
    'Phase 2: Voice & Blind UX',
    'Phase 3: Solana Tx',
    'Phase 4: E2E & Polish',
    'Phase 5: Anchor PDA',
  ];

  const visibleTasks: SprintTask[] =
    phaseFilter === 'All'
      ? INITIAL_SPRINT_TASKS
      : INITIAL_SPRINT_TASKS.filter((t) => t.phase === phaseFilter);

  const completedCount = completedIds.length;
  const totalCount = INITIAL_SPRINT_TASKS.length;
  const pct = Math.round((completedCount / totalCount) * 100);

  // Determine active demo step from timer
  const activeDemoStep =
    elapsedSec < 5
      ? 1
      : elapsedSec < 12
        ? 2
        : elapsedSec < 20
          ? 3
          : elapsedSec < 30
            ? 4
            : elapsedSec < 38
              ? 5
              : 6;

  return (
    <section aria-label="10-Day Prototype and 3-Day Hackathon Execution Plan" className="space-y-8">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 pb-6 border-b border-[#22272D]">
        <div className="space-y-1.5 max-w-2xl">
          <p className="text-xs font-medium text-[#94A3B8]">
            Prototype window: Nov 19–26 · Dev3pack Hackathon: Nov 27–29 (72 hours)
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#F8FAFC] [text-wrap:balance]">
            Prototype Sprint &amp; 45-Second Demo Playbook
          </h1>
        </div>

        <div className="flex items-center gap-6 shrink-0">
          <div className="text-right">
            <div className="text-xs text-[#94A3B8]">Prototype Readiness</div>
            <div className="text-lg font-bold font-mono tabular-nums text-[#F8FAFC]">
              {completedCount}/{totalCount}{' '}
              <span className="text-[#22C55E] text-sm font-medium">({pct}%)</span>
            </div>
          </div>
          <button
            type="button"
            onClick={resetProgress}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-[#94A3B8] hover:text-[#F8FAFC] bg-[#14171A] border border-[#262B30] rounded-lg transition-colors whitespace-nowrap cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>
        </div>
      </div>

      {/* Main 2-column grid: Checklist (Left) + 45s Demo Rehearsal & Fallbacks (Right) */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* Left: Phase Checklist */}
        <div className="xl:col-span-7 space-y-4">
          <div className="flex flex-wrap items-center gap-1.5 p-1 bg-[#14171A] border border-[#23282E] rounded-lg">
            {phases.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPhaseFilter(p)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                  phaseFilter === p
                    ? 'bg-[#22C55E] text-[#052E16]'
                    : 'text-[#94A3B8] hover:text-[#F8FAFC]'
                }`}
              >
                {p}
              </button>
            ))}
          </div>

          {/* Progress Bar */}
          <div className="h-1.5 w-full bg-[#1B2026] rounded-full overflow-hidden">
            <div
              className="h-full bg-[#22C55E] transition-transform duration-300 origin-left"
              style={{ transform: `scaleX(${pct / 100})` }}
            />
          </div>

          <div className="bg-[#14171A] border border-[#23282E] rounded-xl divide-y divide-[#1E2329]">
            {visibleTasks.map((task) => {
              const checked = completedIds.includes(task.id);
              return (
                <button
                  key={task.id}
                  type="button"
                  onClick={() => toggleTask(task.id)}
                  aria-pressed={checked}
                  className="w-full text-left p-4 flex items-start gap-3.5 hover:bg-[#191D22] transition-colors cursor-pointer"
                >
                  <span className="mt-0.5 shrink-0 text-[#22C55E]" aria-hidden="true">
                    {checked ? (
                      <CheckSquare className="w-4 h-4 text-[#22C55E]" />
                    ) : (
                      <Square className="w-4 h-4 text-[#475569]" />
                    )}
                  </span>
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span
                        className={`text-sm font-medium ${
                          checked ? 'text-[#64748B] line-through' : 'text-[#F8FAFC]'
                        }`}
                      >
                        {task.title}
                      </span>
                      <span className="text-xs font-mono tabular-nums text-[#64748B] whitespace-nowrap">
                        {task.dayTarget} · {task.phase}
                      </span>
                    </div>
                    <p className="text-xs text-[#94A3B8] leading-relaxed">
                      Exit criteria: {task.exitCriteria}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right: 45s Demo Script Rehearsal + Emergency Fallbacks */}
        <div className="xl:col-span-5 space-y-6">
          <div className="bg-[#14171A] border border-[#23282E] rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between gap-3 pb-3 border-b border-[#22272D]">
              <div>
                <h2 className="text-base font-semibold text-[#F8FAFC]">
                  45-Second Live Demo Rehearsal
                </h2>
                <p className="text-xs text-[#94A3B8]">
                  Two-phone pitch choreography for Dev3pack judges
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="font-mono text-lg font-semibold tabular-nums text-[#22C55E] w-12 text-right">
                  {String(elapsedSec).padStart(2, '0')}s
                </span>
                <button
                  type="button"
                  onClick={() => {
                    if (elapsedSec >= 45) setElapsedSec(0);
                    setTimerRunning((v) => !v);
                  }}
                  aria-label={timerRunning ? 'Pause rehearsal timer' : 'Start rehearsal timer'}
                  className="p-2 rounded-lg bg-[#22C55E] text-[#052E16] hover:bg-[#16A34A] transition-colors cursor-pointer"
                >
                  {timerRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setTimerRunning(false);
                    setElapsedSec(0);
                  }}
                  aria-label="Reset rehearsal timer"
                  className="p-2 rounded-lg bg-[#1D2126] text-[#94A3B8] hover:text-[#F8FAFC] transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              </div>
            </div>

            <ol className="space-y-3">
              {DEMO_SCRIPT_STEPS.map((item) => {
                const isCurrent = timerRunning && activeDemoStep === item.step;
                return (
                  <li
                    key={item.step}
                    className={`p-3 rounded-lg border transition-colors ${
                      isCurrent
                        ? 'bg-[#17241C] border-[#22C55E]/50'
                        : 'bg-[#0E1114] border-[#22272D]'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span className="font-semibold text-[#F8FAFC]">
                        0{item.step}. {item.action}
                      </span>
                      <span className="font-mono tabular-nums text-[#4ADE80] shrink-0">
                        {item.secondMark}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-[#E2E8F0]">{item.spokenLine}</p>
                    <p className="mt-1 text-[11px] text-[#64748B]">
                      Judge signal: {item.judgeSignal}
                    </p>
                  </li>
                );
              })}
            </ol>
          </div>

          <div className="bg-[#14171A] border border-[#23282E] rounded-xl p-5 space-y-3.5">
            <div className="flex items-center gap-2 text-sm font-semibold text-[#F8FAFC]">
              <AlertTriangle className="w-4 h-4 text-[#F59E0B]" aria-hidden="true" />
              <h2>Demo Emergency Fallbacks</h2>
            </div>
            <div className="divide-y divide-[#1E2329]">
              {EMERGENCY_FALLBACKS.map((fb) => (
                <div key={fb.scenario} className="py-3 first:pt-0 last:pb-0 space-y-1">
                  <div className="text-xs font-semibold text-[#F8FAFC]">{fb.scenario}</div>
                  <p className="text-xs text-[#94A3B8]">{fb.mitigation}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
