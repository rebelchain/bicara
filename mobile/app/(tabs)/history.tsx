import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useBicaraStore } from '../../src/context/BicaraStoreContext';
import { getSolanaExplorerTxUrl, truncateAddress } from '../../src/services/solana';
import { speakEyesFree } from '../../src/services/speech';
import type { DevnetTransactionRecord } from '../../src/services/supabase';

export default function HistoryScreen() {
  const {
    walletAddress,
    transactions,
    loadingTransactions,
    storageMode,
    refreshAllData,
  } = useBicaraStore();

  const handleSpeakReceipt = async (tx: DevnetTransactionRecord) => {
    const text =
      `Confirmed Devnet transfer. You sent ${tx.amount} ${tx.asset} to ${tx.recipientName}, ` +
      `wallet ending ${tx.recipientAddress.slice(-4)}. ` +
      `Signature ending ${tx.signature.slice(-4)}.`;
    await speakEyesFree(text, 'tick', true);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.kicker}>Gate B · Solana Devnet Receipts</Text>
            <Text style={styles.title}>History ({transactions.length})</Text>
          </View>
          <Pressable
            onPress={() => void refreshAllData()}
            accessibilityRole="button"
            accessibilityLabel="Refresh transaction history"
            style={styles.refreshBtn}
          >
            <Text style={styles.refreshBtnText}>
              {storageMode === 'supabase' ? 'Supabase' : 'Local'} ↻
            </Text>
          </Pressable>
        </View>

        {!walletAddress ? (
          <Text style={styles.emptyText}>
            Connect your Solflare wallet on the Home tab to load confirmed Devnet receipts.
          </Text>
        ) : loadingTransactions ? (
          <Text style={styles.emptyText}>Loading Devnet transaction history...</Text>
        ) : transactions.length === 0 ? (
          <Text style={styles.emptyText}>
            No Devnet transfers recorded yet. Add a verified contact in Contacts, then tap anywhere
            on Home and say &ldquo;Send 0.01 SOL to Ahmad&rdquo;.
          </Text>
        ) : (
          transactions.map((tx) => {
            const explorerUrl = getSolanaExplorerTxUrl(tx.signature);
            return (
              <View key={tx.id} style={styles.txCard}>
                <View style={styles.txTopRow}>
                  <Text style={styles.txAmount}>
                    {tx.amount} {tx.asset} → {tx.recipientName}
                  </Text>
                  <Text style={styles.txStatus}>{tx.status.toUpperCase()}</Text>
                </View>

                <Text style={styles.txMeta}>
                  To: {truncateAddress(tx.recipientAddress, 6, 4)} · Fee: ~{tx.feeSol.toFixed(6)}{' '}
                  SOL
                  {tx.ataCreated ? ' (incl. ATA rent)' : ''}
                </Text>
                <Text style={styles.txSig}>Sig: {truncateAddress(tx.signature, 10, 8)}</Text>

                <View style={styles.txActions}>
                  <Pressable
                    onPress={() => void handleSpeakReceipt(tx)}
                    accessibilityRole="button"
                    accessibilityLabel={`Hear spoken receipt for ${tx.amount} ${tx.asset} to ${tx.recipientName}`}
                    style={styles.hearBtn}
                  >
                    <Text style={styles.hearBtnText}>Hear Receipt</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => void Linking.openURL(explorerUrl)}
                    accessibilityRole="link"
                    accessibilityLabel="Open transaction on Solana Devnet Explorer"
                    style={styles.explorerBtn}
                  >
                    <Text style={styles.explorerBtnText}>Devnet Explorer ↗</Text>
                  </Pressable>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0B0D0E' },
  container: { padding: 20, gap: 14, paddingBottom: 40 },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  kicker: { fontSize: 12, color: '#4ADE80', fontWeight: '600' },
  title: { fontSize: 22, fontWeight: '700', color: '#F8FAFC' },
  refreshBtn: {
    minHeight: 38,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: '#14171A',
    borderWidth: 1,
    borderColor: '#262B30',
    justifyContent: 'center',
  },
  refreshBtnText: { color: '#4ADE80', fontSize: 12, fontWeight: '600' },
  emptyText: { color: '#64748B', fontSize: 13, lineHeight: 20 },
  txCard: {
    backgroundColor: '#14171A',
    borderWidth: 1,
    borderColor: '#23282E',
    borderRadius: 14,
    padding: 14,
    gap: 6,
  },
  txTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  txAmount: { color: '#F8FAFC', fontSize: 15, fontWeight: '700', flex: 1 },
  txStatus: { color: '#4ADE80', fontSize: 11, fontWeight: '700' },
  txMeta: { color: '#94A3B8', fontSize: 12, fontFamily: 'monospace' },
  txSig: { color: '#CBD5E1', fontSize: 11, fontFamily: 'monospace' },
  txActions: { flexDirection: 'row', gap: 10, marginTop: 6 },
  hearBtn: {
    flex: 1,
    minHeight: 42,
    borderRadius: 10,
    backgroundColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  hearBtnText: { color: '#E2E8F0', fontSize: 12, fontWeight: '600' },
  explorerBtn: {
    flex: 1,
    minHeight: 42,
    borderRadius: 10,
    backgroundColor: '#0F2417',
    borderWidth: 1,
    borderColor: '#22C55E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  explorerBtnText: { color: '#86EFAC', fontSize: 12, fontWeight: '700' },
});
