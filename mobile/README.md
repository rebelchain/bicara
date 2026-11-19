# Bicara Mobile — Step 1 Expo Custom Dev Build (HP Android Fisik via USB)

Proyek ini menggunakan **Solana Mobile Track A** (`@solana/kit` + `@wallet-ui/react-native-kit` + `@solana-program/token`), **Expo Custom Dev Build** (bukan Expo Go), **`expo-haptics`** fisik nyata, dan **`expo-audio`**.

## Prasyarat Laptop (Tanpa Android Emulator)
1. **Node.js 20+**
2. **JDK 17** (`JAVA_HOME` terpasang)
3. **Android SDK Platform-Tools & Build-Tools** (`ANDROID_HOME` terpasang, `adb` tersedia di PATH)
4. **HP Android Fisik** dengan **USB Debugging** aktif + aplikasi **Phantom** atau **Solflare** (aktifkan **Developer Settings → Testnet Mode → Solana Devnet**)

## Menjalankan Step 1 di HP Fisik (USB)
```bash
# 1. Pastikan HP Android terdeteksi di laptop
adb devices

# 2. Teruskan port backend Voice Proxy (3000) dan Metro (8081) lewat kabel USB
adb reverse tcp:3000 tcp:3000
adb reverse tcp:8081 tcp:8081

# 3. Install dependensi & salin env lokal
cd mobile
cp .env.example .env
npm install

# 4. Build & install Custom Dev Client langsung ke HP fisik via USB
npx expo run:android
```

## Checklist Sukses Step 1 di HP
- [ ] Aplikasi **Bicara** terbuka tanpa error `crypto.getRandomValues` atau `Buffer`
- [ ] HP langsung membacakan sambutan suara otomatis (*Zero-Silent-Screen*)
- [ ] Ketuk **Connect MWA** → Phantom/Solflare Devnet terbuka dan alamat wallet muncul terpotong aman
- [ ] Ketuk tombol uji **expo-haptics** → 4 pola getar fisik terasa berbeda di tangan
- [ ] Sentuh area **Tap-Anywhere** → izin mikrofon aktif dan `expo-audio` merekam file `.m4a`
- [ ] Ketuk **Cek Koneksi Voice Proxy** → `/api/health` merespons `Connected`
