import { SafeAreaView, StyleSheet, Text, View } from 'react-native';

export default function HistoryStep1Screen() {
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <Text style={styles.kicker}>Step 3 Target · Solana Devnet Signatures</Text>
        <Text style={styles.title}>Riwayat Transaksi USDC</Text>
        <Text style={styles.body}>
          Setiap pengiriman USDC yang dikonfirmasi lewat Phantom/Solflare MWA akan
          tercatat di sini bersama tautan Solana Explorer Devnet dan dapat dibacakan
          ulang dengan perintah suara &ldquo;Buka riwayat&rdquo;.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0B0D0E' },
  container: { flex: 1, padding: 20, gap: 10 },
  kicker: { fontSize: 12, color: '#4ADE80' },
  title: { fontSize: 22, fontWeight: '700', color: '#F8FAFC' },
  body: { fontSize: 14, color: '#94A3B8', lineHeight: 22 },
});
