import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useMobileWallet } from '@wallet-ui/react-native-kit';
import {
  fetchDevnetBalances,
  normalizeContactSeed,
  type DevnetBalances,
} from '../services/solana';
import {
  deleteVerifiedContact,
  isSupabaseConfigured,
  loadDevnetTransactions,
  loadVerifiedContacts,
  recordDevnetTransaction,
  upsertVerifiedContact,
  type DevnetTransactionRecord,
  type StorageMode,
  type VerifiedContact,
} from '../services/supabase';

interface BicaraStoreContextValue {
  walletAddress: string | null;
  balances: DevnetBalances | null;
  loadingBalances: boolean;
  contacts: VerifiedContact[];
  loadingContacts: boolean;
  transactions: DevnetTransactionRecord[];
  loadingTransactions: boolean;
  storageMode: StorageMode;
  supabaseConfigured: boolean;
  syncWarning: string | null;
  refreshBalances: () => Promise<DevnetBalances | null>;
  refreshAllData: () => Promise<void>;
  findContactByName: (name: string) => VerifiedContact | null;
  addVerifiedContact: (name: string, recipientAddress: string) => Promise<VerifiedContact>;
  removeVerifiedContact: (contact: VerifiedContact) => Promise<void>;
  logConfirmedTransaction: (params: {
    recipientName: string;
    recipientAddress: string;
    asset: 'SOL' | 'USDC';
    amount: number;
    feeSol: number;
    ataCreated: boolean;
    signature: string;
    status?: 'confirmed' | 'failed';
  }) => Promise<DevnetTransactionRecord>;
}

const BicaraStoreContext = createContext<BicaraStoreContextValue | null>(null);

export function BicaraStoreProvider({ children }: { children: ReactNode }) {
  const { account } = useMobileWallet();
  const walletAddress = account?.address?.toString() ?? null;

  const [balances, setBalances] = useState<DevnetBalances | null>(null);
  const [loadingBalances, setLoadingBalances] = useState(false);

  const [contacts, setContacts] = useState<VerifiedContact[]>([]);
  const [loadingContacts, setLoadingContacts] = useState(false);

  const [transactions, setTransactions] = useState<DevnetTransactionRecord[]>([]);
  const [loadingTransactions, setLoadingTransactions] = useState(false);

  const [storageMode, setStorageMode] = useState<StorageMode>(
    isSupabaseConfigured ? 'supabase' : 'local-cache'
  );
  const [syncWarning, setSyncWarning] = useState<string | null>(null);

  const refreshBalances = useCallback(async (): Promise<DevnetBalances | null> => {
    if (!walletAddress) {
      setBalances(null);
      return null;
    }
    setLoadingBalances(true);
    try {
      const next = await fetchDevnetBalances(walletAddress);
      setBalances(next);
      return next;
    } catch (err) {
      setSyncWarning(
        err instanceof Error ? err.message : 'Failed to fetch Devnet balances from RPC.'
      );
      return null;
    } finally {
      setLoadingBalances(false);
    }
  }, [walletAddress]);

  const refreshAllData = useCallback(async () => {
    if (!walletAddress) {
      setBalances(null);
      setContacts([]);
      setTransactions([]);
      setSyncWarning(null);
      return;
    }

    setLoadingContacts(true);
    setLoadingTransactions(true);
    setSyncWarning(null);

    try {
      const [balRes, contactsRes, txRes] = await Promise.all([
        refreshBalances(),
        loadVerifiedContacts(walletAddress),
        loadDevnetTransactions(walletAddress),
      ]);

      void balRes;
      setContacts(contactsRes.contacts);
      setTransactions(txRes.transactions);
      setStorageMode(
        contactsRes.mode === 'supabase' && txRes.mode === 'supabase'
          ? 'supabase'
          : 'local-cache'
      );

      const errMsg = contactsRes.error || txRes.error || null;
      if (errMsg) {
        setSyncWarning(errMsg);
      }
    } finally {
      setLoadingContacts(false);
      setLoadingTransactions(false);
    }
  }, [walletAddress, refreshBalances]);

  useEffect(() => {
    void refreshAllData();
  }, [refreshAllData]);

  const findContactByName = useCallback(
    (name: string): VerifiedContact | null => {
      const needle = normalizeContactSeed(name);
      if (!needle) return null;
      const exact = contacts.find((c) => c.normalizedName === needle);
      if (exact) return exact;
      return (
        contacts.find(
          (c) => c.normalizedName.includes(needle) || needle.includes(c.normalizedName)
        ) ?? null
      );
    },
    [contacts]
  );

  const addVerifiedContact = useCallback(
    async (name: string, recipientAddress: string): Promise<VerifiedContact> => {
      if (!walletAddress) {
        throw new Error('Connect your Solana wallet first before adding a contact.');
      }
      const res = await upsertVerifiedContact({
        ownerWallet: walletAddress,
        name,
        recipientAddress,
      });
      setStorageMode(res.mode);
      if (res.warning) setSyncWarning(res.warning);
      setContacts((prev) => [
        res.contact,
        ...prev.filter((c) => c.normalizedName !== res.contact.normalizedName),
      ]);
      return res.contact;
    },
    [walletAddress]
  );

  const removeVerifiedContact = useCallback(
    async (contact: VerifiedContact): Promise<void> => {
      if (!walletAddress) return;
      const res = await deleteVerifiedContact({
        ownerWallet: walletAddress,
        contactId: contact.id,
        normalizedName: contact.normalizedName,
      });
      setStorageMode(res.mode);
      if (res.warning) setSyncWarning(res.warning);
      setContacts((prev) =>
        prev.filter((c) => c.id !== contact.id && c.normalizedName !== contact.normalizedName)
      );
    },
    [walletAddress]
  );

  const logConfirmedTransaction = useCallback(
    async (params: {
      recipientName: string;
      recipientAddress: string;
      asset: 'SOL' | 'USDC';
      amount: number;
      feeSol: number;
      ataCreated: boolean;
      signature: string;
      status?: 'confirmed' | 'failed';
    }): Promise<DevnetTransactionRecord> => {
      if (!walletAddress) {
        throw new Error('Wallet disconnected.');
      }
      const res = await recordDevnetTransaction({
        ownerWallet: walletAddress,
        ...params,
      });
      setStorageMode(res.mode);
      if (res.warning) setSyncWarning(res.warning);
      setTransactions((prev) => [res.record, ...prev]);
      return res.record;
    },
    [walletAddress]
  );

  const value = useMemo<BicaraStoreContextValue>(
    () => ({
      walletAddress,
      balances,
      loadingBalances,
      contacts,
      loadingContacts,
      transactions,
      loadingTransactions,
      storageMode,
      supabaseConfigured: isSupabaseConfigured,
      syncWarning,
      refreshBalances,
      refreshAllData,
      findContactByName,
      addVerifiedContact,
      removeVerifiedContact,
      logConfirmedTransaction,
    }),
    [
      walletAddress,
      balances,
      loadingBalances,
      contacts,
      loadingContacts,
      transactions,
      loadingTransactions,
      storageMode,
      syncWarning,
      refreshBalances,
      refreshAllData,
      findContactByName,
      addVerifiedContact,
      removeVerifiedContact,
      logConfirmedTransaction,
    ]
  );

  return <BicaraStoreContext.Provider value={value}>{children}</BicaraStoreContext.Provider>;
}

export function useBicaraStore(): BicaraStoreContextValue {
  const ctx = useContext(BicaraStoreContext);
  if (!ctx) {
    throw new Error('useBicaraStore must be used within BicaraStoreProvider.');
  }
  return ctx;
}
