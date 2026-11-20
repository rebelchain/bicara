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
  safe: { flex: 1, backgroundColor: '#0F0F0F' },
  container: { padding: 20, gap: 14, paddingBottom: 40 },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  kicker: { fontSize: 12, color: '#CCFF00', fontWeight: '700' },
  title: { fontSize: 22, fontWeight: '800', color: '#F4F4F5' },
  refreshBtn: {
    minHeight: 40,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: '#1A1A1A',
    borderWidth: 1,
    borderColor: 'rgba(204, 255, 0, 0.3)',
    justifyContent: 'center',
  },
  refreshBtnText: { color: '#CCFF00', fontSize: 12, fontWeight: '700' },
  emptyText: { color: '#A1A1AA', fontSize: 13, lineHeight: 20 },
  txCard: {
    backgroundColor: '#1A1A1A',
    borderWidth: 1,
    borderColor: '#262626',
    borderRadius: 18,
    padding: 16,
    gap: 6,
  },
  txTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  txAmount: { color: '#F4F4F5', fontSize: 15, fontWeight: '700', flex: 1 },
  txStatus: { color: '#22C55E', fontSize: 11, fontWeight: '800' },
  txMeta: { color: '#A1A1AA', fontSize: 12, fontFamily: 'monospace' },
  txSig: { color: '#D4D4D8', fontSize: 11, fontFamily: 'monospace' },
  txActions: { flexDirection: 'row', gap: 10, marginTop: 8 },
  hearBtn: {
    flex: 1,
    minHeight: 44,
    borderRadius: 12,
    backgroundColor: '#CCFF00',
    alignItems: 'center',
    justifyContent: 'center',
  },
  hearBtnText: { color: '#0F0F0F', fontSize: 12, fontWeight: '800' },
  explorerBtn: {
    flex: 1,
    minHeight: 44,
    borderRadius: 12,
    backgroundColor: '#111C2D',
    borderWidth: 1,
    borderColor: '#3B82F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  explorerBtnText: { color: '#93C5FD', fontSize: 12, fontWeight: '700' },
});
