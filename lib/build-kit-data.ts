export interface UsbSetupStep {
  id: string;
  stepNum: string;
  title: string;
  detail: string;
  commandUsb: string;
  commandWireless?: string;
}

export interface BuildScopeItem {
  id: string;
  title: string;
  bucket: 'hackathon' | 'roadmap';
  stageLabel: string;
  status: 'Scaffolded (Step 1)' | 'Next Build Step' | 'Post-Hackathon';
  detail: string;
  verification: string;
}

export const USB_SETUP_STEPS: UsbSetupStep[] = [
  {
    id: 'usb-prereq',
    stepNum: '01',
    title: 'Verifikasi JDK 17 & Android SDK (Tanpa Emulator)',
    detail:
      'Laptop hanya membutuhkan Node 20+, JDK 17, dan Android SDK Platform-Tools / Build-Tools. Tidak perlu menjalankan emulator berat.',
    commandUsb: 'java -version && adb version && node -v',
  },
  {
    id: 'usb-connect',
    stepNum: '02',
    title: 'Hubungkan HP Android via Kabel USB + Aktifkan USB Debugging',
    detail:
      'Buka Settings → Developer Options → USB Debugging di HP fisik, colok kabel data, lalu klik Allow pada prompt RSA fingerprint di layar HP.',
    commandUsb: 'adb devices',
  },
  {
    id: 'usb-reverse',
    stepNum: '03',
    title: 'Bridge Port Voice Proxy & Metro Lewat USB',
    detail:
      'Dengan adb reverse, HP fisik dapat memanggil http://localhost:3000 (/api/stt, /api/intent, /api/tts) secara instan tanpa masalah firewall Wi-Fi.',
    commandUsb: 'adb reverse tcp:3000 tcp:3000 && adb reverse tcp:8081 tcp:8081',
    commandWireless:
      '# Demo tanpa kabel: set EXPO_PUBLIC_API_BASE_URL di mobile/.env ke URL publik / IP LAN laptop\nEXPO_PUBLIC_API_BASE_URL=https://your-bicara-proxy.example.com',
  },
  {
    id: 'usb-wallet',
    stepNum: '04',
    title: 'Siapkan Phantom / Solflare (Devnet Mode) di HP',
    detail:
      'Install Phantom atau Solflare dari Play Store di HP fisik → Settings → Developer Settings → aktifkan Testnet Mode (Solana Devnet) dan isi Devnet SOL + USDC.',
    commandUsb:
      '# Opsional via Solana CLI di laptop untuk isi gas Devnet ke wallet HP kamu:\nsolana airdrop 2 <ALAMAT_WALLET_HP> --url devnet',
  },
  {
    id: 'usb-build',
    stepNum: '05',
    title: 'Install & Compile Expo Custom Dev Client ke HP Fisik',
    detail:
      'MWA 2.0 dan react-native-quick-crypto membutuhkan Custom Dev Client (bukan Expo Go). Build awal ~2–4 menit, setelah itu reload JS instan.',
    commandUsb: 'cd mobile && cp .env.example .env && npm install && npx expo run:android',
  },
  {
    id: 'usb-scrcpy',
    stepNum: '06',
    title: 'Opsional: Mirror Layar HP ke Laptop untuk Presentasi Juri',
    detail:
      'Gunakan scrcpy agar juri melihat langsung layar HP fisik saat demo Screen Curtain & Phantom signing sambil kamu memegang HP dengan getaran nyata.',
    commandUsb: 'scrcpy --stay-awake --window-title "Bicara Live Demo"',
  },
];

export const BUILD_SCOPE_ITEMS: BuildScopeItem[] = [
  {
    id: 'scope-step-1',
    title: 'Step 1 · Expo Custom Dev Build + Polyfills + Physical Haptics + Voice Proxy',
    bucket: 'hackathon',
    stageLabel: 'Step 1 (Done in Scaffold)',
    status: 'Scaffolded (Step 1)',
    detail:
      'Entry polyfill.js (react-native-quick-crypto), MWA Track A provider (@wallet-ui/react-native-kit), expo-haptics fisik 4 pola, expo-audio recorder, spoken tabs, serta server proxy /api/health, /api/stt (scribe_v2), dan /api/tts (eleven_flash_v2_5).',
    verification:
      'APK terpasang di HP USB, sambutan suara keluar, getaran fisik terasa, Connect MWA membuka Phantom Devnet, /api/health merespons Connected.',
  },
  {
    id: 'scope-step-2',
    title: 'Step 2 · Live Devnet Balance + Supabase Contacts + Spoken Onboarding',
    bucket: 'hackathon',
    stageLabel: 'Step 2 (Next)',
    status: 'Next Build Step',
    detail:
      'Membaca saldo Devnet USDC & SOL nyata via @solana/kit RPC, menghubungkan tabel Supabase (contacts + transactions), dan menjalankan alur Voice-Guided Onboarding bersuara penuh di HP fisik.',
    verification:
      'Ucapkan "Cek saldo" dan "Buka kontak" di HP membaca data nyata dari Devnet RPC & Supabase.',
  },
  {
    id: 'scope-step-3',
    title: 'Step 3 · Live Voice Payment Loop + On-Device Voiceprint (Picovoice Eagle)',
    bucket: 'hackathon',
    stageLabel: 'Step 3',
    status: 'Next Build Step',
    detail:
      'Rekaman expo-audio → /api/stt (scribe_v2) → /api/intent (Gemini 4 Hydrogen) → Factor 1 Voiceprint Gate (@picovoice/eagle-react-native + expo-secure-store) → konfirmasi suara "Ya" → TransferChecked via Phantom MWA → /api/tts (eleven_flash_v2_5).',
    verification:
      'Suara User A sukses mengirim 5 USDC Devnet di HP; suara teman (Impostor B) diblokir dengan Triple Pulse haptic.',
  },
  {
    id: 'scope-step-4',
    title: 'Step 4 · On-Chain Anchor ContactRegistry PDA + 45s Screen Curtain Demo',
    bucket: 'hackathon',
    stageLabel: 'Step 4',
    status: 'Next Build Step',
    detail:
      'Deploy program Anchor ContactRegistry (~120 baris Rust) ke Solana Devnet dengan dual-write Supabase + PDA seed lowercase, lalu gladi bersih demo 45 detik Mode Layar Gelap (Screen Curtain) di HP fisik.',
    verification:
      'Transaksi add_contact & TransferChecked keduanya terverifikasi di Solana Explorer Devnet.',
  },
  {
    id: 'roadmap-mainnet',
    title: 'Mainnet-Beta Security Audit & Real USDC Launch',
    bucket: 'roadmap',
    stageLabel: 'Production Roadmap 01',
    status: 'Post-Hackathon',
    detail:
      'Audit independen kontrak ContactRegistry PDA, rate-limiting server proxy, pemantauan anomaly transaksi, dan perpindahan dari Devnet ke Solana Mainnet-Beta.',
    verification: 'Laporan audit keamanan & deployment Mainnet-Beta terverifikasi.',
  },
  {
    id: 'roadmap-seeker-store',
    title: 'Solana Seeker dApp Store & Hardware Seed Vault Attestation',
    bucket: 'roadmap',
    stageLabel: 'Production Roadmap 02',
    status: 'Post-Hackathon',
    detail:
      'Rilis APK produksi bertanda tangan ke Solana Mobile dApp Store dengan integrasi langsung hardware Seed Vault attestation di perangkat Seeker.',
    verification: 'Listing publik di Solana dApp Store.',
  },
  {
    id: 'roadmap-offline-stt',
    title: 'Offline On-Device STT, Wake-Word ("Halo Bicara") & Bahasa Daerah',
    bucket: 'roadmap',
    stageLabel: 'Production Roadmap 03',
    status: 'Post-Hackathon',
    detail:
      'Menambahkan wake-word hands-free on-device dan model STT lokal ringan untuk daerah bersinyal lemah plus dukungan aksen Jawa, Sunda, dan Melayu.',
    verification: 'Perintah navigasi & cek kontak bekerja tanpa koneksi internet stabil.',
  },
];
