import {
  Connection,
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction,
} from '@solana/web3.js';
import { USDC_DECIMALS, USDC_MINT_DEVNET } from './bicara-engine';

export const SOLANA_DEVNET_RPC = 'https://api.devnet.solana.com';
export const SOLANA_DEVNET_FAUCET_URL = 'https://faucet.solana.com/';

const TOKEN_PROGRAM_ID = new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');
const ASSOCIATED_TOKEN_PROGRAM_ID = new PublicKey('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL');
const USDC_MINT_PUBKEY = new PublicKey(USDC_MINT_DEVNET);

export type BrowserWalletKind = 'phantom' | 'solflare';

export interface SolanaWalletProvider {
  isPhantom?: boolean;
  isSolflare?: boolean;
  isConnected?: boolean;
  publicKey?: { toBase58: () => string } | null;
  connect: (opts?: { onlyIfTrusted?: boolean }) => Promise<{ publicKey?: { toBase58: () => string } } | void>;
  disconnect: () => Promise<void>;
  signAndSendTransaction?: (
    transaction: Transaction,
    options?: { preflightCommitment?: 'processed' | 'confirmed' | 'finalized' }
  ) => Promise<{ signature: string } | string>;
  signTransaction?: (transaction: Transaction) => Promise<Transaction>;
}

export interface DetectedBrowserWallet {
  kind: BrowserWalletKind;
  label: string;
  provider: SolanaWalletProvider;
}

export interface DevnetBalances {
  sol: number;
  usdc: number;
  lamports: number;
  fetchedAt: string;
}

export interface DevnetTransferInspection {
  validRecipient: boolean;
  recipientCreatesAta: boolean;
  estimatedNetworkFeeSol: number;
  estimatedAtaRentSol: number;
  error?: string;
}

export interface LiveDevnetBroadcastResult {
  signature: string;
  explorerUrl: string;
  slot?: number;
}

declare global {
  interface Window {
    phantom?: { solana?: SolanaWalletProvider };
    solana?: SolanaWalletProvider;
    solflare?: SolanaWalletProvider;
  }
}

export function getDevnetConnection(): Connection {
  return new Connection(SOLANA_DEVNET_RPC, 'confirmed');
}

export function getSolanaDevnetExplorerUrl(signature: string): string {
  return `https://explorer.solana.com/tx/${encodeURIComponent(signature)}?cluster=devnet`;
}

export function isValidSolanaPublicKey(value: string): boolean {
  try {
    const trimmed = value.trim();
    if (trimmed.length < 32 || trimmed.length > 48) return false;
    new PublicKey(trimmed);
    return true;
  } catch {
    return false;
  }
}

export function detectBrowserSolanaWallets(): DetectedBrowserWallet[] {
  if (typeof window === 'undefined') return [];
  const found: DetectedBrowserWallet[] = [];

  const phantomProvider = window.phantom?.solana ?? (window.solana?.isPhantom ? window.solana : undefined);
  if (phantomProvider) {
    found.push({
      kind: 'phantom',
      label: 'Phantom',
      provider: phantomProvider,
    });
  }

  const solflareProvider = window.solflare?.isSolflare ? window.solflare : undefined;
  if (solflareProvider) {
    found.push({
      kind: 'solflare',
      label: 'Solflare',
      provider: solflareProvider,
    });
  }

  return found;
}

export async function connectBrowserWallet(
  wallet: DetectedBrowserWallet
): Promise<{ publicKey: string }> {
  const res = await wallet.provider.connect();
  const key =
    (res && typeof res === 'object' && 'publicKey' in res && res.publicKey?.toBase58()) ||
    wallet.provider.publicKey?.toBase58();

  if (!key) {
    throw new Error(`${wallet.label} connected without returning a public key.`);
  }
  return { publicKey: key };
}

export async function fetchDevnetBalances(walletAddress: string): Promise<DevnetBalances> {
  const connection = getDevnetConnection();
  const owner = new PublicKey(walletAddress);

  const [lamports, tokenAccounts] = await Promise.all([
    connection.getBalance(owner, 'confirmed'),
    connection.getParsedTokenAccountsByOwner(owner, { mint: USDC_MINT_PUBKEY }, 'confirmed'),
  ]);

  let usdcTotal = 0;
  for (const item of tokenAccounts.value) {
    const parsed = item.account.data as {
      parsed?: { info?: { tokenAmount?: { uiAmount?: number | null } } };
    };
    const uiAmount = parsed?.parsed?.info?.tokenAmount?.uiAmount;
    if (typeof uiAmount === 'number' && Number.isFinite(uiAmount)) {
      usdcTotal += uiAmount;
    }
  }

  const lamportsNum = Number(lamports);

  return {
    sol: Number((lamportsNum / LAMPORTS_PER_SOL).toFixed(6)),
    usdc: Number(usdcTotal.toFixed(6)),
    lamports: lamportsNum,
    fetchedAt: new Date().toISOString(),
  };
}

async function findAssociatedTokenAddress(owner: PublicKey, mint: PublicKey): Promise<PublicKey> {
  const [ata] = await PublicKey.findProgramAddress(
    [owner.toBytes(), TOKEN_PROGRAM_ID.toBytes(), mint.toBytes()],
    ASSOCIATED_TOKEN_PROGRAM_ID
  );
  return ata;
}

function createAssociatedTokenAccountIdempotentInstruction(
  payer: PublicKey,
  associatedToken: PublicKey,
  owner: PublicKey,
  mint: PublicKey
): TransactionInstruction {
  return new TransactionInstruction({
    programId: ASSOCIATED_TOKEN_PROGRAM_ID,
    keys: [
      { pubkey: payer, isSigner: true, isWritable: true },
      { pubkey: associatedToken, isSigner: false, isWritable: true },
      { pubkey: owner, isSigner: false, isWritable: false },
      { pubkey: mint, isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    ],
    // Instruction index 1 = CreateIdempotent in spl-associated-token-account
    data: new Uint8Array([1]),
  });
}

function createTransferCheckedInstructionData(rawAmount: bigint, decimals: number): Uint8Array {
  const data = new Uint8Array(10);
  data[0] = 12; // SPL Token TransferChecked opcode
  let value = rawAmount;
  for (let i = 0; i < 8; i += 1) {
    data[1 + i] = Number(value & BigInt(0xff));
    value >>= BigInt(8);
  }
  data[9] = decimals & 0xff;
  return data;
}

function createSplTransferCheckedInstruction(params: {
  source: PublicKey;
  mint: PublicKey;
  destination: PublicKey;
  owner: PublicKey;
  rawAmount: bigint;
  decimals: number;
}): TransactionInstruction {
  return new TransactionInstruction({
    programId: TOKEN_PROGRAM_ID,
    keys: [
      { pubkey: params.source, isSigner: false, isWritable: true },
      { pubkey: params.mint, isSigner: false, isWritable: false },
      { pubkey: params.destination, isSigner: false, isWritable: true },
      { pubkey: params.owner, isSigner: true, isWritable: false },
    ],
    data: createTransferCheckedInstructionData(params.rawAmount, params.decimals),
  });
}

export async function inspectDevnetTransfer(
  recipientWallet: string,
  asset: 'SOL' | 'USDC'
): Promise<DevnetTransferInspection> {
  if (!isValidSolanaPublicKey(recipientWallet)) {
    return {
      validRecipient: false,
      recipientCreatesAta: false,
      estimatedNetworkFeeSol: 0.000005,
      estimatedAtaRentSol: 0,
      error: 'Recipient address is not a valid Solana Base58 public key.',
    };
  }

  if (asset === 'SOL') {
    return {
      validRecipient: true,
      recipientCreatesAta: false,
      estimatedNetworkFeeSol: 0.000005,
      estimatedAtaRentSol: 0,
    };
  }

  try {
    const connection = getDevnetConnection();
    const recipientPubkey = new PublicKey(recipientWallet.trim());
    const recipientAta = await findAssociatedTokenAddress(recipientPubkey, USDC_MINT_PUBKEY);
    const ataInfo = await connection.getAccountInfo(recipientAta, 'confirmed');
    const recipientCreatesAta = ataInfo === null;

    return {
      validRecipient: true,
      recipientCreatesAta,
      estimatedNetworkFeeSol: 0.000005,
      estimatedAtaRentSol: recipientCreatesAta ? 0.002039 : 0,
    };
  } catch {
    return {
      validRecipient: true,
      recipientCreatesAta: false,
      estimatedNetworkFeeSol: 0.000005,
      estimatedAtaRentSol: 0,
    };
  }
}

export async function sendRealDevnetTransfer(params: {
  provider: SolanaWalletProvider;
  senderAddress: string;
  recipientAddress: string;
  amount: number;
  asset: 'SOL' | 'USDC';
}): Promise<LiveDevnetBroadcastResult> {
  if (!isValidSolanaPublicKey(params.senderAddress)) {
    throw new Error('Connected sender wallet address is invalid.');
  }
  if (!isValidSolanaPublicKey(params.recipientAddress)) {
    throw new Error('Recipient wallet address is not a valid Solana Devnet public key.');
  }
  if (!Number.isFinite(params.amount) || params.amount <= 0) {
    throw new Error('Transfer amount must be greater than zero.');
  }

  const connection = getDevnetConnection();
  const senderPubkey = new PublicKey(params.senderAddress.trim());
  const recipientPubkey = new PublicKey(params.recipientAddress.trim());

  const tx = new Transaction();
  tx.feePayer = senderPubkey;

  if (params.asset === 'SOL') {
    const lamports = Math.round(params.amount * LAMPORTS_PER_SOL);
    if (lamports <= 0) {
      throw new Error('SOL transfer amount is too small.');
    }
    tx.add(
      SystemProgram.transfer({
        fromPubkey: senderPubkey,
        toPubkey: recipientPubkey,
        lamports,
      })
    );
  } else {
    const rawAmount = BigInt(Math.round(params.amount * 10 ** USDC_DECIMALS));
    if (rawAmount <= BigInt(0)) {
      throw new Error('USDC transfer amount is too small.');
    }

    const [senderAta, recipientAta] = await Promise.all([
      findAssociatedTokenAddress(senderPubkey, USDC_MINT_PUBKEY),
      findAssociatedTokenAddress(recipientPubkey, USDC_MINT_PUBKEY),
    ]);

    const [senderAtaInfo, recipientAtaInfo] = await Promise.all([
      connection.getAccountInfo(senderAta, 'confirmed'),
      connection.getAccountInfo(recipientAta, 'confirmed'),
    ]);

    if (!senderAtaInfo) {
      throw new Error(
        'Your connected Devnet wallet does not hold Circle Devnet USDC yet. Switch to SOL or request Devnet USDC from faucet.circle.com.'
      );
    }

    if (!recipientAtaInfo) {
      tx.add(
        createAssociatedTokenAccountIdempotentInstruction(
          senderPubkey,
          recipientAta,
          recipientPubkey,
          USDC_MINT_PUBKEY
        )
      );
    }

    tx.add(
      createSplTransferCheckedInstruction({
        source: senderAta,
        mint: USDC_MINT_PUBKEY,
        destination: recipientAta,
        owner: senderPubkey,
        rawAmount,
        decimals: USDC_DECIMALS,
      })
    );
  }

  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');
  tx.recentBlockhash = blockhash;

  let signature: string;

  if (typeof params.provider.signAndSendTransaction === 'function') {
    const res = await params.provider.signAndSendTransaction(tx, {
      preflightCommitment: 'confirmed',
    });
    signature = typeof res === 'string' ? res : res.signature;
  } else if (typeof params.provider.signTransaction === 'function') {
    const signedTx = await params.provider.signTransaction(tx);
    const rawBytes = await signedTx.serialize();
    signature = await connection.sendRawTransaction(rawBytes, {
      skipPreflight: false,
      preflightCommitment: 'confirmed',
    });
  } else {
    throw new Error('Connected wallet provider does not support transaction signing.');
  }

  if (!signature) {
    throw new Error('Wallet returned an empty transaction signature.');
  }

  const confirmation = await connection.confirmTransaction(
    { signature, blockhash, lastValidBlockHeight },
    'confirmed'
  );

  if (confirmation.value.err) {
    throw new Error(`Devnet transaction failed on-chain: ${JSON.stringify(confirmation.value.err)}`);
  }

  return {
    signature,
    explorerUrl: getSolanaDevnetExplorerUrl(signature),
    slot: Number(confirmation.context.slot),
  };
}

// Layer 2 Random 3-Digit Spoken Challenge (matches mobile/src/services/solana.ts)
const DIGIT_WORDS: Record<string, string> = {
  '0': 'zero',
  '1': 'one',
  '2': 'two',
  '3': 'three',
  '4': 'four',
  '5': 'five',
  '6': 'six',
  '7': 'seven',
  '8': 'eight',
  '9': 'nine',
};

const WORD_TO_DIGIT: Record<string, string> = {
  zero: '0',
  oh: '0',
  o: '0',
  nol: '0',
  one: '1',
  satu: '1',
  two: '2',
  dua: '2',
  three: '3',
  tiga: '3',
  four: '4',
  empat: '4',
  five: '5',
  lima: '5',
  six: '6',
  enam: '6',
  seven: '7',
  tujuh: '7',
  eight: '8',
  delapan: '8',
  nine: '9',
  sembilan: '9',
};

export interface SpokenChallenge {
  digits: string; // e.g. "482"
  spaced: string; // e.g. "4 - 8 - 2"
  spokenWords: string; // e.g. "four eight two"
}

export function generateSpokenChallenge(): SpokenChallenge {
  const d1 = Math.floor(Math.random() * 9) + 1;
  const d2 = Math.floor(Math.random() * 10);
  const d3 = Math.floor(Math.random() * 10);
  const digits = `${d1}${d2}${d3}`;
  return {
    digits,
    spaced: `${d1} - ${d2} - ${d3}`,
    spokenWords: `${DIGIT_WORDS[String(d1)]} ${DIGIT_WORDS[String(d2)]} ${DIGIT_WORDS[String(d3)]}`,
  };
}

export function matchesBrowserSpokenChallenge(
  transcript: string,
  expectedDigits: string
): boolean {
  const lower = transcript.toLowerCase().trim();
  if (!lower) return false;
  const directDigits = lower.replace(/[^0-9]/g, '');
  if (directDigits.includes(expectedDigits)) return true;

  const tokens = lower.split(/[^a-z0-9]+/).filter(Boolean);
  const mapped = tokens
    .map((t) => {
      if (/^[0-9]+$/.test(t)) return t;
      return WORD_TO_DIGIT[t] ?? '';
    })
    .join('');

  return mapped.includes(expectedDigits);
}
