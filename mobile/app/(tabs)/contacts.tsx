import { SafeAreaView, StyleSheet, Text, View } from 'react-native';

export default function ContactsStep1Screen() {
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <Text style={styles.kicker}>Step 2 Target · Supabase + Step 4 Anchor PDA</Text>
        <Text style={styles.title}>Daftar Kontak Penerima</Text>
        <Text style={styles.body}>
          Tab ini sudah tersambung dengan Spoken Navigation dan getar Soft Tick.
          Pada Step 2 kita sambungkan tabel Supabase untuk menyimpan nama panggilan dan
          alamat wallet Solana, lalu di Step 4 dual-write ke Anchor ContactRegistry PDA.
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
