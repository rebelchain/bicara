import { View } from 'react-native';
import { Tabs } from 'expo-router';
import { useBicaraStore } from '../../src/context/BicaraStoreContext';
import { EN_UI_COPY, EN_VOICE_SCRIPTS } from '../../src/i18n/en';
import { speakEyesFree } from '../../src/services/speech';

export default function SpokenTabsLayout() {
  const { balances, contacts, transactions } = useBicaraStore();

  const latestTxSummary =
    transactions.length > 0
      ? `${transactions[0].amount} ${transactions[0].asset} to ${transactions[0].recipientName}`
      : null;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        sceneStyle: {
          backgroundColor: '#0F0F0F',
        },
        tabBarStyle: {
          backgroundColor: '#1A1A1A',
          borderTopColor: 'rgba(255, 255, 255, 0.08)',
          borderTopWidth: 1,
          borderTopLeftRadius: 28,
          borderTopRightRadius: 28,
          height: 76,
          paddingBottom: 12,
          paddingTop: 10,
        },
        tabBarActiveTintColor: '#CCFF00',
        tabBarInactiveTintColor: '#71717A',
        tabBarIcon: ({ focused, color }) => (
          <View
            style={{
              width: focused ? 28 : 8,
              height: 4,
              borderRadius: 999,
              backgroundColor: color,
            }}
          />
        ),
        tabBarLabelStyle: {
          fontSize: 13,
          fontWeight: '700',
          marginTop: 2,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: EN_UI_COPY.tabs.homeTitle,
          tabBarAccessibilityLabel: EN_UI_COPY.tabs.homeA11y,
        }}
        listeners={{
          tabPress: () => {
            void speakEyesFree(
              EN_VOICE_SCRIPTS.navHome(balances?.usdc ?? 0, balances?.sol ?? 0),
              'tick',
              { preferElevenLabs: false }
            );
          },
        }}
      />
      <Tabs.Screen
        name="contacts"
        options={{
          title: EN_UI_COPY.tabs.contactsTitle,
          tabBarAccessibilityLabel: EN_UI_COPY.tabs.contactsA11y,
        }}
        listeners={{
          tabPress: () => {
            void speakEyesFree(
              EN_VOICE_SCRIPTS.navContacts(
                contacts.length,
                contacts.map((c) => c.name)
              ),
              'tick',
              { preferElevenLabs: false }
            );
          },
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: EN_UI_COPY.tabs.historyTitle,
          tabBarAccessibilityLabel: EN_UI_COPY.tabs.historyA11y,
        }}
        listeners={{
          tabPress: () => {
            void speakEyesFree(
              EN_VOICE_SCRIPTS.navHistory(transactions.length, latestTxSummary),
              'tick',
              { preferElevenLabs: false }
            );
          },
        }}
      />
    </Tabs>
  );
}
