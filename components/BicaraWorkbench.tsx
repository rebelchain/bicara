'use client';

import { useState } from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, Code2, Mic } from 'lucide-react';
import {
  SEED_CONTACTS,
  SEED_TRANSACTIONS,
  type Contact,
  type TransactionRecord,
} from '@/lib/bicara-engine';
import type { BicaraDocFile } from '@/lib/docs-loader';
import type { MobileScaffoldFile } from '@/lib/mobile-scaffold-loader';
import BicaraLanding from './BicaraLanding';
import PrototypeWorkspace from './PrototypeWorkspace';
import ArchitectureWorkspace from './ArchitectureWorkspace';
import BuildKitWorkspace from './BuildKitWorkspace';
import DocsWorkspace from './DocsWorkspace';

type SurfaceMode = 'landing' | 'demo' | 'developers';
type DeveloperTab = 'architecture' | 'buildkit' | 'docs';

interface BicaraWorkbenchProps {
  docs: BicaraDocFile[];
  mobileFiles: MobileScaffoldFile[];
}

const INITIAL_SENDER_USDC = 25.0;
const INITIAL_SENDER_SOL = 1.85;

export default function BicaraWorkbench({ docs, mobileFiles }: BicaraWorkbenchProps) {
  const [surfaceMode, setSurfaceMode] = useState<SurfaceMode>('landing');
  const [devTab, setDevTab] = useState<DeveloperTab>('architecture');
  const [contacts, setContacts] = useState<Contact[]>(SEED_CONTACTS);
  const [transactions, setTransactions] = useState<TransactionRecord[]>(SEED_TRANSACTIONS);
  const [senderBalanceUsdc, setSenderBalanceUsdc] = useState<number>(INITIAL_SENDER_USDC);
  const [senderBalanceSol, setSenderBalanceSol] = useState<number>(INITIAL_SENDER_SOL);
  const [walletConnected, setWalletConnected] = useState<boolean>(true);
  const [demoTriggerNonce, setDemoTriggerNonce] = useState<number>(0);

  const handleAddContact = (newContact: Contact) => {
    setContacts((prev) => [newContact, ...prev]);
    if (newContact.onChain) {
      setSenderBalanceSol((sol) => Math.max(0, Number((sol - 0.002).toFixed(4))));
    }
  };

  const handleDeleteContact = (id: string) => {
    setContacts((prev) => prev.filter((c) => c.id !== id));
  };

  const handleCompleteTransfer = (
    tx: TransactionRecord,
    nextSenderBalance: number,
    recipientId: string
  ) => {
    setSenderBalanceUsdc(nextSenderBalance);
    setSenderBalanceSol((sol) => Math.max(0, Number((sol - 0.000005).toFixed(6))));
    setTransactions((prev) => [tx, ...prev]);
    setContacts((prev) =>
      prev.map((c) =>
        c.id === recipientId
          ? {
              ...c,
              hasUsdcAta: true,
              balanceUsdc: Number((c.balanceUsdc + tx.amountUsdc).toFixed(6)),
            }
          : c
      )
    );
  };

  const handleResetBalances = () => {
    setSenderBalanceUsdc(INITIAL_SENDER_USDC);
    setSenderBalanceSol(INITIAL_SENDER_SOL);
    setContacts(SEED_CONTACTS);
    setTransactions(SEED_TRANSACTIONS);
    setWalletConnected(true);
  };

  const handleOpenDemo = () => {
    setSurfaceMode('demo');
    setWalletConnected(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOpenDevelopers = (tab: DeveloperTab = 'architecture') => {
    setDevTab(tab);
    setSurfaceMode('developers');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const navigateToSection = (sectionId: string) => {
    if (surfaceMode !== 'landing') {
      setSurfaceMode('landing');
      setTimeout(() => {
        document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth' });
      }, 60);
    } else {
      document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const landingNavItems = [
    { id: 'how-it-works', label: 'How it works' },
    { id: 'features', label: 'Features' },
    { id: 'security', label: 'Security' },
  ];

  const developerTabs: Array<{ id: DeveloperTab; label: string }> = [
    { id: 'architecture', label: 'Architecture' },
    { id: 'buildkit', label: 'Build Kit' },
    { id: 'docs', label: 'Docs' },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-[#0F0F0F] text-[#F4F4F5]">
      {/* Strict 3-Zone Top Bar Contract */}
      <header className="sticky top-0 z-40 bg-[#0F0F0F]/90 backdrop-blur-md border-b border-white/[0.08]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-8">
          {/* Zone 1: Brand Wordmark */}
          <button
            type="button"
            onClick={() => {
              setSurfaceMode('landing');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className="inline-flex items-center gap-2.5 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <span className="w-8 h-8 rounded-xl bg-[#CCFF00] text-[#0F0F0F] flex items-center justify-center shrink-0">
              <Mic className="w-4 h-4" aria-hidden="true" />
            </span>
            <span className="font-display text-xl font-extrabold tracking-tight text-[#F4F4F5]">
              Bicara
            </span>
          </button>

          {/* Zone 2: Clean Consumer Nav Links */}
          <nav
            aria-label="Primary navigation"
            className="hidden md:flex items-center gap-8 text-sm font-medium text-[#A1A1AA]"
          >
            {landingNavItems.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => navigateToSection(item.id)}
                className="hover:text-[#CCFF00] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                {item.label}
              </button>
            ))}
          </nav>

          {/* Zone 3: Single Primary Action */}
          <div className="flex items-center shrink-0">
            {surfaceMode === 'landing' ? (
              <button
                type="button"
                onClick={() => handleOpenDevelopers('architecture')}
                className="inline-flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-semibold text-[#F4F4F5] hover:text-[#CCFF00] border border-white/20 hover:border-[#CCFF00] rounded-full transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Code2 className="w-4 h-4" aria-hidden="true" />
                <span>Developers &amp; Judges</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setSurfaceMode('landing');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="inline-flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-bold text-[#0F0F0F] bg-[#CCFF00] hover:bg-[#B3E600] rounded-full transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" aria-hidden="true" />
                <span>Back to Landing</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-8">
        <motion.div
          key={surfaceMode === 'developers' ? `dev-${devTab}` : surfaceMode}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
        >
          {surfaceMode === 'landing' && (
            <BicaraLanding
              onOpenDemo={handleOpenDemo}
              onOpenDevelopers={handleOpenDevelopers}
            />
          )}

          {surfaceMode === 'demo' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-6 border-b border-white/10">
                <div className="space-y-1.5">
                  <p className="text-xs font-medium text-[#CCFF00]">
                    Interactive Browser Sandbox
                  </p>
                  <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-[#F4F4F5]">
                    Try Bicara&apos;s Spoken Verification Flow
                  </h1>
                  <p className="text-sm text-[#A1A1AA] max-w-2xl">
                    Speak or tap a sample command below to test eyes-free narration, screen curtain
                    mode, and pre-sign confirmation.
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => setDemoTriggerNonce((n) => n + 1)}
                    className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-bold text-[#0F0F0F] bg-[#CCFF00] hover:bg-[#B3E600] rounded-xl transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <Mic className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Run Sample Send</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleOpenDevelopers('architecture')}
                    className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-[#F4F4F5] bg-[#1A1A1A] hover:border-[#CCFF00] border border-white/15 rounded-xl transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <Code2 className="w-3.5 h-3.5 text-[#CCFF00]" aria-hidden="true" />
                    <span>Developers &amp; Judges</span>
                  </button>
                </div>
              </div>

              <PrototypeWorkspace
                contacts={contacts}
                transactions={transactions}
                senderBalanceUsdc={senderBalanceUsdc}
                senderBalanceSol={senderBalanceSol}
                walletConnected={walletConnected}
                onToggleWallet={() => setWalletConnected((v) => !v)}
                onAddContact={handleAddContact}
                onDeleteContact={handleDeleteContact}
                onCompleteTransfer={handleCompleteTransfer}
                onResetBalances={handleResetBalances}
                demoTriggerNonce={demoTriggerNonce}
              />
            </div>
          )}

          {surfaceMode === 'developers' && (
            <div className="space-y-8">
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-6 border-b border-white/10">
                <div className="space-y-1.5">
                  <p className="text-xs font-medium text-[#CCFF00]">
                    Developers &amp; Judges Studio
                  </p>
                  <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-[#F4F4F5]">
                    Technical Architecture, Build Kit &amp; Docs
                  </h1>
                  <p className="text-sm text-[#A1A1AA]">
                    Full SDK blueprint, Android Custom Dev Build runbook, and live repository docs
                    (including PROGRESS.md).
                  </p>
                </div>

                <div
                  role="tablist"
                  aria-label="Developer workspace sections"
                  className="inline-flex items-center p-1 bg-[#1A1A1A] border border-white/10 rounded-xl self-start sm:self-auto"
                >
                  {developerTabs.map((tab) => {
                    const active = devTab === tab.id;
                    return (
                      <button
                        key={tab.id}
                        type="button"
                        role="tab"
                        aria-selected={active}
                        onClick={() => setDevTab(tab.id)}
                        className={`px-4 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                          active
                            ? 'bg-[#CCFF00] text-[#0F0F0F]'
                            : 'text-[#A1A1AA] hover:text-[#F4F4F5]'
                        }`}
                      >
                        {tab.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {devTab === 'architecture' && <ArchitectureWorkspace />}
              {devTab === 'buildkit' && <BuildKitWorkspace mobileFiles={mobileFiles} />}
              {devTab === 'docs' && <DocsWorkspace docs={docs} />}
            </div>
          )}
        </motion.div>
      </main>

      {/* Clean Minimal Footer */}
      <footer className="border-t border-white/[0.08] bg-[#141414] py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#A1A1AA]">
          <div className="flex items-center gap-2.5">
            <span className="w-6 h-6 rounded-lg bg-[#CCFF00] text-[#0F0F0F] flex items-center justify-center shrink-0">
              <Mic className="w-3.5 h-3.5" aria-hidden="true" />
            </span>
            <span className="font-display font-bold text-sm text-[#F4F4F5]">Bicara</span>
            <span aria-hidden="true" className="text-white/20">
              ·
            </span>
            <span>Speak before you sign on Solana.</span>
          </div>

          <div className="flex flex-wrap items-center gap-5">
            <button
              type="button"
              onClick={handleOpenDemo}
              className="hover:text-[#CCFF00] transition-colors cursor-pointer"
            >
              Interactive Demo
            </button>
            <button
              type="button"
              onClick={() => handleOpenDevelopers('docs')}
              className="hover:text-[#CCFF00] transition-colors cursor-pointer"
            >
              Documentation
            </button>
            <button
              type="button"
              onClick={() => handleOpenDevelopers('buildkit')}
              className="hover:text-[#CCFF00] transition-colors cursor-pointer"
            >
              Solana Mobile Build Kit
            </button>
            <span className="text-[#71717A]">© 2026 Bicara · MIT Open Source</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
