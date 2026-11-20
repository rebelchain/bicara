import { SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { EN_UI_COPY } from '../../src/i18n/en';

export default function HistoryStep1Screen() {
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <Text style={styles.kicker}>{EN_UI_COPY.history.kicker}</Text>
        <Text style={styles.title}>{EN_UI_COPY.history.title}</Text>
        <Text style={styles.body}>{EN_UI_COPY.history.body}</Text>
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
