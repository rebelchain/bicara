import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_VOICEPRINT_PROFILE,
  DEMO_SENDER_WALLET,
  ONBOARDING_STEPS,
  SEED_CONTACTS,
  SEED_TRANSACTIONS,
  buildScribeKeyterms,
  deriveSimulatedPda,
  executeSimulatedTransfer,
  narrateTabScreen,
  normalizeContactSeed,
  parseIntentFallback,
  parseSpokenNumber,
  resolveContact,
  truncateWallet,
  usdcToRawUnits,
  validateIntent,
  validateSolanaAddress,
  verifySpeakerVoiceprint,
} from './bicara-engine';

test('usdcToRawUnits uses exact 6-decimal BigInt scaling', () => {
  assert.equal(usdcToRawUnits(5), BigInt(5_000_000));
  assert.equal(usdcToRawUnits(0.01), BigInt(10_000));
  assert.equal(usdcToRawUnits(12.345678), BigInt(12_345_678));
  assert.equal(usdcToRawUnits(0.1 + 0.2), BigInt(300_000));
  assert.throws(() => usdcToRawUnits(-1));
});

test('parseSpokenNumber handles Indonesian and English spoken numerals', () => {
  assert.equal(parseSpokenNumber('lima'), 5);
  assert.equal(parseSpokenNumber('dua puluh'), 20);
  assert.equal(parseSpokenNumber('lima belas'), 15);
  assert.equal(parseSpokenNumber('sepuluh ribu'), 10000);
  assert.equal(parseSpokenNumber('dua setengah'), 2.5);
  assert.equal(parseSpokenNumber('12.5'), 12.5);
  assert.equal(parseSpokenNumber('5,25'), 5.25);
});

test('parseIntentFallback parses Indonesian, English, and edge-case payment commands', () => {
  const idSend = parseIntentFallback('Kirim 5 dolar ke Ahmad');
  assert.equal(idSend.action, 'send');
  assert.equal(idSend.amount, 5);
  assert.equal(idSend.currency, 'USDC');
  assert.equal(idSend.recipient, 'Ahmad');
  assert.equal(idSend.confidence, 'high');

  const spokenWords = parseIntentFallback('transfer dua puluh USDC ke Budi');
  assert.equal(spokenWords.action, 'send');
  assert.equal(spokenWords.amount, 20);
  assert.equal(spokenWords.currency, 'USDC');
  assert.equal(spokenWords.recipient, 'Budi');
  assert.equal(spokenWords.confidence, 'high');

  const enSend = parseIntentFallback('send 10 to Sarah');
  assert.equal(enSend.action, 'send');
  assert.equal(enSend.amount, 10);
  assert.equal(enSend.currency, 'USDC');
  assert.equal(enSend.recipient, 'Sarah');

  const missingAmount = parseIntentFallback('minta tolong kirim ke Ahmad');
  assert.equal(missingAmount.action, 'send');
  assert.equal(missingAmount.amount, null);
  assert.equal(missingAmount.recipient, 'Ahmad');
  assert.equal(missingAmount.confidence, 'low');

  const nonPayment = parseIntentFallback('cuaca hari ini bagaimana?');
  assert.equal(nonPayment.action, 'unknown');
  assert.equal(nonPayment.amount, null);
  assert.equal(nonPayment.recipient, null);
});

test('parseIntentFallback parses Eyes-Free voice navigation, queries, and confirmation commands', () => {
  assert.equal(parseIntentFallback('Buka kontak').action, 'navigate');
  assert.equal(parseIntentFallback('Buka kontak').targetTab, 'contacts');

  assert.equal(parseIntentFallback('Buka riwayat').action, 'navigate');
  assert.equal(parseIntentFallback('Buka riwayat').targetTab, 'history');

  assert.equal(parseIntentFallback('Kembali ke beranda').action, 'navigate');
  assert.equal(parseIntentFallback('Kembali ke beranda').targetTab, 'home');

  assert.equal(parseIntentFallback('Cek saldo saya').action, 'check_balance');
  assert.equal(parseIntentFallback('Baca kontak').action, 'list_contacts');
  assert.equal(parseIntentFallback('Transaksi terakhir').action, 'read_history');
  assert.equal(parseIntentFallback('Ulangi').action, 'repeat');
  assert.equal(parseIntentFallback('Bantuan').action, 'help');
  assert.equal(parseIntentFallback('Ya').action, 'confirm');
  assert.equal(parseIntentFallback('Batal').action, 'cancel');
});

test('verifySpeakerVoiceprint accepts owner User A, blocks Impostor B, and allows help/repeat', () => {
  const ownerOk = verifySpeakerVoiceprint(DEFAULT_VOICEPRINT_PROFILE, 'owner', 'send');
  assert.equal(ownerOk.verified, true);
  assert.equal(ownerOk.scorePct, 94);

  const impostorBlocked = verifySpeakerVoiceprint(DEFAULT_VOICEPRINT_PROFILE, 'impostor', 'send');
  assert.equal(impostorBlocked.verified, false);
  assert.equal(impostorBlocked.haptic, 'error');
  assert.match(impostorBlocked.spokenMessage ?? '', /tidak cocok/i);

  const helpBypass = verifySpeakerVoiceprint(DEFAULT_VOICEPRINT_PROFILE, 'impostor', 'help');
  assert.equal(helpBypass.verified, true);
  assert.equal(helpBypass.bypassed, true);

  const unenrolled = verifySpeakerVoiceprint(
    { ...DEFAULT_VOICEPRINT_PROFILE, enrolled: false },
    'owner',
    'check_balance'
  );
  assert.equal(unenrolled.verified, false);
});

test('narrateTabScreen produces spoken Indonesian summaries for Home, Contacts, and History', () => {
  const homeCue = narrateTabScreen('home', {
    walletConnected: true,
    senderBalanceUsdc: 25,
    senderBalanceSol: 1.85,
    contacts: SEED_CONTACTS,
    transactions: SEED_TRANSACTIONS,
  });
  assert.match(homeCue, /Halaman Beranda/);
  assert.match(homeCue, /25\.00 USDC/);

  const contactsCue = narrateTabScreen('contacts', {
    walletConnected: true,
    senderBalanceUsdc: 25,
    senderBalanceSol: 1.85,
    contacts: SEED_CONTACTS,
    transactions: SEED_TRANSACTIONS,
  });
  assert.match(contactsCue, /Halaman Kontak/);
  assert.match(contactsCue, /Ahmad/);

  const historyCue = narrateTabScreen('history', {
    walletConnected: true,
    senderBalanceUsdc: 25,
    senderBalanceSol: 1.85,
    contacts: SEED_CONTACTS,
    transactions: SEED_TRANSACTIONS,
  });
  assert.match(historyCue, /Halaman Riwayat/);
  assert.match(historyCue, /Budi/);

  assert.equal(ONBOARDING_STEPS.length, 6);
  assert.equal(ONBOARDING_STEPS[ONBOARDING_STEPS.length - 1].progressPct, 100);
});

test('validateIntent detects missing amount, missing recipient, navigation, and unknown intent', () => {
  const ok = validateIntent(parseIntentFallback('kirim 5 dolar ke Ahmad'));
  assert.equal(ok.valid, true);

  const navOk = validateIntent(parseIntentFallback('buka kontak'));
  assert.equal(navOk.valid, true);

  const noAmount = validateIntent(parseIntentFallback('kirim ke Ahmad'));
  assert.equal(noAmount.valid, false);
  assert.equal(noAmount.missingField, 'amount');

  const noRecipient = validateIntent(parseIntentFallback('kirim 5 dolar'));
  assert.equal(noRecipient.valid, false);
  assert.equal(noRecipient.missingField, 'recipient');

  const unknown = validateIntent(parseIntentFallback('halo apa kabar'));
  assert.equal(unknown.valid, false);
  assert.equal(unknown.missingField, null);
});

test('resolveContact supports case-insensitive exact match, fuzzy match, and not found', () => {
  const exact = resolveContact(SEED_CONTACTS, 'ahmad');
  assert.equal(exact.status, 'found');
  assert.equal(exact.contact?.name, 'Ahmad');
  assert.equal(exact.source, 'on_chain');

  const fuzzy = resolveContact(SEED_CONTACTS, 'Bud');
  assert.equal(fuzzy.status, 'found');
  assert.equal(fuzzy.contact?.name, 'Budi');

  const missing = resolveContact(SEED_CONTACTS, 'Reza');
  assert.equal(missing.status, 'not_found');
  assert.equal(missing.contact, null);
});

test('normalizeContactSeed & deriveSimulatedPda stay deterministic across casing', () => {
  assert.equal(normalizeContactSeed('  Ahmad  '), 'ahmad');
  const pda1 = deriveSimulatedPda(DEMO_SENDER_WALLET, 'Ahmad');
  const pda2 = deriveSimulatedPda(DEMO_SENDER_WALLET, '  ahmad ');
  assert.equal(pda1, pda2);
  assert.equal(validateSolanaAddress(pda1), true);
  assert.equal(truncateWallet(SEED_CONTACTS[0].wallet), '7xKp...3mN3');
  assert.equal(truncateWallet(SEED_CONTACTS[0].wallet, 4, 3), '7xKp...mN3');
});

test('buildScribeKeyterms includes nav commands, domain terms, and contact names without duplicates', () => {
  const terms = buildScribeKeyterms(SEED_CONTACTS);
  assert.equal(terms.includes('USDC'), true);
  assert.equal(terms.includes('buka kontak'), true);
  assert.equal(terms.includes('cek saldo'), true);
  assert.equal(terms.includes('Ahmad'), true);
  assert.equal(new Set(terms).size, terms.length);
});

test('executeSimulatedTransfer enforces confirmation, balance, wallet connection, and ATA guard', () => {
  const ahmad = SEED_CONTACTS[0];
  const rakaNoAta = SEED_CONTACTS[3];

  const unconfirmed = executeSimulatedTransfer({
    walletConnected: true,
    confirmedByUser: false,
    senderWallet: DEMO_SENDER_WALLET,
    senderBalanceUsdc: 25,
    recipient: ahmad,
    amount: 5,
    currency: 'USDC',
    voiceTranscript: 'kirim 5 dolar ke Ahmad',
    resolutionSource: 'on_chain',
  });
  assert.equal(unconfirmed.ok, false);
  assert.equal(unconfirmed.errorCode, 'UNCONFIRMED');

  const lowBalance = executeSimulatedTransfer({
    walletConnected: true,
    confirmedByUser: true,
    senderWallet: DEMO_SENDER_WALLET,
    senderBalanceUsdc: 25,
    recipient: ahmad,
    amount: 100,
    currency: 'USDC',
    voiceTranscript: 'kirim 100 dolar ke Ahmad',
    resolutionSource: 'on_chain',
  });
  assert.equal(lowBalance.ok, false);
  assert.equal(lowBalance.errorCode, 'INSUFFICIENT_BALANCE');

  const missingAtaBlocked = executeSimulatedTransfer({
    walletConnected: true,
    confirmedByUser: true,
    senderWallet: DEMO_SENDER_WALLET,
    senderBalanceUsdc: 25,
    recipient: rakaNoAta,
    amount: 5,
    currency: 'USDC',
    voiceTranscript: 'kirim 5 dolar ke Raka',
    resolutionSource: 'supabase',
    autoCreateAta: false,
  });
  assert.equal(missingAtaBlocked.ok, false);
  assert.equal(missingAtaBlocked.errorCode, 'MISSING_ATA');

  const success = executeSimulatedTransfer({
    walletConnected: true,
    confirmedByUser: true,
    senderWallet: DEMO_SENDER_WALLET,
    senderBalanceUsdc: 25,
    recipient: ahmad,
    amount: 5,
    currency: 'USDC',
    voiceTranscript: 'kirim 5 dolar ke Ahmad',
    resolutionSource: 'on_chain',
    timestampIso: '2026-11-19T10:00:00Z',
  });
  assert.equal(success.ok, true);
  assert.equal(success.nextSenderBalance, 20);
  assert.equal(success.tx?.rawUnits, '5000000');
  assert.equal(success.instruction?.decimals, 6);
  assert.match(success.spokenMessage, /Berhasil\. Kamu mengirim 5 USDC ke Ahmad\./);
});
