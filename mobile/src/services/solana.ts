import {
  AccountRole,
  address,
  appendTransactionMessageInstructions,
  compileTransaction,
  createNoopSigner,
  createSolanaRpc,
  createTransactionMessage,
  getBase58Decoder,
  isAddress,
  pipe,
  setTransactionMessageFeePayer,
  setTransactionMessageLifetimeUsingBlockhash,
  type Address,
  type Instruction,
} from '@solana/kit';
import {
  findAssociatedTokenPda,
  getTransferCheckedInstruction,
  TOKEN_PROGRAM_ADDRESS,
} from '@solana-program/token';

export const SOLANA_DEVNET_RPC =
  process.env.EXPO_PUBLIC_SOLANA_RPC_URL ?? 'https://api.devnet.solana.com';
export const SOLANA_CHAIN_ID =
  (process.env.EXPO_PUBLIC_SOLANA_CHAIN as `solana:${string}` | undefined) ?? 'solana:devnet';

// Official Circle Devnet USDC Mint (6 decimals)
export const USDC_MINT_DEVNET = '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU';
export const USDC_DECIMALS = 6;
export const LAMPORTS_PER_SOL = 1_000_000_000;
export const STANDARD_TX_FEE_SOL = 0.000005;
export const ATA_RENT_ESTIMATE_SOL = 0.00203928;

const SYSTEM_PROGRAM_ADDRESS = address('11111111111111111111111111111111');
const ASSOCIATED_TOKEN_PROGRAM_ADDRESS = address('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL');

export const BICARA_APP_IDENTITY = {
  name: 'Bicara',
  uri: 'https://bicara.dev3pack.xyz',
  icon: 'favicon.ico',
};

const devnetRpc = createSolanaRpc(SOLANA_DEVNET_RPC);

export interface DevnetBalances {
  sol: number;
  usdc: number;
  hasUsdcAta: boolean;
  fetchedAt: string;
}

export interface PendingTransferPlan {
  asset: 'SOL' | 'USDC';
  amount: number;
  senderAddress: string;
  recipientName: string;
  recipientAddress: string;
  recipientLast4: string;
  isSavedContact: boolean;
  sourceAta?: string;
  destinationAta?: string;
  ataNeedsCreation: boolean;
  ataRentSol: number;
  estimatedFeeSol: number;
  anomalies: string[];
  challengeDigits: string;
  challengeSpoken: string;
  spokenSummary: string;
}

export function isValidSolanaAddress(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return false;
  return isAddress(trimmed);
}

/**
 * Exact 6-decimal USDC conversion to BigInt raw token units (never float math on-chain).
 */
export function usdcToRawUnits(amount: number): bigint {
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error('USDC amount must be a positive finite number.');
  }
  return BigInt(Math.round(amount * 1_000_000));
}

/**
 * Exact 9-decimal SOL conversion to BigInt lamports.
 */
export function solToLamports(amountSol: number): bigint {
  if (!Number.isFinite(amountSol) || amountSol <= 0) {
    throw new Error('SOL amount must be a positive finite number.');
  }
  return BigInt(Math.round(amountSol * LAMPORTS_PER_SOL));
}

export function truncateAddress(pubkey: string, head = 4, tail = 4): string {
  if (!pubkey || pubkey.length <= head + tail + 3) return pubkey;
  return `${pubkey.slice(0, head)}...${pubkey.slice(-tail)}`;
}

/**
 * Lowercase normalized seed for Step 4 Anchor ContactRegistry PDA & Supabase uniqueness:
 * seeds = [b"contact", owner.key().as_ref(), normalizeContactSeed(name)]
 */
export function normalizeContactSeed(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, ' ');
}

export function getSolanaExplorerTxUrl(signature: string): string {
  return `https://explorer.solana.com/tx/${encodeURIComponent(signature)}?cluster=devnet`;
}

/**
 * Generates a runtime Layer 2 random 3-digit spoken challenge (defeats static replay clips).
 */
export function generateSpokenChallenge(): { digits: string; spoken: string } {
  const d1 = Math.floor(Math.random() * 9) + 1;
  const d2 = Math.floor(Math.random() * 10);
  const d3 = Math.floor(Math.random() * 10);
  const digits = `${d1}${d2}${d3}`;
  return { digits, spoken: `${d1}, ${d2}, ${d3}` };
}

/**
 * Matches spoken Layer 2 challenge digits (e.g. "472", "four seven two", "4-7-2") or explicit confirmation.
 */
export function matchesSpokenChallenge(transcript: string, expectedDigits: string): boolean {
  const wordToDigit: Record<string, string> = {
    zero: '0',
    oh: '0',
    one: '1',
    two: '2',
    to: '2',
    too: '2',
    three: '3',
    four: '4',
    for: '4',
    five: '5',
    six: '6',
    seven: '7',
    eight: '8',
    nine: '9',
  };

  const normalized = transcript
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .map((tok) => (wordToDigit[tok] !== undefined ? wordToDigit[tok] : tok))
    .join('');

  const digitsOnly = normalized.replace(/[^0-9]/g, '');
  return digitsOnly.includes(expectedDigits);
}

/**
 * Fetches live Solana Devnet SOL + Circle Devnet USDC balances via @solana/kit RPC.
 */
export async function fetchDevnetBalances(walletAddress: string): Promise<DevnetBalances> {
  if (!isValidSolanaAddress(walletAddress)) {
    throw new Error('Invalid wallet address.');
  }

  const owner = address(walletAddress);
  const mint = address(USDC_MINT_DEVNET);

  const [lamportsResp, [usdcAta]] = await Promise.all([
    devnetRpc.getBalance(owner).send(),
    findAssociatedTokenPda({
      mint,
      owner,
      tokenProgram: TOKEN_PROGRAM_ADDRESS,
    }),
  ]);

  const sol = Number(lamportsResp.value) / LAMPORTS_PER_SOL;
  let usdc = 0;
  let hasUsdcAta = false;

  try {
    const tokenResp = await devnetRpc.getTokenAccountBalance(usdcAta).send();
    usdc = Number(tokenResp.value.uiAmount ?? 0);
    hasUsdcAta = true;
  } catch {
    // Sender has not initialized a Circle Devnet USDC ATA yet
    usdc = 0;
    hasUsdcAta = false;
  }

  return {
    sol,
    usdc,
    hasUsdcAta,
    fetchedAt: new Date().toISOString(),
  };
}

/**
 * Builds canonical 12-byte Solana System Program Transfer instruction (pure JS, no extra packages).
 */
export function buildSystemTransferSolInstruction(params: {
  senderAddress: Address;
  recipientAddress: Address;
  amountLamports: bigint;
}): Instruction {
  const data = new Uint8Array(12);
  const view = new DataView(data.buffer);
  view.setUint32(0, 2, true); // SystemInstruction::Transfer = index 2
  view.setBigUint64(4, params.amountLamports, true);

  return {
    programAddress: SYSTEM_PROGRAM_ADDRESS,
    accounts: [
      { address: params.senderAddress, role: AccountRole.WRITABLE_SIGNER },
      { address: params.recipientAddress, role: AccountRole.WRITABLE },
    ],
    data,
  };
}

/**
 * Builds canonical SPL Associated Token Account CreateIdempotent instruction (instruction byte 1).
 * Safely creates recipient ATA only if missing; no-op if already initialized.
 */
export function buildCreateAtaIdempotentInstruction(params: {
  payerAddress: Address;
  ataAddress: Address;
  ownerAddress: Address;
  mintAddress: Address;
}): Instruction {
  return {
    programAddress: ASSOCIATED_TOKEN_PROGRAM_ADDRESS,
    accounts: [
      { address: params.payerAddress, role: AccountRole.WRITABLE_SIGNER },
      { address: params.ataAddress, role: AccountRole.WRITABLE },
      { address: params.ownerAddress, role: AccountRole.READONLY },
      { address: params.mintAddress, role: AccountRole.READONLY },
      { address: SYSTEM_PROGRAM_ADDRESS, role: AccountRole.READONLY },
      { address: TOKEN_PROGRAM_ADDRESS, role: AccountRole.READONLY },
    ],
    data: new Uint8Array([1]), // CreateIdempotent
  };
}

/**
 * Builds a strict @solana-program/token TransferChecked instruction (Track A @solana/kit).
 * Requires explicit user confirmation + MWA biometric signing before broadcast.
 */
export function buildUsdcTransferCheckedInstruction(params: {
  sourceAta: string;
  destinationAta: string;
  authorityAddress: string;
  amountUsdc: number;
}): Instruction {
  const mintAddress: Address = address(USDC_MINT_DEVNET);
  return getTransferCheckedInstruction({
    source: address(params.sourceAta),
    mint: mintAddress,
    destination: address(params.destinationAta),
    authority: createNoopSigner(address(params.authorityAddress)),
    amount: usdcToRawUnits(params.amountUsdc),
    decimals: USDC_DECIMALS,
  });
}

/**
 * Pre-flight RPC inspection & Layer 2/3/4 TxSummary preparation before MWA signing.
 * Checks live balances, ATA rent requirements, and policy warnings so zero blind signing occurs.
 */
export async function prepareDevnetTransferPlan(params: {
  senderAddress: string;
  recipientName: string;
  recipientAddress: string;
  isSavedContact: boolean;
  asset: 'SOL' | 'USDC';
  amount: number;
}): Promise<PendingTransferPlan> {
  if (!isValidSolanaAddress(params.senderAddress)) {
    throw new Error('Connect your Solana wallet first.');
  }
  if (!isValidSolanaAddress(params.recipientAddress)) {
    throw new Error('Recipient address is not a valid Solana address.');
  }
  if (!Number.isFinite(params.amount) || params.amount <= 0) {
    throw new Error('Transfer amount must be greater than zero.');
  }

  const balances = await fetchDevnetBalances(params.senderAddress);
  const anomalies: string[] = [];
  let sourceAta: string | undefined;
  let destinationAta: string | undefined;
  let ataNeedsCreation = false;
  let ataRentSol = 0;

  if (params.asset === 'SOL') {
    const neededSol = params.amount + STANDARD_TX_FEE_SOL;
    if (balances.sol < neededSol) {
      throw new Error(
        `Insufficient Devnet SOL balance. You have ${balances.sol.toFixed(4)} SOL, but need ${neededSol.toFixed(4)} SOL including network fee.`
      );
    }
    if (params.amount >= 1) {
      anomalies.push(`Large transfer warning: ${params.amount} SOL exceeds the 1 SOL soft limit.`);
    }
  } else {
    const mint = address(USDC_MINT_DEVNET);
    const [[srcAta], [dstAta]] = await Promise.all([
      findAssociatedTokenPda({
        mint,
        owner: address(params.senderAddress),
        tokenProgram: TOKEN_PROGRAM_ADDRESS,
      }),
      findAssociatedTokenPda({
        mint,
        owner: address(params.recipientAddress),
        tokenProgram: TOKEN_PROGRAM_ADDRESS,
      }),
    ]);

    sourceAta = srcAta;
    destinationAta = dstAta;

    if (!balances.hasUsdcAta || balances.usdc < params.amount) {
      throw new Error(
        `Insufficient Circle Devnet USDC balance. You have ${balances.usdc.toFixed(2)} USDC, need ${params.amount} USDC. Fund Devnet USDC via faucet.circle.com or send Devnet SOL instead.`
      );
    }

    const dstInfo = await devnetRpc.getAccountInfo(dstAta, { encoding: 'base64' }).send();
    if (!dstInfo.value) {
      ataNeedsCreation = true;
      ataRentSol = ATA_RENT_ESTIMATE_SOL;
      anomalies.push(
        `First-time USDC transfer to ${params.recipientName}: creates token account costing about ${ATA_RENT_ESTIMATE_SOL.toFixed(5)} SOL in refundable rent.`
      );
    }

    const neededSolForGas = STANDARD_TX_FEE_SOL + ataRentSol;
    if (balances.sol < neededSolForGas) {
      throw new Error(
        `Insufficient Devnet SOL for gas/rent. You have ${balances.sol.toFixed(5)} SOL, need at least ${neededSolForGas.toFixed(5)} SOL.`
      );
    }

    if (params.amount > 100) {
      anomalies.push(`Large transfer warning: ${params.amount} USDC exceeds the 100 USDC soft limit.`);
    }
  }

  if (!params.isSavedContact) {
    anomalies.push('Recipient is not in your saved contacts.');
  }

  const recipientLast4 = params.recipientAddress.slice(-4);
  const challenge = generateSpokenChallenge();

  const parts: string[] = [
    `You are about to send ${params.amount} ${params.asset} on Solana Devnet to ${params.recipientName}, ${
      params.isSavedContact ? 'a verified saved contact' : 'a new address'
    }, wallet ending ${recipientLast4}.`,
    `Network fee is about ${STANDARD_TX_FEE_SOL} SOL.`,
  ];

  if (ataNeedsCreation) {
    parts.push(
      `Creating ${params.recipientName}'s USDC token account adds about ${ataRentSol.toFixed(5)} SOL rent.`
    );
  }
  if (anomalies.length > 0 && !ataNeedsCreation) {
    parts.push(`Warning: ${anomalies[0]}`);
  }
  parts.push(
    `Security check. Say ${challenge.spoken} or tap Confirm to sign in Solflare, or say cancel.`
  );

  return {
    asset: params.asset,
    amount: params.amount,
    senderAddress: params.senderAddress,
    recipientName: params.recipientName,
    recipientAddress: params.recipientAddress,
    recipientLast4,
    isSavedContact: params.isSavedContact,
    sourceAta,
    destinationAta,
    ataNeedsCreation,
    ataRentSol,
    estimatedFeeSol: STANDARD_TX_FEE_SOL,
    anomalies,
    challengeDigits: challenge.digits,
    challengeSpoken: challenge.spoken,
    spokenSummary: parts.join(' '),
  };
}

/**
 * Compiles a live Solana Devnet version-0 Transaction ready for MWA `signAndSendTransaction(tx, minContextSlot)`.
 */
export async function buildCompiledDevnetTransferTransaction(plan: PendingTransferPlan) {
  const { value: latestBlockhash, context } = await devnetRpc.getLatestBlockhash().send();
  const sender = address(plan.senderAddress);
  const recipient = address(plan.recipientAddress);

  const instructions: Instruction[] = [];

  if (plan.asset === 'SOL') {
    instructions.push(
      buildSystemTransferSolInstruction({
        senderAddress: sender,
        recipientAddress: recipient,
        amountLamports: solToLamports(plan.amount),
      })
    );
  } else {
    if (!plan.sourceAta || !plan.destinationAta) {
      throw new Error('Missing USDC Associated Token Accounts.');
    }
    if (plan.ataNeedsCreation) {
      instructions.push(
        buildCreateAtaIdempotentInstruction({
          payerAddress: sender,
          ataAddress: address(plan.destinationAta),
          ownerAddress: recipient,
          mintAddress: address(USDC_MINT_DEVNET),
        })
      );
    }
    instructions.push(
      buildUsdcTransferCheckedInstruction({
        sourceAta: plan.sourceAta,
        destinationAta: plan.destinationAta,
        authorityAddress: plan.senderAddress,
        amountUsdc: plan.amount,
      })
    );
  }

  const txMessage = pipe(
    createTransactionMessage({ version: 0 }),
    (tx) => setTransactionMessageFeePayer(sender, tx),
    (tx) => setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, tx),
    (tx) => appendTransactionMessageInstructions(instructions, tx)
  );

  const transaction = compileTransaction(txMessage);

  return {
    transaction,
    minContextSlot: context.slot,
  };
}

/**
 * Normalizes MWA signature return value (Base58 string or 64-byte Uint8Array) to canonical Base58 string.
 */
export function normalizeMwaSignature(sig: unknown): string {
  if (typeof sig === 'string' && sig.trim().length > 0) {
    return sig.trim();
  }
  if (sig instanceof Uint8Array) {
    return getBase58Decoder().decode(sig);
  }
  if (Array.isArray(sig) && sig.length > 0) {
    return normalizeMwaSignature(sig[0]);
  }
  throw new Error('Wallet returned an unrecognized transaction signature format.');
}
