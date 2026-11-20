import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { isValidSolanaAddress, normalizeContactSeed } from './solana';

export interface VerifiedContact {
  id: string;
  ownerWallet: string;
  name: string;
  normalizedName: string;
  recipientAddress: string;
  verified: boolean;
  createdAt: string;
}

export interface DevnetTransactionRecord {
  id: string;
  ownerWallet: string;
  recipientName: string;
  recipientAddress: string;
  asset: 'SOL' | 'USDC';
  amount: number;
  feeSol: number;
  ataCreated: boolean;
  signature: string;
  cluster: 'solana:devnet';
  status: 'confirmed' | 'failed';
  createdAt: string;
}

export type StorageMode = 'supabase' | 'local-cache';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim() ?? '';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY?.trim() ?? '';

function isConfiguredEnv(val: string, placeholderHints: string[]): boolean {
  if (!val) return false;
  return !placeholderHints.some((hint) => val.includes(hint));
}

export const isSupabaseConfigured =
  isConfiguredEnv(SUPABASE_URL, ['your-project', 'YOUR_']) &&
  SUPABASE_URL.startsWith('https://') &&
  isConfiguredEnv(SUPABASE_ANON_KEY, ['YOUR_SUPABASE', 'MY_SUPABASE']);

let supabaseClient: SupabaseClient | null = null;

function getSupabase(): SupabaseClient | null {
  if (!isSupabaseConfigured) return null;
  if (!supabaseClient) {
    supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    });
  }
  return supabaseClient;
}

function contactsCacheKey(ownerWallet: string): string {
  return `bicara_contacts_v1_${ownerWallet}`;
}

function txCacheKey(ownerWallet: string): string {
  return `bicara_transactions_v1_${ownerWallet}`;
}

async function readLocalContacts(ownerWallet: string): Promise<VerifiedContact[]> {
  try {
    const raw = await AsyncStorage.getItem(contactsCacheKey(ownerWallet));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as VerifiedContact[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeLocalContacts(ownerWallet: string, items: VerifiedContact[]): Promise<void> {
  try {
    await AsyncStorage.setItem(contactsCacheKey(ownerWallet), JSON.stringify(items));
  } catch {
    // ignore storage write failures
  }
}

async function readLocalTransactions(ownerWallet: string): Promise<DevnetTransactionRecord[]> {
  try {
    const raw = await AsyncStorage.getItem(txCacheKey(ownerWallet));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as DevnetTransactionRecord[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeLocalTransactions(
  ownerWallet: string,
  items: DevnetTransactionRecord[]
): Promise<void> {
  try {
    await AsyncStorage.setItem(txCacheKey(ownerWallet), JSON.stringify(items));
  } catch {
    // ignore storage write failures
  }
}

function mapDbContact(row: Record<string, unknown>): VerifiedContact {
  return {
    id: String(row.id ?? ''),
    ownerWallet: String(row.owner_wallet ?? ''),
    name: String(row.name ?? ''),
    normalizedName: String(row.normalized_name ?? ''),
    recipientAddress: String(row.recipient_address ?? ''),
    verified: Boolean(row.verified ?? true),
    createdAt: String(row.created_at ?? new Date().toISOString()),
  };
}

function mapDbTransaction(row: Record<string, unknown>): DevnetTransactionRecord {
  return {
    id: String(row.id ?? ''),
    ownerWallet: String(row.owner_wallet ?? ''),
    recipientName: String(row.recipient_name ?? ''),
    recipientAddress: String(row.recipient_address ?? ''),
    asset: row.asset === 'SOL' ? 'SOL' : 'USDC',
    amount: Number(row.amount ?? 0),
    feeSol: Number(row.fee_sol ?? 0.000005),
    ataCreated: Boolean(row.ata_created ?? false),
    signature: String(row.signature ?? ''),
    cluster: 'solana:devnet',
    status: row.status === 'failed' ? 'failed' : 'confirmed',
    createdAt: String(row.created_at ?? new Date().toISOString()),
  };
}

export async function loadVerifiedContacts(ownerWallet: string): Promise<{
  contacts: VerifiedContact[];
  mode: StorageMode;
  error?: string;
}> {
  const client = getSupabase();
  if (!client) {
    const cached = await readLocalContacts(ownerWallet);
    return { contacts: cached, mode: 'local-cache' };
  }

  try {
    const { data, error } = await client
      .from('contacts')
      .select('id, owner_wallet, name, normalized_name, recipient_address, verified, created_at')
      .eq('owner_wallet', ownerWallet)
      .order('created_at', { ascending: false });

    if (error) {
      const cached = await readLocalContacts(ownerWallet);
      return { contacts: cached, mode: 'local-cache', error: error.message };
    }

    const contacts = (data ?? []).map((row) => mapDbContact(row as Record<string, unknown>));
    await writeLocalContacts(ownerWallet, contacts);
    return { contacts, mode: 'supabase' };
  } catch (err) {
    const cached = await readLocalContacts(ownerWallet);
    return {
      contacts: cached,
      mode: 'local-cache',
      error: err instanceof Error ? err.message : 'Supabase unreachable; using local cache.',
    };
  }
}

export async function upsertVerifiedContact(params: {
  ownerWallet: string;
  name: string;
  recipientAddress: string;
}): Promise<{ contact: VerifiedContact; mode: StorageMode; warning?: string }> {
  const cleanName = params.name.trim().replace(/\s+/g, ' ');
  const cleanAddress = params.recipientAddress.trim();

  if (!cleanName || cleanName.length > 50) {
    throw new Error('Contact name must be between 1 and 50 characters.');
  }
  if (!isValidSolanaAddress(cleanAddress)) {
    throw new Error('Invalid Solana address. Please enter a valid Base58 Devnet address.');
  }
  if (!isValidSolanaAddress(params.ownerWallet)) {
    throw new Error('Connect your Solana wallet before saving contacts.');
  }

  const normalizedName = normalizeContactSeed(cleanName);
  const localFallbackContact: VerifiedContact = {
    id: `local-${Date.now()}`,
    ownerWallet: params.ownerWallet,
    name: cleanName,
    normalizedName,
    recipientAddress: cleanAddress,
    verified: true,
    createdAt: new Date().toISOString(),
  };

  const client = getSupabase();
  if (!client) {
    const existing = await readLocalContacts(params.ownerWallet);
    const merged = [
      localFallbackContact,
      ...existing.filter((c) => c.normalizedName !== normalizedName),
    ];
    await writeLocalContacts(params.ownerWallet, merged);
    return { contact: localFallbackContact, mode: 'local-cache' };
  }

  try {
    const { data, error } = await client
      .from('contacts')
      .upsert(
        {
          owner_wallet: params.ownerWallet,
          name: cleanName,
          normalized_name: normalizedName,
          recipient_address: cleanAddress,
          verified: true,
        },
        { onConflict: 'owner_wallet,normalized_name' }
      )
      .select('id, owner_wallet, name, normalized_name, recipient_address, verified, created_at')
      .single();

    if (error || !data) {
      throw new Error(error?.message ?? 'Failed to save contact to Supabase.');
    }

    const saved = mapDbContact(data as Record<string, unknown>);
    const existing = await readLocalContacts(params.ownerWallet);
    await writeLocalContacts(params.ownerWallet, [
      saved,
      ...existing.filter((c) => c.normalizedName !== saved.normalizedName),
    ]);
    return { contact: saved, mode: 'supabase' };
  } catch (err) {
    const existing = await readLocalContacts(params.ownerWallet);
    const merged = [
      localFallbackContact,
      ...existing.filter((c) => c.normalizedName !== normalizedName),
    ];
    await writeLocalContacts(params.ownerWallet, merged);
    return {
      contact: localFallbackContact,
      mode: 'local-cache',
      warning: err instanceof Error ? err.message : 'Saved locally; Supabase sync pending.',
    };
  }
}

export async function deleteVerifiedContact(params: {
  ownerWallet: string;
  contactId: string;
  normalizedName: string;
}): Promise<{ mode: StorageMode; warning?: string }> {
  const existing = await readLocalContacts(params.ownerWallet);
  await writeLocalContacts(
    params.ownerWallet,
    existing.filter(
      (c) => c.id !== params.contactId && c.normalizedName !== params.normalizedName
    )
  );

  const client = getSupabase();
  if (!client || params.contactId.startsWith('local-')) {
    return { mode: client ? 'supabase' : 'local-cache' };
  }

  try {
    const { error } = await client
      .from('contacts')
      .delete()
      .eq('id', params.contactId)
      .eq('owner_wallet', params.ownerWallet);

    if (error) {
      return { mode: 'local-cache', warning: error.message };
    }
    return { mode: 'supabase' };
  } catch (err) {
    return {
      mode: 'local-cache',
      warning: err instanceof Error ? err.message : 'Deleted locally; Supabase unreachable.',
    };
  }
}

export async function loadDevnetTransactions(ownerWallet: string): Promise<{
  transactions: DevnetTransactionRecord[];
  mode: StorageMode;
  error?: string;
}> {
  const client = getSupabase();
  if (!client) {
    const cached = await readLocalTransactions(ownerWallet);
    return { transactions: cached, mode: 'local-cache' };
  }

  try {
    const { data, error } = await client
      .from('transactions')
      .select(
        'id, owner_wallet, recipient_name, recipient_address, asset, amount, fee_sol, ata_created, signature, cluster, status, created_at'
      )
      .eq('owner_wallet', ownerWallet)
      .order('created_at', { ascending: false })
      .limit(30);

    if (error) {
      const cached = await readLocalTransactions(ownerWallet);
      return { transactions: cached, mode: 'local-cache', error: error.message };
    }

    const transactions = (data ?? []).map((row) =>
      mapDbTransaction(row as Record<string, unknown>)
    );
    await writeLocalTransactions(ownerWallet, transactions);
    return { transactions, mode: 'supabase' };
  } catch (err) {
    const cached = await readLocalTransactions(ownerWallet);
    return {
      transactions: cached,
      mode: 'local-cache',
      error: err instanceof Error ? err.message : 'Supabase unreachable; using local history.',
    };
  }
}

export async function recordDevnetTransaction(params: {
  ownerWallet: string;
  recipientName: string;
  recipientAddress: string;
  asset: 'SOL' | 'USDC';
  amount: number;
  feeSol: number;
  ataCreated: boolean;
  signature: string;
  status?: 'confirmed' | 'failed';
}): Promise<{ record: DevnetTransactionRecord; mode: StorageMode; warning?: string }> {
  const fallbackRecord: DevnetTransactionRecord = {
    id: `local-tx-${Date.now()}`,
    ownerWallet: params.ownerWallet,
    recipientName: params.recipientName,
    recipientAddress: params.recipientAddress,
    asset: params.asset,
    amount: params.amount,
    feeSol: params.feeSol,
    ataCreated: params.ataCreated,
    signature: params.signature,
    cluster: 'solana:devnet',
    status: params.status ?? 'confirmed',
    createdAt: new Date().toISOString(),
  };

  const client = getSupabase();
  if (!client) {
    const existing = await readLocalTransactions(params.ownerWallet);
    await writeLocalTransactions(params.ownerWallet, [fallbackRecord, ...existing]);
    return { record: fallbackRecord, mode: 'local-cache' };
  }

  try {
    const { data, error } = await client
      .from('transactions')
      .insert({
        owner_wallet: params.ownerWallet,
        recipient_name: params.recipientName,
        recipient_address: params.recipientAddress,
        asset: params.asset,
        amount: params.amount,
        fee_sol: params.feeSol,
        ata_created: params.ataCreated,
        signature: params.signature,
        cluster: 'solana:devnet',
        status: params.status ?? 'confirmed',
      })
      .select(
        'id, owner_wallet, recipient_name, recipient_address, asset, amount, fee_sol, ata_created, signature, cluster, status, created_at'
      )
      .single();

    if (error || !data) {
      throw new Error(error?.message ?? 'Failed to insert transaction in Supabase.');
    }

    const saved = mapDbTransaction(data as Record<string, unknown>);
    const existing = await readLocalTransactions(params.ownerWallet);
    await writeLocalTransactions(params.ownerWallet, [saved, ...existing]);
    return { record: saved, mode: 'supabase' };
  } catch (err) {
    const existing = await readLocalTransactions(params.ownerWallet);
    await writeLocalTransactions(params.ownerWallet, [fallbackRecord, ...existing]);
    return {
      record: fallbackRecord,
      mode: 'local-cache',
      warning: err instanceof Error ? err.message : 'Logged locally; Supabase sync failed.',
    };
  }
}
