export type Currency = 'USDC' | 'SOL';
export type PhoneTabId = 'home' | 'contacts' | 'history';
export type SpeakerKind = 'owner' | 'impostor';
export type HapticPatternId = 'listen' | 'tick' | 'confirm' | 'success' | 'error';

export type VoiceAction =
  | 'send'
  | 'navigate'
  | 'check_balance'
  | 'list_contacts'
  | 'read_history'
  | 'confirm'
  | 'cancel'
  | 'repeat'
  | 'help'
  | 'unknown';

export interface PaymentIntent {
  action: VoiceAction;
  targetTab?: PhoneTabId | null;
  amount: number | null;
  currency: Currency | null;
  recipient: string | null;
  confidence: 'high' | 'low';
  raw_amount_text: string | null;
}

export interface Contact {
  id: string;
  name: string;
  wallet: string;
  onChain: boolean;
  pdaAddress?: string;
  hasUsdcAta: boolean;
  balanceUsdc: number;
  createdAt: string;
}

export interface TransactionRecord {
  id: string;
  recipientName: string;
  recipientWallet: string;
  amountUsdc: number;
  rawUnits: string;
  currency: Currency;
  voiceTranscript: string;
  txSignature: string;
  status: 'confirmed' | 'failed';
  resolutionSource: 'supabase' | 'on_chain';
  createdAt: string;
}

export interface IntentValidation {
  valid: boolean;
  missingField: 'amount' | 'recipient' | null;
  promptText: string | null;
}

export interface ContactResolution {
  status: 'found' | 'not_found' | 'ambiguous';
  contact: Contact | null;
  candidates: Contact[];
  source: 'supabase' | 'on_chain' | null;
}

export interface VoiceprintProfile {
  ownerLabel: string;
  boundWallet: string;
  enrolled: boolean;
  enrollmentStepsDone: number;
  threshold: number;
}

export interface VoiceprintCheckResult {
  verified: boolean;
  bypassed: boolean;
  score: number;
  scorePct: number;
  threshold: number;
  speakerLabel: string;
  haptic: HapticPatternId;
  spokenMessage: string | null;
}

export interface OnboardingStepSpec {
  index: number;
  id: 'welcome' | 'wallet' | 'phrase_1' | 'phrase_2' | 'phrase_3' | 'complete';
  title: string;
  progressPct: number;
  promptPhrase?: string;
  spokenInstruction: string;
  haptic: HapticPatternId;
}

export interface TransferInstructionSummary {
  program: '@solana-program/token (TransferChecked)';
  mint: string;
  decimals: 6;
  rawAmount: string;
  sourceAta: string;
  destinationAta: string;
  requiresAtaInit: boolean;
  estimatedFeeSol: number;
}

export interface TransferExecutionResult {
  ok: boolean;
  errorCode?:
    | 'WALLET_DISCONNECTED'
    | 'UNCONFIRMED'
    | 'INVALID_AMOUNT'
    | 'INSUFFICIENT_BALANCE'
    | 'MISSING_ATA';
  spokenMessage: string;
  nextSenderBalance: number;
  tx?: TransactionRecord;
  instruction?: TransferInstructionSummary;
}

export const USDC_MINT_DEVNET = '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU';
export const USDC_DECIMALS = 6;
export const DEMO_SENDER_WALLET = '5vNq9cR2mK8pL4xW7bT1yF6dH3jE9aZ2uC4sQ8nV1kM7';
export const DEMO_SENDER_ATA = '9aLk3mP8xV2nR5cT7wB1yD4fG6hJ2kN9qS3vW5zX8bC1';

export const DEFAULT_VOICEPRINT_PROFILE: VoiceprintProfile = {
  ownerLabel: 'User A (Azhar)',
  boundWallet: DEMO_SENDER_WALLET,
  enrolled: true,
  enrollmentStepsDone: 3,
  threshold: 0.75,
};

export const HAPTIC_DESCRIPTIONS: Record<HapticPatternId, { label: string; pattern: string }> = {
  listen: {
    label: 'Single Pulse · Listening',
    pattern: 'impactAsync(Medium)',
  },
  tick: {
    label: 'Soft Tick · Nav / Milestone',
    pattern: 'impactAsync(Light)',
  },
  confirm: {
    label: 'Double Pulse · Confirm Required',
    pattern: 'notificationAsync(Warning)',
  },
  success: {
    label: 'Long Pulse · Confirmed',
    pattern: 'notificationAsync(Success)',
  },
  error: {
    label: 'Triple Pulse · Blocked / Error',
    pattern: 'notificationAsync(Error)',
  },
};

export const ONBOARDING_STEPS: OnboardingStepSpec[] = [
  {
    index: 0,
    id: 'welcome',
    title: 'Selamat Datang di Bicara',
    progressPct: 0,
    spokenInstruction:
      'Selamat datang di Bicara, dompet USDC berbasis suara di Solana Mobile. Semua menu dibacakan otomatis dan kamu cukup sentuh layar di mana saja untuk bicara.',
    haptic: 'tick',
  },
  {
    index: 1,
    id: 'wallet',
    title: 'Hubungkan Dompet Solana Mobile',
    progressPct: 15,
    spokenInstruction:
      'Langkah pertama, kita hubungkan dompet Solana Mobile kamu lewat Mobile Wallet Adapter dan Seed Vault agar tanda tangan transaksi selalu terlindungi.',
    haptic: 'tick',
  },
  {
    index: 2,
    id: 'phrase_1',
    title: 'Daftar Sidik Suara (1/3)',
    progressPct: 33,
    promptPhrase: 'Bicara adalah dompet suara saya',
    spokenInstruction:
      'Sekarang daftarkan sidik suara pemilik dompet. Contoh pertama, ucapkan: Bicara adalah dompet suara saya.',
    haptic: 'listen',
  },
  {
    index: 3,
    id: 'phrase_2',
    title: 'Daftar Sidik Suara (2/3)',
    progressPct: 66,
    promptPhrase: 'Kirim lima dolar ke kontak saya',
    spokenInstruction:
      'Bagus, 33 persen terekam. Contoh kedua, ucapkan: Kirim lima dolar ke kontak saya.',
    haptic: 'tick',
  },
  {
    index: 4,
    id: 'phrase_3',
    title: 'Daftar Sidik Suara (3/3)',
    progressPct: 100,
    promptPhrase: 'Cek saldo dompet Solana saya',
    spokenInstruction:
      'Hampir selesai, 66 persen terekam. Terakhir, ucapkan: Cek saldo dompet Solana saya.',
    haptic: 'tick',
  },
  {
    index: 5,
    id: 'complete',
    title: 'Sidik Suara Terverifikasi',
    progressPct: 100,
    spokenInstruction:
      'Sidik suara aktif 100 persen dan terikat ke dompet kamu. Ucapkan cek saldo, buka kontak, buka riwayat, bantuan, atau kirim 5 dolar ke Ahmad.',
    haptic: 'success',
  },
];

export const SEED_CONTACTS: Contact[] = [
  {
    id: 'cnt-ahmad',
    name: 'Ahmad',
    wallet: '7xKp4mN9qR2vT8wB3yD6fH1jL5nP9sV2xZ4cE7gJ3mN3',
    onChain: true,
    pdaAddress: '4pDa8kR2mW6xT9vB1yC3fH5jL7nQ9sU2wZ4eA6cM8pK2',
    hasUsdcAta: true,
    balanceUsdc: 12.5,
    createdAt: '2026-11-18T09:15:00Z',
  },
  {
    id: 'cnt-budi',
    name: 'Budi',
    wallet: '9mXr2tV5wY8zA1bC4dE7fG0hJ3kL6nP9qR2sT5uW8pQ2',
    onChain: true,
    pdaAddress: '6pDb3nS7wX1zC4vM9bK2fH8jL5qR1tU3yE7aD9gN4mW8',
    hasUsdcAta: true,
    balanceUsdc: 40.0,
    createdAt: '2026-11-18T11:30:00Z',
  },
  {
    id: 'cnt-siti',
    name: 'Siti',
    wallet: '3kLm8nP2qR5sT7uV9wX1yZ4aB6cD8eF2gH5jK9mN4wR9',
    onChain: false,
    hasUsdcAta: true,
    balanceUsdc: 8.75,
    createdAt: '2026-11-18T14:20:00Z',
  },
  {
    id: 'cnt-raka',
    name: 'Raka',
    wallet: '6hJk2mN5pQ8rS1tU4vW7xY9zA3bC6dE8fG1hJ4kL7nM5',
    onChain: false,
    hasUsdcAta: false,
    balanceUsdc: 0,
    createdAt: '2026-11-19T07:05:00Z',
  },
];

export const SEED_TRANSACTIONS: TransactionRecord[] = [
  {
    id: 'tx-seed-1',
    recipientName: 'Budi',
    recipientWallet: '9mXr2tV5wY8zA1bC4dE7fG0hJ3kL6nP9qR2sT5uW8pQ2',
    amountUsdc: 10,
    rawUnits: '10000000',
    currency: 'USDC',
    voiceTranscript: 'transfer sepuluh dolar ke Budi',
    txSignature: '5xK9mN2pQ7rS4tU8vW1yZ3aB6cD9eF2gH5jK8mN1pQ4rS7tU9vW2xY5zA8bC',
    status: 'confirmed',
    resolutionSource: 'supabase',
    createdAt: '2026-11-19T01:12:00Z',
  },
  {
    id: 'tx-seed-2',
    recipientName: 'Ahmad',
    recipientWallet: '7xKp4mN9qR2vT8wB3yD6fH1jL5nP9sV2xZ4cE7gJ3mN3',
    amountUsdc: 3.5,
    rawUnits: '3500000',
    currency: 'USDC',
    voiceTranscript: 'kirim 3.5 USDC ke Ahmad',
    txSignature: '2mP8qR5sT1uV4wX7yZ9aB2cD5eF8gH1jK4mN7pQ9rS2tU5vW8xY1zA4bC7dE',
    status: 'confirmed',
    resolutionSource: 'on_chain',
    createdAt: '2026-11-18T18:45:00Z',
  },
];

export const VOICE_SCRIPTS = {
  confirmSend: (amount: number, currency: string, name: string) =>
    `Konfirmasi: kirim ${formatAmountSpeech(amount)} ${currency} ke ${name}? Ucapkan ya untuk konfirmasi atau batal untuk membatalkan.`,
  success: (amount: number, currency: string, name: string) =>
    `Berhasil. Kamu mengirim ${formatAmountSpeech(amount)} ${currency} ke ${name}.`,
  contactNotFound: (name: string) =>
    `Kontak ${name} tidak ditemukan. Mau tambah ke daftar kontak?`,
  ambiguousContact: (names: string[]) =>
    `Ada beberapa kontak cocok: ${names.join(', ')}. Pilih penerima yang benar.`,
  insufficientBalance: (balance: number, currency: string) =>
    `Saldo tidak cukup. Kamu punya ${balance.toFixed(2)} ${currency}.`,
  walletDisconnected: () =>
    `Hubungkan dompet Solana Mobile terlebih dahulu sebelum mengirim.`,
  unknownIntent: () =>
    `Maaf, aku tidak mengerti. Coba ucapkan: cek saldo, buka kontak, atau kirim 5 dolar ke Ahmad.`,
  askAmount: (name: string) =>
    `Berapa USDC yang ingin dikirim ke ${name}?`,
  askRecipient: (amount: number, currency: string) =>
    `Kirim ${formatAmountSpeech(amount)} ${currency} kepada siapa?`,
  missingAta: (name: string) =>
    `${name} belum punya USDC token account. Transaksi akan menyertakan biaya inisialisasi ATA sekitar 0.002 SOL.`,
  balanceReadout: (usdc: number, sol: number) =>
    `Saldo kamu saat ini ${usdc.toFixed(2)} USDC dan ${sol.toFixed(2)} SOL untuk biaya jaringan.`,
  helpGuide: () =>
    `Panduan suara Bicara: ucapkan cek saldo, buka kontak, buka riwayat, kembali ke beranda, ulangi, atau kirim 5 dolar ke Ahmad.`,
  voiceprintBlocked: (scorePct: number) =>
    `Suara tidak cocok dengan pemilik dompet (${scorePct} persen). Akses diblokir demi keamanan.`,
  voiceprintUnenrolled: () =>
    `Sidik suara pemilik belum didaftarkan. Selesaikan panduan onboarding suara terlebih dahulu.`,
  noPendingConfirm: () =>
    `Tidak ada transaksi yang menunggu konfirmasi saat ini.`,
};

function formatAmountSpeech(amount: number): string {
  return Number.isInteger(amount) ? String(amount) : amount.toFixed(2);
}

/**
 * Generates concise Indonesian spoken narration when entering any mobile navbar tab.
 */
export function narrateTabScreen(
  tab: PhoneTabId,
  ctx: {
    walletConnected: boolean;
    senderBalanceUsdc: number;
    senderBalanceSol: number;
    contacts: Contact[];
    transactions: TransactionRecord[];
  }
): string {
  if (tab === 'home') {
    if (!ctx.walletConnected) {
      return 'Halaman Beranda. Dompet Solana belum terhubung. Ketuk hubungkan dompet untuk mulai.';
    }
    return `Halaman Beranda. Saldo kamu ${ctx.senderBalanceUsdc.toFixed(2)} USDC. Sentuh layar di mana saja lalu bicara.`;
  }

  if (tab === 'contacts') {
    if (ctx.contacts.length === 0) {
      return 'Halaman Kontak. Belum ada kontak tersimpan. Ketuk tambah kontak untuk menyimpan alamat baru.';
    }
    const topNames = ctx.contacts.slice(0, 4).map((c) => c.name).join(', ');
    const onChainCount = ctx.contacts.filter((c) => c.onChain).length;
    return `Halaman Kontak. Kamu punya ${ctx.contacts.length} kontak (${onChainCount} terverifikasi on-chain): ${topNames}. Sebutkan nama untuk mengirim, atau ucapkan kembali ke beranda.`;
  }

  if (ctx.transactions.length === 0) {
    return 'Halaman Riwayat. Belum ada transaksi terkirim.';
  }
  const latest = ctx.transactions[0];
  return `Halaman Riwayat. Ada ${ctx.transactions.length} transaksi. Terakhir: kirim ${formatAmountSpeech(latest.amountUsdc)} ${latest.currency} ke ${latest.recipientName}, status terkonfirmasi.`;
}

const UNPROTECTED_SAFE_ACTIONS = new Set<VoiceAction>(['help', 'repeat']);

/**
 * Evaluates Factor 1 on-device voiceprint verification (Picovoice Eagle model simulation).
 * Safe guidance actions (help/repeat) remain accessible even if speaker check fails.
 */
export function verifySpeakerVoiceprint(
  profile: VoiceprintProfile,
  speakerKind: SpeakerKind,
  action?: VoiceAction
): VoiceprintCheckResult {
  if (action && UNPROTECTED_SAFE_ACTIONS.has(action)) {
    return {
      verified: true,
      bypassed: true,
      score: speakerKind === 'owner' ? 0.94 : 0.28,
      scorePct: speakerKind === 'owner' ? 94 : 28,
      threshold: profile.threshold,
      speakerLabel: speakerKind === 'owner' ? profile.ownerLabel : 'Suara Tidak Dikenal',
      haptic: 'tick',
      spokenMessage: null,
    };
  }

  if (!profile.enrolled) {
    return {
      verified: false,
      bypassed: false,
      score: 0,
      scorePct: 0,
      threshold: profile.threshold,
      speakerLabel: 'Belum Terdaftar',
      haptic: 'error',
      spokenMessage: VOICE_SCRIPTS.voiceprintUnenrolled(),
    };
  }

  const score = speakerKind === 'owner' ? 0.94 : 0.28;
  const scorePct = Math.round(score * 100);
  const verified = score >= profile.threshold;

  return {
    verified,
    bypassed: false,
    score,
    scorePct,
    threshold: profile.threshold,
    speakerLabel: verified ? profile.ownerLabel : 'Suara Tidak Dikenal (Impostor)',
    haptic: verified ? 'tick' : 'error',
    spokenMessage: verified ? null : VOICE_SCRIPTS.voiceprintBlocked(scorePct),
  };
}

/**
 * Converts a decimal USDC amount to exact 6-decimal raw integer units (BigInt).
 */
export function usdcToRawUnits(amount: number): bigint {
  if (!Number.isFinite(amount) || amount < 0) {
    throw new Error('USDC amount must be a non-negative finite number');
  }
  const scaled = Math.round(amount * 1_000_000);
  return BigInt(scaled);
}

export function truncateWallet(address: string, head = 4, tail = 4): string {
  if (!address || address.length <= head + tail + 3) return address;
  return `${address.slice(0, head)}...${address.slice(-tail)}`;
}

const BASE58_SOLANA_REGEX = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

export function validateSolanaAddress(address: string): boolean {
  return BASE58_SOLANA_REGEX.test(address.trim());
}

export function normalizeContactSeed(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, ' ');
}

const BASE58_ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';

/**
 * Deterministic preview PDA generator for web prototype simulation.
 */
export function deriveSimulatedPda(ownerWallet: string, name: string): string {
  const input = `contact:${ownerWallet}:${normalizeContactSeed(name)}`;
  let h1 = 0x811c9dc5;
  let h2 = 0x9e3779b9;
  for (let i = 0; i < input.length; i++) {
    const ch = input.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 0x01000193) >>> 0;
    h2 = Math.imul(h2 ^ (ch + i), 0x85ebca6b) >>> 0;
  }
  let out = 'Pda';
  let state = (BigInt(h1) << BigInt(32)) | BigInt(h2);
  const mult = BigInt('6364136223846793005');
  const inc = BigInt('1442695040888963407');
  const mask = (BigInt(1) << BigInt(64)) - BigInt(1);
  const shift56 = BigInt(56);
  const alphaLen = BigInt(BASE58_ALPHABET.length);
  for (let i = 0; i < 41; i++) {
    state = (state * mult + inc) & mask;
    const idx = Number((state >> shift56) % alphaLen);
    out += BASE58_ALPHABET[idx];
  }
  return out;
}

export function generateSimulatedSignature(seedText: string): string {
  let state = BigInt('0x517cc1b727220a95');
  const prime = BigInt('1099511628211');
  const mult = BigInt('6364136223846793005');
  const inc = BigInt('1442695040888963407');
  const mask = (BigInt(1) << BigInt(64)) - BigInt(1);
  const shift56 = BigInt(56);
  const alphaLen = BigInt(BASE58_ALPHABET.length);
  for (let i = 0; i < seedText.length; i++) {
    state = ((state ^ BigInt(seedText.charCodeAt(i))) * prime) & mask;
  }
  let out = '';
  for (let i = 0; i < 64; i++) {
    state = (state * mult + inc) & mask;
    const idx = Number((state >> shift56) % alphaLen);
    out += BASE58_ALPHABET[idx];
  }
  return out;
}

export function buildScribeKeyterms(contacts: Contact[]): string[] {
  const baseTerms = [
    'USDC',
    'SOL',
    'Solana',
    'dolar',
    'kirim',
    'transfer',
    'Bicara',
    'buka kontak',
    'buka riwayat',
    'cek saldo',
    'beranda',
    'ulangi',
    'bantuan',
    'konfirmasi',
    'batal',
  ];
  const names = contacts.map((c) => c.name.trim()).filter(Boolean);
  return Array.from(new Set([...baseTerms, ...names])).slice(0, 100);
}

const WORD_NUMBERS: Record<string, number> = {
  nol: 0,
  zero: 0,
  satu: 1,
  se: 1,
  one: 1,
  dua: 2,
  two: 2,
  tiga: 3,
  three: 3,
  empat: 4,
  four: 4,
  lima: 5,
  five: 5,
  enam: 6,
  six: 6,
  tujuh: 7,
  seven: 7,
  delapan: 8,
  eight: 8,
  sembilan: 9,
  nine: 9,
  sepuluh: 10,
  ten: 10,
  sebelas: 11,
  eleven: 11,
  twelve: 12,
  thirteen: 13,
  fourteen: 14,
  fifteen: 15,
  sixteen: 16,
  seventeen: 17,
  eighteen: 18,
  nineteen: 19,
  twenty: 20,
  thirty: 30,
  forty: 40,
  fifty: 50,
  sixty: 60,
  seventy: 70,
  eighty: 80,
  ninety: 90,
  setengah: 0.5,
  half: 0.5,
};

export function parseSpokenNumber(phrase: string): number | null {
  const cleaned = phrase.trim().toLowerCase().replace(/,/g, '.');
  if (!cleaned) return null;

  const directNum = cleaned.match(/^(\d+(?:\.\d+)?)$/);
  if (directNum) {
    return parseFloat(directNum[1]);
  }

  const tokens = cleaned.split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return null;

  let total = 0;
  let current = 0;
  let matchedAny = false;

  for (let i = 0; i < tokens.length; i++) {
    const tok = tokens[i];

    if (/^\d+(?:\.\d+)?$/.test(tok)) {
      current += parseFloat(tok);
      matchedAny = true;
      continue;
    }

    if (tok === 'belas') {
      current = current === 0 ? 10 : current + 10;
      matchedAny = true;
      continue;
    }

    if (tok === 'puluh') {
      current = (current === 0 ? 1 : current) * 10;
      matchedAny = true;
      continue;
    }

    if (tok === 'seratus') {
      current += 100;
      matchedAny = true;
      continue;
    }

    if (tok === 'ratus' || tok === 'hundred') {
      current = (current === 0 ? 1 : current) * 100;
      matchedAny = true;
      continue;
    }

    if (tok === 'seribu') {
      total += 1000;
      current = 0;
      matchedAny = true;
      continue;
    }

    if (tok === 'ribu' || tok === 'thousand') {
      total += (current === 0 ? 1 : current) * 1000;
      current = 0;
      matchedAny = true;
      continue;
    }

    if (tok === 'setengah' || tok === 'half') {
      current += 0.5;
      matchedAny = true;
      continue;
    }

    if (tok in WORD_NUMBERS) {
      current += WORD_NUMBERS[tok];
      matchedAny = true;
      continue;
    }

    break;
  }

  if (!matchedAny) return null;
  const result = total + current;
  return result > 0 ? Number(result.toFixed(6)) : null;
}

const SEND_VERBS_REGEX =
  /\b(kirim|kirimin|kirimkan|transfer|bayar|kasih|send|pay|wire)\b/i;

const CURRENCY_SOL_REGEX = /\b(sol|solana)\b/i;

const NUMBER_WORDS_SET = new Set([
  ...Object.keys(WORD_NUMBERS),
  'belas',
  'puluh',
  'ratus',
  'seratus',
  'ribu',
  'seribu',
  'hundred',
  'thousand',
]);

function capitalizeName(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .map((part) => (part ? part[0].toUpperCase() + part.slice(1).toLowerCase() : ''))
    .join(' ');
}

function emptyNavIntent(
  action: VoiceAction,
  targetTab: PhoneTabId | null = null
): PaymentIntent {
  return {
    action,
    targetTab,
    amount: null,
    currency: null,
    recipient: null,
    confidence: 'high',
    raw_amount_text: null,
  };
}

/**
 * Unified deterministic bilingual (Indonesian + English) intent parser.
 * Handles Eyes-Free navigation, balance/contact/history queries, confirmation, and payments.
 */
export function parseIntentFallback(transcript: string): PaymentIntent {
  const clean = transcript.trim();
  const lower = clean.toLowerCase().replace(/[?!.,]/g, ' ').replace(/\s+/g, ' ').trim();
  if (!lower) {
    return emptyNavIntent('unknown');
  }

  // 1. Explicit voice confirmation / cancellation
  if (/^(ya|iya|yes|konfirmasi|confirm|setuju|lanjut|ok|oke|oke kirim|ya kirim)$/.test(lower)) {
    return emptyNavIntent('confirm');
  }
  if (/^(batal|batalkan|cancel|jangan|tidak|no|stop)$/.test(lower)) {
    return emptyNavIntent('cancel');
  }

  // 2. Eyes-Free Accessibility Helpers (Repeat / Help)
  if (/\b(ulangi|ulang|repeat|baca ulang)\b/.test(lower)) {
    return emptyNavIntent('repeat');
  }
  if (/\b(bantuan|panduan|help|tolong bantu|perintah apa|menu suara)\b/.test(lower)) {
    return emptyNavIntent('help');
  }

  // 3. Balance Readout
  if (/\b(saldo|balance)\b/.test(lower) && !SEND_VERBS_REGEX.test(lower)) {
    return emptyNavIntent('check_balance');
  }

  // 4. List Contacts / Navigate to Contacts
  if (/\b(baca kontak|daftar kontak|siapa saja kontak|siapa kontak|list contacts|read contacts)\b/.test(lower)) {
    return emptyNavIntent('list_contacts', 'contacts');
  }
  if (/\b(buka|ke|halaman|tab|open|go to)\s+(kontak|contacts?)\b/.test(lower) || lower === 'kontak' || lower === 'contacts') {
    return emptyNavIntent('navigate', 'contacts');
  }

  // 5. Read History / Navigate to History
  if (/\b(baca riwayat|transaksi terakhir|riwayat terakhir|read history|last transaction)\b/.test(lower)) {
    return emptyNavIntent('read_history', 'history');
  }
  if (/\b(buka|ke|halaman|tab|open|go to)\s+(riwayat|history|transaksi)\b/.test(lower) || lower === 'riwayat' || lower === 'history') {
    return emptyNavIntent('navigate', 'history');
  }

  // 6. Navigate Home
  if (/\b(beranda|home|halaman utama|menu utama)\b/.test(lower) && !SEND_VERBS_REGEX.test(lower)) {
    return emptyNavIntent('navigate', 'home');
  }

  // 7. Payment Send Intent
  if (!SEND_VERBS_REGEX.test(clean)) {
    return emptyNavIntent('unknown');
  }

  const currency: Currency = CURRENCY_SOL_REGEX.test(clean) ? 'SOL' : 'USDC';

  let recipient: string | null = null;
  const prepMatch = clean.match(
    /\b(?:ke|kepada|to|buat|untuk|for)\s+([a-zA-Z][a-zA-Z0-9_-]*(?:\s+[a-zA-Z][a-zA-Z0-9_-]*)?)/i
  );

  const STOP_TRAILING = new Set([
    'ya',
    'dong',
    'sekarang',
    'now',
    'please',
    'pls',
    'gak',
    'nggak',
    'usdc',
    'sol',
    'dolar',
    'dollar',
    'dollars',
    'usd',
    'bucks',
  ]);

  if (prepMatch) {
    const candidateParts = prepMatch[1]
      .trim()
      .split(/\s+/)
      .filter((w) => !STOP_TRAILING.has(w.toLowerCase()) && !NUMBER_WORDS_SET.has(w.toLowerCase()));
    if (candidateParts.length > 0) {
      recipient = capitalizeName(candidateParts[0]);
    }
  } else {
    const verbDirectMatch = clean.match(
      /\b(?:kirim|kirimin|kirimkan|transfer|bayar|send|pay)\s+([a-zA-Z]+)\s+(\d+|[a-zA-Z]+)/i
    );
    if (verbDirectMatch) {
      const maybeName = verbDirectMatch[1];
      if (
        !NUMBER_WORDS_SET.has(maybeName.toLowerCase()) &&
        !STOP_TRAILING.has(maybeName.toLowerCase())
      ) {
        recipient = capitalizeName(maybeName);
      }
    }
  }

  let amount: number | null = null;
  let rawAmountText: string | null = null;

  const numWithCurrency = clean.match(
    /(\$?\s*\d+(?:[.,]\d+)?(?:\s*(?:setengah|ribu|thousand))?\s*(?:usdc|dolar|dollar|dollars|usd|sol|solana|bucks)?)/i
  );
  if (numWithCurrency) {
    const rawNumericPart = numWithCurrency[1]
      .replace(/\$/g, '')
      .replace(/\b(usdc|dolar|dollar|dollars|usd|sol|solana|bucks)\b/gi, '')
      .trim();
    const parsed = parseSpokenNumber(rawNumericPart);
    if (parsed !== null) {
      amount = parsed;
      rawAmountText = numWithCurrency[1].trim();
    }
  }

  if (amount === null) {
    const words = clean.replace(/[?!.,]/g, ' ').split(/\s+/);
    const numSeq: string[] = [];
    for (const w of words) {
      const wLower = w.toLowerCase();
      if (NUMBER_WORDS_SET.has(wLower)) {
        numSeq.push(wLower);
      } else if (numSeq.length > 0) {
        break;
      }
    }
    if (numSeq.length > 0) {
      const parsed = parseSpokenNumber(numSeq.join(' '));
      if (parsed !== null) {
        amount = parsed;
        rawAmountText = numSeq.join(' ');
      }
    }
  }

  const confidence: 'high' | 'low' = amount !== null && recipient !== null ? 'high' : 'low';

  return {
    action: 'send',
    targetTab: null,
    amount,
    currency,
    recipient,
    confidence,
    raw_amount_text: rawAmountText,
  };
}

export function validateIntent(intent: PaymentIntent): IntentValidation {
  if (intent.action === 'unknown') {
    return {
      valid: false,
      missingField: null,
      promptText: VOICE_SCRIPTS.unknownIntent(),
    };
  }

  if (intent.action !== 'send') {
    return {
      valid: true,
      missingField: null,
      promptText: null,
    };
  }

  if (intent.amount === null || intent.amount <= 0) {
    return {
      valid: false,
      missingField: 'amount',
      promptText: intent.recipient
        ? VOICE_SCRIPTS.askAmount(intent.recipient)
        : 'Berapa yang ingin dikirim?',
    };
  }

  if (!intent.recipient) {
    return {
      valid: false,
      missingField: 'recipient',
      promptText: VOICE_SCRIPTS.askRecipient(intent.amount, intent.currency ?? 'USDC'),
    };
  }

  return {
    valid: true,
    missingField: null,
    promptText: null,
  };
}

export function resolveContact(contacts: Contact[], query: string): ContactResolution {
  const normalized = normalizeContactSeed(query);
  if (!normalized) {
    return { status: 'not_found', contact: null, candidates: [], source: null };
  }

  const exact = contacts.find((c) => normalizeContactSeed(c.name) === normalized);
  if (exact) {
    return {
      status: 'found',
      contact: exact,
      candidates: [exact],
      source: exact.onChain ? 'on_chain' : 'supabase',
    };
  }

  const fuzzy = contacts.filter((c) => {
    const target = normalizeContactSeed(c.name);
    return target.startsWith(normalized) || target.includes(normalized);
  });

  if (fuzzy.length === 1) {
    return {
      status: 'found',
      contact: fuzzy[0],
      candidates: fuzzy,
      source: 'supabase',
    };
  }

  if (fuzzy.length > 1) {
    return {
      status: 'ambiguous',
      contact: null,
      candidates: fuzzy,
      source: 'supabase',
    };
  }

  return { status: 'not_found', contact: null, candidates: [], source: null };
}

export interface ExecuteTransferInput {
  walletConnected: boolean;
  confirmedByUser: boolean;
  senderWallet: string;
  senderBalanceUsdc: number;
  recipient: Contact;
  amount: number;
  currency: Currency;
  voiceTranscript: string;
  resolutionSource: 'supabase' | 'on_chain';
  autoCreateAta?: boolean;
  timestampIso?: string;
}

export function executeSimulatedTransfer(
  input: ExecuteTransferInput
): TransferExecutionResult {
  if (!input.walletConnected) {
    return {
      ok: false,
      errorCode: 'WALLET_DISCONNECTED',
      spokenMessage: VOICE_SCRIPTS.walletDisconnected(),
      nextSenderBalance: input.senderBalanceUsdc,
    };
  }

  if (!input.confirmedByUser) {
    return {
      ok: false,
      errorCode: 'UNCONFIRMED',
      spokenMessage: 'Transaksi memerlukan konfirmasi eksplisit terlebih dahulu.',
      nextSenderBalance: input.senderBalanceUsdc,
    };
  }

  if (!Number.isFinite(input.amount) || input.amount <= 0) {
    return {
      ok: false,
      errorCode: 'INVALID_AMOUNT',
      spokenMessage: 'Jumlah pengiriman tidak valid.',
      nextSenderBalance: input.senderBalanceUsdc,
    };
  }

  if (input.amount > input.senderBalanceUsdc) {
    return {
      ok: false,
      errorCode: 'INSUFFICIENT_BALANCE',
      spokenMessage: VOICE_SCRIPTS.insufficientBalance(
        input.senderBalanceUsdc,
        input.currency
      ),
      nextSenderBalance: input.senderBalanceUsdc,
    };
  }

  if (!input.recipient.hasUsdcAta && !input.autoCreateAta) {
    return {
      ok: false,
      errorCode: 'MISSING_ATA',
      spokenMessage: `${input.recipient.name} belum punya USDC wallet (ATA). Aktifkan pembuatan ATA otomatis untuk melanjutkan.`,
      nextSenderBalance: input.senderBalanceUsdc,
    };
  }

  const rawUnitsBigInt = usdcToRawUnits(input.amount);
  const rawUnits = rawUnitsBigInt.toString();
  const timestamp = input.timestampIso ?? new Date().toISOString();
  const nextSenderBalance = Number((input.senderBalanceUsdc - input.amount).toFixed(6));
  const signature = generateSimulatedSignature(
    `${input.senderWallet}:${input.recipient.wallet}:${rawUnits}:${timestamp}`
  );

  const instruction: TransferInstructionSummary = {
    program: '@solana-program/token (TransferChecked)',
    mint: USDC_MINT_DEVNET,
    decimals: USDC_DECIMALS,
    rawAmount: rawUnits,
    sourceAta: DEMO_SENDER_ATA,
    destinationAta: deriveSimulatedPda(input.recipient.wallet, 'usdc-ata'),
    requiresAtaInit: !input.recipient.hasUsdcAta,
    estimatedFeeSol: input.recipient.hasUsdcAta ? 0.000005 : 0.002044,
  };

  const tx: TransactionRecord = {
    id: `tx-${signature.slice(0, 10)}`,
    recipientName: input.recipient.name,
    recipientWallet: input.recipient.wallet,
    amountUsdc: input.amount,
    rawUnits,
    currency: input.currency,
    voiceTranscript: input.voiceTranscript,
    txSignature: signature,
    status: 'confirmed',
    resolutionSource: input.resolutionSource,
    createdAt: timestamp,
  };

  return {
    ok: true,
    spokenMessage: VOICE_SCRIPTS.success(
      input.amount,
      input.currency,
      input.recipient.name
    ),
    nextSenderBalance,
    tx,
    instruction,
  };
}
