import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { MobileWalletProvider } from '@wallet-ui/react-native-kit';
import { BicaraStoreProvider } from '../src/context/BicaraStoreContext';
import {
  BICARA_APP_IDENTITY,
  SOLANA_CHAIN_ID,
  SOLANA_DEVNET_RPC,
} from '../src/services/solana';

export default function RootLayout() {
  return (
    <MobileWalletProvider
      cluster={{
        id: SOLANA_CHAIN_ID,
        url: SOLANA_DEVNET_RPC,
      }}
      identity={BICARA_APP_IDENTITY}
    >
      <BicaraStoreProvider>
        <StatusBar style="light" backgroundColor="#0B0D0E" />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: '#0B0D0E' },
          }}
        >
          <Stack.Screen name="(tabs)" />
        </Stack>
      </BicaraStoreProvider>
    </MobileWalletProvider>
  );
}
