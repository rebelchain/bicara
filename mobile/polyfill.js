// MUST be imported first in index.js before expo-router or any @solana/kit module.
// Installs WebCrypto (crypto.subtle, crypto.getRandomValues) and Buffer shims on Hermes.
import 'react-native-get-random-values';
import { install } from 'react-native-quick-crypto';

install();
