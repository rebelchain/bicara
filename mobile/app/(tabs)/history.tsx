import { useState } from 'react';
import {
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
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

  const [selectedTx, setSelectedTx] = useState<DevnetTransactionRecord | null>(null);

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
            <Text style={styles.kicker}>Solana Devnet Receipts</Text>
            <Text style={styles.title}>Activity</Text>
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
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>
              Connect your Solflare wallet on the Home tab to load confirmed Devnet receipts.
            </Text>
          </View>
        ) : loadingTransactions ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>Loading Devnet transaction history...</Text>
          </View>
        ) : transactions.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>
              No transfers yet. Tap Send on Home or say &ldquo;Send 0.01 SOL to Ahmad&rdquo; to
              create your first verified Devnet receipt.
            </Text>
          </View>
        ) : (
          transactions.map((tx) => (
            <Pressable
              key={tx.id}
              onPress={() => setSelectedTx(tx)}
              accessibilityRole="button"
              accessibilityLabel={`Sent ${tx.amount} ${tx.asset} to ${tx.recipientName}. Tap for full receipt and audio playback.`}
              style={styles.txCard}
            >
              <View style={styles.txLeft}>
                <View style={styles.txIconBox}>
                  <Text style={styles.txIconArrow}>↗</Text>
                </View>
                <View style={styles.txTextCol}>
                  <Text style={styles.txTitle}>Sent to {tx.recipientName}</Text>
                  <Text style={styles.txSub}>
                    Confirmed · {truncateAddress(tx.recipientAddress, 4, 4)}
                  </Text>
                </View>
              </View>
              <View style={styles.txRight}>
                <Text style={styles.txAmount}>
                  -{tx.amount} {tx.asset}
                </Text>
                <Text style={styles.txSub}>Devnet</Text>
              </View>
            </Pressable>
          ))
        )}
      </ScrollView>

      {/* Transaction Details Modal (Spoken Receipt + Explorer Link) */}
      <Modal
        visible={Boolean(selectedTx)}
        animationType="slide"
        transparent
        onRequestClose={() => setSelectedTx(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            {selectedTx ? (
              <>
                <View style={styles.sheetHandle} />
                <View style={styles.sheetHeader}>
                  <View>
                    <Text style={styles.kicker}>Confirmed on Solana Devnet</Text>
                    <Text style={styles.sheetAmount}>
                      {selectedTx.amount} {selectedTx.asset}
                    </Text>
                  </View>
                  <Pressable
                    onPress={() => setSelectedTx(null)}
                    accessibilityRole="button"
                    accessibilityLabel="Close receipt details"
                    style={styles.closeBtn}
                  >
                    <Text style={styles.closeBtnText}>Close</Text>
                  </Pressable>
                </View>

                <View style={styles.detailCard}>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Recipient</Text>
                    <Text style={styles.detailValue}>{selectedTx.recipientName}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Address</Text>
                    <Text style={styles.detailMono}>
                      {truncateAddress(selectedTx.recipientAddress, 6, 4)}
                    </Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Network Fee</Text>
                    <Text style={styles.detailMono}>
                      ~{selectedTx.feeSol.toFixed(6)} SOL
                      {selectedTx.ataCreated ? ' (incl. ATA)' : ''}
                    </Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Signature</Text>
                    <Text style={styles.detailMono}>
                      {truncateAddress(selectedTx.signature, 8, 6)}
                    </Text>
                  </View>
                </View>

                <Pressable
                  onPress={() => void handleSpeakReceipt(selectedTx)}
                  accessibilityRole="button"
                  accessibilityLabel="Hear spoken receipt"
                  style={styles.primaryBtn}
                >
                  <Text style={styles.primaryBtnText}>Hear Spoken Receipt</Text>
                </Pressable>

                <Pressable
                  onPress={() =>
                    void Linking.openURL(getSolanaExplorerTxUrl(selectedTx.signature))
                  }
                  accessibilityRole="link"
                  accessibilityLabel="Open transaction on Solana Devnet Explorer"
                  style={styles.explorerBtn}
                >
                  <Text style={styles.explorerBtnText}>Open on Devnet Explorer ↗</Text>
                </Pressable>
              </>
            ) : null}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0F0F0F' },
  container: { padding: 20, gap: 12, paddingBottom: 36 },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  kicker: { fontSize: 12, color: '#CCFF00', fontWeight: '700' },
  title: { fontSize: 26, fontWeight: '800', color: '#F4F4F5', letterSpacing: -0.4 },
  refreshBtn: {
    minHeight: 42,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: '#1A1A1A',
    borderWidth: 1,
    borderColor: 'rgba(204, 255, 0, 0.25)',
    justifyContent: 'center',
  },
  refreshBtnText: { color: '#CCFF00', fontSize: 12, fontWeight: '700' },
  emptyCard: {
    backgroundColor: '#1A1A1A',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 20,
    padding: 18,
  },
  emptyText: { color: '#A1A1AA', fontSize: 13, lineHeight: 20 },
  txCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1A1A1A',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 20,
    padding: 16,
    gap: 12,
  },
  txLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  txIconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(168, 85, 247, 0.14)',
    borderWidth: 1,
    borderColor: 'rgba(168, 85, 247, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  txIconArrow: { color: '#A855F7', fontSize: 18, fontWeight: '800' },
  txTextCol: { flex: 1, gap: 3 },
  txTitle: { color: '#F4F4F5', fontSize: 15, fontWeight: '700' },
  txSub: { color: '#A1A1AA', fontSize: 12 },
  txRight: { alignItems: 'flex-end', gap: 3 },
  txAmount: { color: '#F4F4F5', fontSize: 15, fontWeight: '800', fontFamily: 'monospace' },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#1A1A1A',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderTopWidth: 1,
    borderTopColor: 'rgba(204, 255, 0, 0.25)',
    padding: 20,
    paddingBottom: 32,
    gap: 14,
  },
  sheetHandle: {
    width: 42,
    height: 4,
    borderRadius: 999,
    backgroundColor: '#3F3F46',
    alignSelf: 'center',
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sheetAmount: {
    fontSize: 28,
    fontWeight: '800',
    color: '#F4F4F5',
    marginTop: 2,
  },
  closeBtn: {
    minHeight: 40,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: '#262626',
    justifyContent: 'center',
  },
  closeBtnText: { color: '#F4F4F5', fontSize: 13, fontWeight: '700' },
  detailCard: {
    backgroundColor: '#0F0F0F',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    padding: 16,
    gap: 12,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  detailLabel: { color: '#A1A1AA', fontSize: 13 },
  detailValue: { color: '#F4F4F5', fontSize: 13, fontWeight: '700' },
  detailMono: { color: '#F4F4F5', fontSize: 12, fontFamily: 'monospace' },
  primaryBtn: {
    minHeight: 52,
    borderRadius: 16,
    backgroundColor: '#CCFF00',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnText: { color: '#0F0F0F', fontSize: 15, fontWeight: '800' },
  explorerBtn: {
    minHeight: 50,
    borderRadius: 16,
    backgroundColor: '#111C2D',
    borderWidth: 1,
    borderColor: '#3B82F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  explorerBtnText: { color: '#93C5FD', fontSize: 14, fontWeight: '700' },
});
