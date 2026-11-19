'use client';

import { useState } from 'react';
import { Check, Copy, Plus, Search, Trash2, X } from 'lucide-react';
import {
  DEMO_SENDER_WALLET,
  deriveSimulatedPda,
  normalizeContactSeed,
  truncateWallet,
  validateSolanaAddress,
  type Contact,
} from '@/lib/bicara-engine';

interface PhoneContactsTabProps {
  contacts: Contact[];
  onAddContact: (contact: Contact) => void;
  onDeleteContact: (id: string) => void;
  onSelectForQuickSend: (name: string) => void;
  prefillName?: string | null;
  onClearPrefill?: () => void;
}

export default function PhoneContactsTab({
  contacts,
  onAddContact,
  onDeleteContact,
  onSelectForQuickSend,
  prefillName,
  onClearPrefill,
}: PhoneContactsTabProps) {
  const [search, setSearch] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(Boolean(prefillName));
  const [nameInput, setNameInput] = useState(prefillName ?? '');
  const [walletInput, setWalletInput] = useState('');
  const [registerOnChain, setRegisterOnChain] = useState(true);
  const [formError, setFormError] = useState<string | null>(null);

  const filtered = contacts.filter((c) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return c.name.toLowerCase().includes(q) || c.wallet.toLowerCase().includes(q);
  });

  const handleCopy = async (id: string, wallet: string) => {
    try {
      await navigator.clipboard.writeText(wallet);
      setCopiedId(id);
      setTimeout(() => setCopiedId((prev) => (prev === id ? null : prev)), 1500);
    } catch {
      // Clipboard unavailable
    }
  };

  const handleOpenAdd = () => {
    setFormError(null);
    setNameInput(prefillName ?? '');
    setWalletInput('');
    setShowAdd(true);
  };

  const handleCloseAdd = () => {
    setShowAdd(false);
    setFormError(null);
    onClearPrefill?.();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = nameInput.trim();
    const trimmedWallet = walletInput.trim();

    if (!trimmedName) {
      setFormError('Nama kontak wajib diisi (1–50 karakter).');
      return;
    }
    if (trimmedName.length > 50) {
      setFormError('Nama kontak maksimal 50 karakter untuk PDA ContactRegistry.');
      return;
    }
    if (
      contacts.some(
        (c) => normalizeContactSeed(c.name) === normalizeContactSeed(trimmedName)
      )
    ) {
      setFormError(`Kontak "${trimmedName}" sudah terdaftar.`);
      return;
    }
    if (!validateSolanaAddress(trimmedWallet)) {
      setFormError('Alamat wallet Solana tidak valid (harus Base58 32–44 karakter).');
      return;
    }

    const newContact: Contact = {
      id: `cnt-${Date.now()}`,
      name: trimmedName,
      wallet: trimmedWallet,
      onChain: registerOnChain,
      pdaAddress: registerOnChain
        ? deriveSimulatedPda(DEMO_SENDER_WALLET, trimmedName)
        : undefined,
      hasUsdcAta: true,
      balanceUsdc: 0,
      createdAt: new Date().toISOString(),
    };

    onAddContact(newContact);
    setNameInput('');
    setWalletInput('');
    setFormError(null);
    setShowAdd(false);
    onClearPrefill?.();
  };

  const handleFillSampleWallet = () => {
    setWalletInput('8pQr4tV7wX2zA5bC9dE3fG6hJ1kL8nP4qR7sT2uW9vY6');
    setFormError(null);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between gap-2 pb-3 border-b border-[#1E2329]">
        <div>
          <h2 className="text-sm font-semibold text-[#F8FAFC]">Kontak</h2>
          <p className="text-[11px] text-[#64748B] font-mono tabular-nums">
            {contacts.length} tersimpan · {contacts.filter((c) => c.onChain).length} on-chain PDA
          </p>
        </div>
        <button
          type="button"
          onClick={handleOpenAdd}
          aria-label="Tambah kontak baru"
          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-[#052E16] bg-[#22C55E] hover:bg-[#16A34A] rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Tambah</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="relative my-3">
        <Search
          className="w-3.5 h-3.5 text-[#64748B] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
          aria-hidden="true"
        />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Cari nama atau alamat wallet..."
          aria-label="Cari kontak"
          className="w-full pl-8 pr-3 py-2 text-xs bg-[#14171A] border border-[#23282E] rounded-lg text-[#F8FAFC] placeholder:text-[#64748B] focus:outline-none focus:border-[#22C55E]"
        />
      </div>

      {/* Add Contact Inline Modal */}
      {showAdd && (
        <form
          onSubmit={handleSubmit}
          aria-label="Form tambah kontak"
          className="mb-3 p-3.5 bg-[#14171A] border border-[#2A313A] rounded-xl space-y-2.5"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#F8FAFC]">Tambah Kontak Baru</span>
            <button
              type="button"
              onClick={handleCloseAdd}
              aria-label="Tutup form kontak"
              className="p-1 text-[#64748B] hover:text-[#F8FAFC] cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-1">
            <label htmlFor="contact-name-input" className="block text-[11px] text-[#94A3B8]">
              Nama Panggilan (dipakai saat bicara)
            </label>
            <input
              id="contact-name-input"
              type="text"
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              placeholder="Contoh: Dewi"
              className="w-full px-2.5 py-1.5 text-xs bg-[#0B0D0E] border border-[#262B30] rounded-lg text-[#F8FAFC] placeholder:text-[#64748B] focus:outline-none focus:border-[#22C55E]"
            />
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label htmlFor="contact-wallet-input" className="block text-[11px] text-[#94A3B8]">
                Alamat Wallet Solana (Devnet)
              </label>
              <button
                type="button"
                onClick={handleFillSampleWallet}
                className="text-[11px] text-[#4ADE80] hover:underline cursor-pointer"
              >
                Isi contoh valid
              </button>
            </div>
            <input
              id="contact-wallet-input"
              type="text"
              value={walletInput}
              onChange={(e) => setWalletInput(e.target.value)}
              placeholder="Base58 public key..."
              className="w-full px-2.5 py-1.5 text-xs font-mono bg-[#0B0D0E] border border-[#262B30] rounded-lg text-[#F8FAFC] placeholder:text-[#64748B] focus:outline-none focus:border-[#22C55E]"
            />
          </div>

          <label className="flex items-start gap-2 text-[11px] text-[#CBD5E1] cursor-pointer pt-0.5">
            <input
              type="checkbox"
              checked={registerOnChain}
              onChange={(e) => setRegisterOnChain(e.target.checked)}
              className="mt-0.5 accent-[#22C55E]"
            />
            <span>
              Daftar ke Anchor <span className="font-mono text-[#86EFAC]">ContactRegistry</span> PDA
              (~0.002 SOL rent)
            </span>
          </label>

          {formError && (
            <p role="alert" className="text-[11px] text-[#F87171]">
              {formError}
            </p>
          )}

          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={handleCloseAdd}
              className="px-3 py-1.5 text-xs text-[#94A3B8] hover:text-[#F8FAFC] cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-3 py-1.5 text-xs font-medium text-[#052E16] bg-[#22C55E] hover:bg-[#16A34A] rounded-lg transition-colors cursor-pointer"
            >
              Simpan Kontak
            </button>
          </div>
        </form>
      )}

      {/* Contacts List */}
      <div className="flex-1 overflow-y-auto space-y-2 pr-0.5">
        {filtered.length === 0 ? (
          <div className="py-10 text-center space-y-1.5">
            <p className="text-xs text-[#94A3B8]">Kontak tidak ditemukan.</p>
            <button
              type="button"
              onClick={handleOpenAdd}
              className="text-xs font-medium text-[#22C55E] hover:underline cursor-pointer"
            >
              Tambah kontak baru
            </button>
          </div>
        ) : (
          filtered.map((contact) => (
            <div
              key={contact.id}
              className="p-3 bg-[#14171A] border border-[#22272D] rounded-xl flex items-center justify-between gap-2"
            >
              <button
                type="button"
                onClick={() => onSelectForQuickSend(contact.name)}
                className="min-w-0 flex-1 text-left cursor-pointer group"
                aria-label={`Kirim cepat ke ${contact.name}`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-[#F8FAFC] group-hover:text-[#22C55E] transition-colors truncate">
                    {contact.name}
                  </span>
                  <span className="text-[11px] text-[#64748B]">·</span>
                  <span
                    className={`text-[11px] ${
                      contact.onChain ? 'text-[#4ADE80]' : 'text-[#94A3B8]'
                    }`}
                  >
                    {contact.onChain ? 'On-chain PDA' : 'Supabase'}
                  </span>
                </div>
                <div className="mt-0.5 font-mono text-[11px] text-[#94A3B8] tabular-nums">
                  {truncateWallet(contact.wallet, 5, 4)}
                  {!contact.hasUsdcAta && (
                    <span className="text-[#F59E0B]"> · Tanpa USDC ATA</span>
                  )}
                </div>
              </button>

              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => handleCopy(contact.id, contact.wallet)}
                  aria-label={`Salin alamat ${contact.name}`}
                  className="p-2 text-[#94A3B8] hover:text-[#F8FAFC] rounded-lg hover:bg-[#1D2228] transition-colors cursor-pointer"
                >
                  {copiedId === contact.id ? (
                    <Check className="w-3.5 h-3.5 text-[#22C55E]" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => onDeleteContact(contact.id)}
                  aria-label={`Hapus kontak ${contact.name}`}
                  className="p-2 text-[#64748B] hover:text-[#F87171] rounded-lg hover:bg-[#1D2228] transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
