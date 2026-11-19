import { address, type Address } from '@solana/kit';
import { getTransferCheckedInstruction } from '@solana-program/token';

export const SOLANA_DEVNET_RPC =
  process.env.EXPO_PUBLIC_SOLANA_RPC_URL ?? 'https://api.devnet.solana.com';
export const SOLANA_CHAIN_ID =
  (process.env.EXPO_PUBLIC_SOLANA_CHAIN as `solana:${string}` | undefined) ?? 'solana:devnet';

// Official Circle Devnet USDC Mint (6 decimals)
export const USDC_MINT_DEVNET = '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU';
export const USDC_DECIMALS = 6;

export const BICARA_APP_IDENTITY = {
  name: 'Bicara',
  uri: 'https://bicara.dev3pack.xyz',
  icon: 'favicon.ico',
};

/**
 * Exact 6-decimal USDC conversion to BigInt raw token units (never float math on-chain).
 */
export function usdcToRawUnits(amount: number): bigint {
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error('USDC amount must be a positive finite number.');
  }
  return BigInt(Math.round(amount * 1_000_000));
}

export function truncateAddress(pubkey: string, head = 4, tail = 4): string {
  if (!pubkey || pubkey.length <= head + tail + 3) return pubkey;
  return `${pubkey.slice(0, head)}...${pubkey.slice(-tail)}`;
}

/**
 * Lowercase normalized seed for Step 4 Anchor ContactRegistry PDA:
 * seeds = [b"contact", owner.key().as_ref(), normalizeContactSeed(name)]
 */
export function normalizeContactSeed(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, ' ');
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
}) {
  const mintAddress: Address = address(USDC_MINT_DEVNET);
  return getTransferCheckedInstruction({
    source: address(params.sourceAta),
    mint: mintAddress,
    destination: address(params.destinationAta),
    authority: address(params.authorityAddress),
    amount: usdcToRawUnits(params.amountUsdc),
    decimals: USDC_DECIMALS,
  });
}
