import { Tabs } from 'expo-router';
import { speakEyesFree } from '../../src/services/speech';

export default function SpokenTabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#0F1215',
          borderTopColor: '#1E2329',
          height: 64,
          paddingBottom: 8,
          paddingTop: 6,
        },
        tabBarActiveTintColor: '#22C55E',
        tabBarInactiveTintColor: '#64748B',
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: 'Home', tabBarAccessibilityLabel: 'Tab Beranda Suara' }}
        listeners={{
          tabPress: () => {
            void speakEyesFree(
              'Halaman Beranda. Sentuh layar di mana saja lalu bicara.',
              'tick'
            );
          },
        }}
      />
      <Tabs.Screen
        name="contacts"
        options={{ title: 'Contacts', tabBarAccessibilityLabel: 'Tab Daftar Kontak' }}
        listeners={{
          tabPress: () => {
            void speakEyesFree(
              'Halaman Kontak. Daftar kontak penerima USDC kamu.',
              'tick'
            );
          },
        }}
      />
      <Tabs.Screen
        name="history"
        options={{ title: 'History', tabBarAccessibilityLabel: 'Tab Riwayat Transaksi' }}
        listeners={{
          tabPress: () => {
            void speakEyesFree(
              'Halaman Riwayat. Daftar transaksi USDC terakhir kamu.',
              'tick'
            );
          },
        }}
      />
    </Tabs>
  );
}
