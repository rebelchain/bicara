import { View } from 'react-native';
import { Tabs } from 'expo-router';
import { EN_UI_COPY, EN_VOICE_SCRIPTS } from '../../src/i18n/en';
import { speakEyesFree } from '../../src/services/speech';

export default function SpokenTabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#0F1215',
          borderTopColor: '#1E2329',
          height: 68,
          paddingBottom: 10,
          paddingTop: 8,
        },
        tabBarActiveTintColor: '#22C55E',
        tabBarInactiveTintColor: '#64748B',
        tabBarIcon: ({ focused, color }) => (
          <View
            style={{
              width: focused ? 24 : 8,
              height: 4,
              borderRadius: 999,
              backgroundColor: color,
            }}
          />
        ),
        tabBarLabelStyle: {
          fontSize: 13,
          fontWeight: '600',
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
            void speakEyesFree(EN_VOICE_SCRIPTS.navHome(0, 0), 'tick');
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
            void speakEyesFree(EN_VOICE_SCRIPTS.navContacts(0, []), 'tick');
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
            void speakEyesFree(EN_VOICE_SCRIPTS.navHistory(0, null), 'tick');
          },
        }}
      />
    </Tabs>
  );
}
