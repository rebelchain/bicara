'use client';

import { useState } from 'react';
import { ArrowUpRight, Check, Copy, ExternalLink } from 'lucide-react';
import { truncateWallet, type TransactionRecord } from '@/lib/bicara-engine';

interface PhoneHistoryTabProps {
  transactions: TransactionRecord[];
}

export default function PhoneHistoryTab({ transactions }: PhoneHistoryTabProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [copiedSig, setCopiedSig] = useState<string | null>(null);

  const handleCopySig = async (sig: string) => {
    try {
      await navigator.clipboard.writeText(sig);
      setCopiedSig(sig);
      setTimeout(() => setCopiedSig((prev) => (prev === sig ? null : prev)), 1500);
    } catch {
      // ignore
    }
  };

  const formatTime = (iso: string) => {
    try {
      const date = new Date(iso);
      return date.toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return '--:--';
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="pb-3 border-b border-[#1E2329]">
        <h2 className="text-sm font-semibold text-[#F8FAFC]">Riwayat Transaksi</h2>
        <p className="text-[11px] text-[#64748B] font-mono tabular-nums">
          {transactions.length} transaksi Devnet · Tersimpan di Supabase
        </p>
      </div>

      <div className="flex-1 overflow-y-auto space-y-2.5 pt-3 pr-0.5">
        {transactions.length === 0 ? (
          <div className="py-10 text-center text-xs text-[#94A3B8]">
            Belum ada transaksi terkirim. Coba ucapkan &ldquo;Kirim 5 dolar ke Ahmad&rdquo;.
          </div>
        ) : (
          transactions.map((tx) => {
            const isExpanded = expandedId === tx.id;
            return (
              <div
                key={tx.id}
                className="p-3 bg-[#14171A] border border-[#22272D] rounded-xl space-y-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 text-sm font-medium text-[#F8FAFC]">
                      <ArrowUpRight className="w-3.5 h-3.5 text-[#22C55E] shrink-0" aria-hidden="true" />
                      <span className="truncate">{tx.recipientName}</span>
                    </div>
                    <p className="mt-0.5 text-[11px] text-[#94A3B8] truncate">
                      &ldquo;{tx.voiceTranscript}&rdquo;
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-sm font-semibold font-mono tabular-nums text-[#F8FAFC]">
                      -{tx.amountUsdc.toFixed(2)} {tx.currency}
                    </div>
                    <div className="text-[11px] text-[#64748B] font-mono tabular-nums">
                      {formatTime(tx.createdAt)} ·{' '}
                      <span className="text-[#4ADE80]">Confirmed</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1.5 border-t border-[#1E2329] text-[11px]">
                  <span className="text-[#64748B] font-mono">
                    {truncateWallet(tx.recipientWallet, 4, 4)} ·{' '}
                    {tx.resolutionSource === 'on_chain' ? 'PDA' : 'Supabase'}
                  </span>
                  <button
                    type="button"
                    onClick={() => setExpandedId(isExpanded ? null : tx.id)}
                    className="inline-flex items-center gap-1 text-[#4ADE80] hover:underline cursor-pointer"
                  >
                    <span>{isExpanded ? 'Tutup Bukti' : 'Explorer Proof'}</span>
                    <ExternalLink className="w-3 h-3" aria-hidden="true" />
                  </button>
                </div>

                {isExpanded && (
                  <div className="p-2.5 bg-[#0B0D0E] border border-[#22272D] rounded-lg space-y-1.5 text-[11px] font-mono">
                    <div className="flex items-center justify-between text-[#94A3B8]">
                      <span>Solana Devnet Signature</span>
                      <button
                        type="button"
                        onClick={() => handleCopySig(tx.txSignature)}
                        className="inline-flex items-center gap-1 text-[#CBD5E1] hover:text-[#F8FAFC] cursor-pointer"
                      >
                        {copiedSig === tx.txSignature ? (
                          <>
                            <Check className="w-3 h-3 text-[#22C55E]" />
                            <span className="text-[#22C55E]">Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span>Copy</span>
                          </>
                        )}
                      </button>
                    </div>
                    <div className="text-[#86EFAC] break-all leading-snug">
                      {tx.txSignature}
                    </div>
                    <div className="text-[#64748B]">
                      Instruction: TransferChecked · raw={tx.rawUnits} (6 decimals)
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
