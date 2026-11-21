'use client';

import { useState } from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, AudioLines } from 'lucide-react';
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
  const [demoCommand, setDemoCommand] = useState<string>('Send 5 USDC to Ahmad');

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
    if (!tx.isLiveDevnet) {
      if (tx.currency === 'SOL') {
        setSenderBalanceSol(nextSenderBalance);
      } else {
        setSenderBalanceUsdc(nextSenderBalance);
        setSenderBalanceSol((sol) => Math.max(0, Number((sol - 0.000005).toFixed(6))));
      }
      setContacts((prev) =>
        prev.map((c) =>
          c.id === recipientId
            ? {
                ...c,
                hasUsdcAta: tx.currency === 'USDC' ? true : c.hasUsdcAta,
                balanceUsdc:
                  tx.currency === 'USDC'
                    ? Number((c.balanceUsdc + tx.amountUsdc).toFixed(6))
                    : c.balanceUsdc,
              }
            : c
        )
      );
    }
    setTransactions((prev) => [tx, ...prev]);
  };

  const handleResetBalances = () => {
    setSenderBalanceUsdc(INITIAL_SENDER_USDC);
    setSenderBalanceSol(INITIAL_SENDER_SOL);
    setContacts(SEED_CONTACTS);
    setTransactions(SEED_TRANSACTIONS);
    setWalletConnected(true);
  };

  const handleOpenDemo = (scenarioCommand?: string) => {
    setWalletConnected(true);
    if (scenarioCommand) {
      setDemoCommand(scenarioCommand);
      setDemoTriggerNonce((n) => n + 1);
    }
    setSurfaceMode('demo');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOpenDevelopers = (tab: DeveloperTab = 'architecture') => {
    setDevTab(tab);
    setSurfaceMode('developers');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const developerTabs: Array<{ id: DeveloperTab; label: string }> = [
    { id: 'architecture', label: 'Architecture' },
    { id: 'buildkit', label: 'Build Kit' },
    { id: 'docs', label: 'Docs' },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-[#FAF9F5] text-[#1E3124]">
      {/* Warm Sunlit 3-Zone Top Bar for Demo & Developers Surfaces (Landing uses its full-bleed floating nav) */}
      {surfaceMode !== 'landing' && (
        <header className="sticky top-0 z-40 bg-[#FAF9F5]/92 backdrop-blur-md border-b border-[#E2E6DC]">
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
              <span className="w-8 h-8 rounded-xl bg-[#356341] text-white flex items-center justify-center shrink-0">
                <AudioLines className="w-4 h-4" strokeWidth={2.5} aria-hidden="true" />
              </span>
              <span className="font-display text-xl font-black tracking-tight text-[#1E3124]">
                Bicara
              </span>
            </button>

            {/* Zone 2: Clean Studio Switcher Links */}
            <nav
              aria-label="Studio navigation"
              className="hidden md:flex items-center gap-8 text-sm font-semibold text-[#526658]"
            >
              <button
                type="button"
                onClick={() => handleOpenDemo()}
                className={`transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  surfaceMode === 'demo'
                    ? 'text-[#1E3124]'
                    : 'hover:text-[#356341]'
                }`}
              >
                Interactive Demo
              </button>
              <button
                type="button"
                onClick={() => handleOpenDevelopers('architecture')}
                className={`transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  surfaceMode === 'developers' && devTab === 'architecture'
                    ? 'text-[#1E3124]'
                    : 'hover:text-[#356341]'
                }`}
              >
                Architecture
              </button>
              <button
                type="button"
                onClick={() => handleOpenDevelopers('buildkit')}
                className={`transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  surfaceMode === 'developers' && devTab === 'buildkit'
                    ? 'text-[#1E3124]'
                    : 'hover:text-[#356341]'
                }`}
              >
                Build Kit
              </button>
              <button
                type="button"
                onClick={() => handleOpenDevelopers('docs')}
                className={`transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  surfaceMode === 'developers' && devTab === 'docs'
                    ? 'text-[#1E3124]'
                    : 'hover:text-[#356341]'
                }`}
              >
                Docs
              </button>
            </nav>

            {/* Zone 3: Single Primary Action */}
            <div className="flex items-center shrink-0">
              <button
                type="button"
                onClick={() => {
                  setSurfaceMode('landing');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="inline-flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-bold text-white bg-[#356341] hover:bg-[#2A5135] rounded-full transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" aria-hidden="true" />
                <span>Back to Landing</span>
              </button>
            </div>
          </div>
        </header>
      )}

      {/* Main Content */}
      <main
        className={
          surfaceMode === 'landing'
            ? 'flex-1 w-full'
            : 'flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-8'
        }
      >
        <motion.div
          key={surfaceMode === 'developers' ? `dev-${devTab}` : surfaceMode}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
        >
          {surfaceMode === 'landing' && (
            <BicaraLanding
              onOpenDemo={handleOpenDemo}
              onOpenDevelopers={handleOpenDevelopers}
            />
          )}

          {surfaceMode === 'demo' && (
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
              demoCommand={demoCommand}
            />
          )}

          {surfaceMode === 'developers' && (
            <div className="space-y-8">
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-6 border-b border-[#E2E6DC]">
                <div className="space-y-1.5">
                  <p className="text-xs font-semibold text-[#457249]">
                    Developers &amp; Judges Studio
                  </p>
                  <h1 className="font-display text-2xl sm:text-3xl font-black tracking-tight text-[#1E3124]">
                    Technical Architecture, Build Kit &amp; Docs
                  </h1>
                  <p className="text-sm text-[#526658]">
                    Full SDK blueprint, Android Custom Dev Build runbook, and live repository docs
                    (including PROGRESS.md).
                  </p>
                </div>

                <div
                  role="tablist"
                  aria-label="Developer workspace sections"
                  className="inline-flex items-center p-1 bg-[#EEF3E8] border border-[#DCE4D4] rounded-full self-start sm:self-auto"
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
                        className={`px-4 py-2 text-xs sm:text-sm font-semibold rounded-full transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                          active
                            ? 'bg-[#356341] text-white shadow-sm'
                            : 'text-[#526658] hover:text-[#1E3124]'
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

      {/* Clean Sunlit Minimal Footer */}
      <footer className="border-t border-[#E2E6DC] bg-[#F3F5EE] py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#526658]">
          <div className="flex items-center gap-2.5">
            <span className="w-6 h-6 rounded-lg bg-[#356341] text-white flex items-center justify-center shrink-0">
              <AudioLines className="w-3.5 h-3.5" strokeWidth={2.5} aria-hidden="true" />
            </span>
            <span className="font-display font-black text-sm text-[#1E3124]">Bicara</span>
            <span aria-hidden="true" className="text-[#B8C4B2]">
              ·
            </span>
            <span>Speak before you sign on Solana.</span>
          </div>

          <div className="flex flex-wrap items-center gap-5">
            <button
              type="button"
              onClick={() => handleOpenDemo()}
              className="hover:text-[#356341] transition-colors cursor-pointer"
            >
              Interactive Demo
            </button>
            <button
              type="button"
              onClick={() => handleOpenDevelopers('docs')}
              className="hover:text-[#356341] transition-colors cursor-pointer"
            >
              Documentation
            </button>
            <button
              type="button"
              onClick={() => handleOpenDevelopers('buildkit')}
              className="hover:text-[#356341] transition-colors cursor-pointer"
            >
              Solana Mobile Build Kit
            </button>
            <span className="text-[#788A7D]">© 2026 Bicara · MIT Open Source</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
