'use client';

import { useState } from 'react';
import { motion } from 'motion/react';
import {
  SEED_CONTACTS,
  SEED_TRANSACTIONS,
  type Contact,
  type TransactionRecord,
} from '@/lib/bicara-engine';
import type { BicaraDocFile } from '@/lib/docs-loader';
import type { MobileScaffoldFile } from '@/lib/mobile-scaffold-loader';
import PrototypeWorkspace from './PrototypeWorkspace';
import ArchitectureWorkspace from './ArchitectureWorkspace';
import BuildKitWorkspace from './BuildKitWorkspace';
import DocsWorkspace from './DocsWorkspace';
import SprintWorkspace from './SprintWorkspace';

type WorkspaceTab = 'prototype' | 'architecture' | 'buildkit' | 'docs' | 'sprint';

interface BicaraWorkbenchProps {
  docs: BicaraDocFile[];
  mobileFiles: MobileScaffoldFile[];
}

const INITIAL_SENDER_USDC = 25.0;
const INITIAL_SENDER_SOL = 1.85;

export default function BicaraWorkbench({ docs, mobileFiles }: BicaraWorkbenchProps) {
  const [activeTab, setActiveTab] = useState<WorkspaceTab>('prototype');
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
    setActiveTab('prototype');
    setWalletConnected(true);
    setDemoTriggerNonce((n) => n + 1);
  };

  const navItems: Array<{ id: WorkspaceTab; label: string }> = [
    { id: 'prototype', label: 'Prototype' },
    { id: 'architecture', label: 'Architecture' },
    { id: 'buildkit', label: 'Build Kit' },
    { id: 'docs', label: 'Docs' },
    { id: 'sprint', label: 'Sprint' },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-[#0B0D0E] text-[#F8FAFC]">
      {/* Strict 3-Zone Top Bar Contract */}
      <header className="sticky top-0 z-30 bg-[#0B0D0E]/95 backdrop-blur-md border-b border-[#1E2329]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3 sm:gap-8">
          {/* Zone 1: Single-line Wordmark */}
          <button
            type="button"
            onClick={() => setActiveTab('prototype')}
            className="font-display text-base sm:text-lg font-bold tracking-tight text-[#F8FAFC] whitespace-nowrap shrink-0 cursor-pointer"
          >
            Bicara
          </button>

          {/* Zone 2: 5 Clean Single-Line Nav Links */}
          <nav
            aria-label="Primary workspace navigation"
            className="flex items-center gap-2.5 sm:gap-6 overflow-x-auto"
          >
            {navItems.map((item) => {
              const active = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveTab(item.id)}
                  aria-current={active ? 'page' : undefined}
                  className={`py-1.5 text-xs sm:text-sm font-medium transition-colors whitespace-nowrap shrink-0 border-b-2 cursor-pointer ${
                    active
                      ? 'text-[#F8FAFC] border-[#22C55E]'
                      : 'text-[#94A3B8] border-transparent hover:text-[#F8FAFC]'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </nav>

          {/* Zone 3: 1 Primary Action */}
          <div className="hidden sm:flex items-center shrink-0">
            <button
              type="button"
              onClick={handleRunDemoFlow}
              className="px-4 py-2 text-xs font-semibold text-[#052E16] bg-[#22C55E] hover:bg-[#16A34A] rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Run Demo Flow
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-7">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
        >
          {activeTab === 'prototype' && (
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
          )}

          {activeTab === 'architecture' && <ArchitectureWorkspace />}

          {activeTab === 'buildkit' && <BuildKitWorkspace mobileFiles={mobileFiles} />}

          {activeTab === 'docs' && <DocsWorkspace docs={docs} />}

          {activeTab === 'sprint' && <SprintWorkspace />}
        </motion.div>
      </main>

      {/* Quiet Minimal Footer */}
      <footer className="border-t border-[#1A1F25] py-5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-[#64748B]">
          <span>Bicara · Spoken Transaction Verification &amp; accessible-signing Layer on Solana</span>
          <span>Dev3pack Global Hackathon Prototype · Nov 27–29, 2026</span>
        </div>
      </footer>
    </div>
  );
}
