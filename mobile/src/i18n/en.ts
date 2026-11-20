/**
 * English Locale Dictionary (`en` — shipped locale)
 * Spoken scripts sourced verbatim from bicara-docs/docs/VOICE_SPEC.md (Part 6).
 */
export interface VoiceScriptsDictionary {
  onboardingWelcome: () => string;
  onboardingWalletReady: (last4: string) => string;
  onboardingComplete: () => string;
  navHome: (usdc: number, sol: number) => string;
  navContacts: (count: number, names: string[]) => string;
  navHistory: (count: number, latestSummary: string | null) => string;
  balanceReadout: (usdc: number, sol: number) => string;
  priceReadout: (solUsd: number) => string;
  sendSuccess: (amount: number, symbol: string, recipient: string) => string;
  contactEditRequiresBiometric: () => string;
  challengePrompt: (digitsSpoken: string) => string;
  unverifiedTokenBlocked: (tokenName: string) => string;
  helpGuide: () => string;
  cancelled: () => string;
}

export const EN_VOICE_SCRIPTS: VoiceScriptsDictionary = {
  onboardingWelcome: () =>
    'Welcome to Bicara, an eyes-free accessibility layer for Solana payments. Tap anywhere on the screen to speak.',
  onboardingWalletReady: (last4: string) =>
    `Wallet connected, ending ${last4}. Every transfer and contact edit will still require your device hardware biometric.`,
  onboardingComplete: () =>
    'Setup complete. You can say check balance, check price, open contacts, open history, send 5 USDC to Ahmad, or swap 10 USDC to SOL.',
  navHome: (usdc: number, sol: number) =>
    `Home screen. Your balance is ${usdc.toFixed(2)} USDC and ${sol.toFixed(3)} SOL. Tap anywhere to speak.`,
  navContacts: (count: number, names: string[]) =>
    count > 0
      ? `Contacts screen. You have ${count} verified contacts: ${names.join(', ')}. Adding or changing a contact requires hardware biometric approval.`
      : 'Contacts screen. You have no saved contacts yet. Adding a contact requires hardware biometric approval.',
  navHistory: (count: number, latestSummary: string | null) =>
    latestSummary
      ? `History screen. ${count} transactions recorded. Most recent: ${latestSummary}.`
      : 'History screen. No transactions sent yet.',
  balanceReadout: (usdc: number, sol: number) =>
    `Your Devnet balance is ${usdc.toFixed(2)} USDC and ${sol.toFixed(3)} SOL.`,
  priceReadout: (solUsd: number) =>
    `SOL is currently around ${solUsd.toFixed(2)} US dollars. USDC is pegged to one US dollar.`,
  sendSuccess: (amount: number, symbol: string, recipient: string) =>
    `Sent. You sent ${amount} ${symbol} to ${recipient}.`,
  contactEditRequiresBiometric: () =>
    'Adding or changing a contact requires your hardware biometric. Voice alone cannot modify saved addresses.',
  challengePrompt: (digitsSpoken: string) =>
    `Security check. Please say ${digitsSpoken} to continue, or say cancel.`,
  unverifiedTokenBlocked: (tokenName: string) =>
    `Blocked. ${tokenName} is not on your verified token list. Bicara blocks unverified tokens to protect against scam mints.`,
  helpGuide: () =>
    'Available commands: check balance, check price, open contacts, read contacts, open history, go home, send 5 USDC to Ahmad, swap 10 USDC to SOL, repeat, or cancel.',
  cancelled: () => 'Action cancelled.',
};

export const EN_UI_COPY = {
  tabs: {
    homeTitle: 'Home',
    homeA11y: 'Voice Home Tab',
    contactsTitle: 'Contacts',
    contactsA11y: 'Verified Contacts Tab',
    historyTitle: 'History',
    historyA11y: 'Transaction History Tab',
  },
  home: {
    kicker: 'Gate A · Physical Android USB Build',
    connectWallet: 'Connect MWA',
    disconnectWalletA11y: 'Disconnect Solana wallet',
    connectWalletA11y: 'Connect Solana Mobile wallet',
    walletDisconnectedSpoken: 'Solana wallet disconnected.',
    walletConnectedFallbackSpoken:
      'Solana Mobile wallet connected on Devnet. Every transfer and contact edit still requires your hardware biometric.',
    walletConnectError: 'Failed to connect MWA wallet.',
    stopRecordingA11y: 'Stop voice recording',
    startRecordingA11y: 'Tap anywhere to start speaking',
    micStopLabel: 'STOP',
    micSpeakLabel: 'SPEAK',
    recordingTitle: 'Listening (expo-audio)...',
    idleTitle: 'Tap anywhere here to speak',
    idleSub: 'Eyes-Free Mode · Zero-Silent-Screen · Physical Haptics',
    recordingSavedSpoken:
      'Voice recording saved. Ready for ElevenLabs Scribe v2 transcription.',
    recordingStoppedSpoken: 'Recording stopped.',
    listeningSpoken: 'Listening. Speak now.',
    hapticsCardTitle: 'Physical expo-haptics Check',
    hapticsCardEmpty:
      'Tap any haptic pattern below to verify tactile accessibility feedback on this phone.',
    hapticsLastPrefix: 'Last triggered',
    hapticsBtnA11yPrefix: 'Test haptic',
    proxyCardTitle: 'Voice Proxy Connection (adb reverse)',
    proxyBtnChecking: 'Checking...',
    proxyBtnIdle: 'Check Voice Proxy Connection',
    proxyBtnA11y: 'Check connection to voice proxy server',
    proxyConnectedSpoken: 'Connected to the Bicara voice proxy server.',
    proxyErrorFallback:
      'Failed to reach the voice proxy server. Verify adb reverse tcp:3000 tcp:3000 is active.',
  },
  contacts: {
    kicker: 'Gate B–C Target · Verified Address Book (Supabase + Anchor PDA)',
    title: 'Verified Contacts',
    body: 'This tab is wired to Spoken Navigation and Soft Tick haptics. Verified contacts resolve spoken names to owner-approved Solana addresses — adding or editing any contact always requires hardware biometric approval.',
  },
  history: {
    kicker: 'Gate B Target · Solana Devnet Signatures',
    title: 'Transaction History',
    body: 'Confirmed Devnet USDC transfers authorized via MWA hardware biometrics appear here with Solana Explorer links and can be read aloud anytime by saying "Read history".',
  },
  recorder: {
    permissionDenied:
      'Microphone permission denied. Enable microphone access for Bicara in Android Settings.',
    startFailed: 'Failed to start audio recording.',
    stopFailed: 'Failed to stop audio recording.',
  },
  api: {
    healthFailedPrefix: 'Proxy health failed',
    healthFailedHint: 'Verify adb reverse tcp:3000 tcp:3000 is active.',
  },
} as const;
