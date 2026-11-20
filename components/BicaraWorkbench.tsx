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
import ArchitectureWorkspace from './ArchitectureWorkspace';
import BuildKitWorkspace from './BuildKitWorkspace';
import DocsWorkspace from './DocsWorkspace';

type SurfaceMode = 'landing' | 'developers';
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

  const handleRunDemoFlow = () => {
    setSurfaceMode('landing');
    setWalletConnected(true);
    setDemoTriggerNonce((n) => n + 1);
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

  const handleOpenDevelopers = (tab: DeveloperTab = 'architecture') => {
    setDevTab(tab);
    setSurfaceMode('developers');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const landingNavItems = [
    { id: 'how-it-works', label: 'How It Works' },
    { id: 'live-demo', label: 'Live Demo' },
    { id: 'security', label: 'Security' },
    { id: 'benchmarks', label: 'Benchmarks' },
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
          {/* Zone 1: Single-line Brand Wordmark */}
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

          {/* Zone 2: 4 Clean Single-Line Text Nav Links */}
          <nav
            aria-label="Primary navigation"
            className="hidden md:flex items-center gap-7 text-sm font-medium text-[#A1A1AA]"
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

          {/* Zone 3: 1 Primary Action */}
          <div className="flex items-center shrink-0">
            {surfaceMode === 'landing' ? (
              <button
                type="button"
                onClick={() => handleOpenDevelopers('architecture')}
                className="inline-flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-semibold text-[#F4F4F5] hover:text-[#CCFF00] border border-white/20 hover:border-[#CCFF00] rounded-xl transition-colors whitespace-nowrap shrink-0 cursor-pointer"
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
                className="inline-flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-bold text-[#0F0F0F] bg-[#CCFF00] hover:bg-[#B3E600] rounded-xl transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" aria-hidden="true" />
                <span>Back to Landing</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-7">
        <motion.div
          key={surfaceMode === 'landing' ? 'landing' : `dev-${devTab}`}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
        >
          {surfaceMode === 'landing' ? (
            <BicaraLanding
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
              onRunDemoFlow={handleRunDemoFlow}
              onOpenDevelopers={handleOpenDevelopers}
            />
          ) : (
            <div className="space-y-8">
              {/* Developers & Judges Segmented Studio Bar (Sprint intentionally hidden; PROGRESS.md stays in Docs) */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#262626]">
                <div className="space-y-1">
                  <p className="text-xs font-medium text-[#CCFF00]">
                    Developers &amp; Judges Studio
                  </p>
                  <p className="text-sm text-[#A1A1AA]">
                    Architecture blueprint, live mobile Expo scaffold, and complete repository docs
                    (including PROGRESS.md).
                  </p>
                </div>

                <div
                  role="tablist"
                  aria-label="Developer workspace sections"
                  className="inline-flex items-center p-1 bg-[#1A1A1A] border border-[#262626] rounded-xl self-start sm:self-auto"
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

      {/* Quiet Minimal Footer */}
      <footer className="border-t border-[#222222] py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[#71717A]">
          <span>
            Bicara · Spoken Transaction Verification &amp; accessible-signing Layer on Solana
          </span>
          <div className="flex items-center gap-5">
            <button
              type="button"
              onClick={() => handleOpenDevelopers('docs')}
              className="hover:text-[#CCFF00] transition-colors cursor-pointer"
            >
              Documentation
            </button>
            <span>MIT License · Dev3pack Global Hackathon 2026</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
