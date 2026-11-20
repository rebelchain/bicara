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
  formatTxSummarySpeech,
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

test('parseSpokenNumber handles English and Indonesian spoken numerals', () => {
  assert.equal(parseSpokenNumber('five'), 5);
  assert.equal(parseSpokenNumber('twenty'), 20);
  assert.equal(parseSpokenNumber('lima'), 5);
  assert.equal(parseSpokenNumber('dua puluh'), 20);
  assert.equal(parseSpokenNumber('dua setengah'), 2.5);
  assert.equal(parseSpokenNumber('12.5'), 12.5);
  assert.equal(parseSpokenNumber('5,25'), 5.25);
});

test('parseIntentFallback parses English send, swap_quote, check_price, and edge cases', () => {
  const enSend = parseIntentFallback('Send 5 USDC to Ahmad');
  assert.equal(enSend.action, 'send');
  assert.equal(enSend.amount, 5);
  assert.equal(enSend.currency, 'USDC');
  assert.equal(enSend.recipient, 'Ahmad');
  assert.equal(enSend.confidence, 'high');

  const swapQuote = parseIntentFallback('Swap 10 USDC to SOL');
  assert.equal(swapQuote.action, 'swap_quote');
  assert.equal(swapQuote.amount, 10);
  assert.equal(swapQuote.currency, 'USDC');
  assert.equal(swapQuote.outputCurrency, 'SOL');
  assert.equal(swapQuote.swapDirection, 'sell');
  assert.equal(swapQuote.confidence, 'high');

  const unknownTokenSwap = parseIntentFallback('Swap 10 USDC to unknown token XYZ');
  assert.equal(unknownTokenSwap.action, 'swap_quote');
  assert.equal(unknownTokenSwap.currency, 'USDC');
  assert.equal(unknownTokenSwap.outputCurrency, 'XYZ');

  const checkPrice = parseIntentFallback('Check price');
  assert.equal(checkPrice.action, 'check_price');
  assert.equal(checkPrice.currency, 'SOL');

  const missingAmount = parseIntentFallback('Please send to Ahmad');
  assert.equal(missingAmount.action, 'send');
  assert.equal(missingAmount.amount, null);
  assert.equal(missingAmount.recipient, 'Ahmad');
  assert.equal(missingAmount.confidence, 'low');

  const nonPayment = parseIntentFallback('How is the weather today?');
  assert.equal(nonPayment.action, 'unknown');
  assert.equal(nonPayment.amount, null);
  assert.equal(nonPayment.recipient, null);
});

test('parseIntentFallback parses Eyes-Free voice navigation, queries, and confirmation commands', () => {
  assert.equal(parseIntentFallback('Open contacts').action, 'navigate');
  assert.equal(parseIntentFallback('Open contacts').targetTab, 'contacts');

  assert.equal(parseIntentFallback('Open history').action, 'navigate');
  assert.equal(parseIntentFallback('Open history').targetTab, 'history');

  assert.equal(parseIntentFallback('Go home').action, 'navigate');
  assert.equal(parseIntentFallback('Go home').targetTab, 'home');

  assert.equal(parseIntentFallback('Check balance').action, 'check_balance');
  assert.equal(parseIntentFallback('Read contacts').action, 'list_contacts');
  assert.equal(parseIntentFallback('Read history').action, 'read_history');
  assert.equal(parseIntentFallback('Repeat').action, 'repeat');
  assert.equal(parseIntentFallback('Help').action, 'help');
  assert.equal(parseIntentFallback('Yes').action, 'confirm');
  assert.equal(parseIntentFallback('Cancel').action, 'cancel');
});

test('verifySpeakerVoiceprint never hardcodes 94% and evaluates measured hardware scores honestly', () => {
  const uncalibratedOwner = verifySpeakerVoiceprint(DEFAULT_VOICEPRINT_PROFILE, 'owner', 'send');
  assert.equal(uncalibratedOwner.verified, true);
  assert.equal(uncalibratedOwner.measured, false);
  assert.equal(uncalibratedOwner.score, null);
  assert.equal(uncalibratedOwner.scorePct, null);

  const measuredPass = verifySpeakerVoiceprint(DEFAULT_VOICEPRINT_PROFILE, 'owner', 'send', 0.82);
  assert.equal(measuredPass.verified, true);
  assert.equal(measuredPass.measured, true);
  assert.equal(measuredPass.scorePct, 82);

  const measuredFail = verifySpeakerVoiceprint(DEFAULT_VOICEPRINT_PROFILE, 'impostor', 'send', 0.31);
  assert.equal(measuredFail.verified, false);
  assert.equal(measuredFail.haptic, 'error');
  assert.match(measuredFail.spokenMessage ?? '', /31 percent/i);

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

test('formatTxSummarySpeech formats send and quote-only swap summaries cleanly', () => {
  const sendSpeech = formatTxSummarySpeech({
    action: 'send',
    inputAmount: 5,
    inputSymbol: 'USDC',
    recipientLabel: 'Ahmad',
    recipientStatus: 'saved contact',
    recipientLast4: '3mN3',
    formattedFee: 'under one cent',
    createsNewAta: false,
    includeFirstUseUsdcNote: true,
  });
  assert.match(sendSpeech, /USDC is a US-dollar stablecoin/);
  assert.match(sendSpeech, /send 5 USDC to Ahmad, saved contact, wallet ending 3mN3/);
  assert.match(sendSpeech, /Say yes to continue or cancel to stop/);

  const swapSpeech = formatTxSummarySpeech({
    action: 'swap_quote',
    inputAmount: 10,
    inputSymbol: 'USDC',
    outputAmount: 0.05,
    outputSymbol: 'SOL',
    priceImpactLevel: 'low',
    maxSlippagePct: 0.5,
    formattedFee: 'under 3 cents',
    quoteOnlySafeMode: true,
  });
  assert.match(swapSpeech, /sell 10 USDC for about 0\.05 SOL/);
  assert.match(swapSpeech, /Quote-only Devnet safe mode is active/);
});

test('narrateTabScreen produces spoken English summaries for Home, Contacts, and History', () => {
  const homeCue = narrateTabScreen('home', {
    walletConnected: true,
    senderBalanceUsdc: 25,
    senderBalanceSol: 1.85,
    contacts: SEED_CONTACTS,
    transactions: SEED_TRANSACTIONS,
  });
  assert.match(homeCue, /Home screen/);
  assert.match(homeCue, /25\.00 USDC/);

  const contactsCue = narrateTabScreen('contacts', {
    walletConnected: true,
    senderBalanceUsdc: 25,
    senderBalanceSol: 1.85,
    contacts: SEED_CONTACTS,
    transactions: SEED_TRANSACTIONS,
  });
  assert.match(contactsCue, /Contacts screen/);
  assert.match(contactsCue, /Ahmad/);

  const historyCue = narrateTabScreen('history', {
    walletConnected: true,
    senderBalanceUsdc: 25,
    senderBalanceSol: 1.85,
    contacts: SEED_CONTACTS,
    transactions: SEED_TRANSACTIONS,
  });
  assert.match(historyCue, /History screen/);
  assert.match(historyCue, /Budi/);

  assert.equal(ONBOARDING_STEPS.length, 6);
  assert.equal(ONBOARDING_STEPS[ONBOARDING_STEPS.length - 1].progressPct, 100);
});

test('validateIntent detects missing amount, missing recipient, swap_quote, and unknown intent', () => {
  const ok = validateIntent(parseIntentFallback('send 5 USDC to Ahmad'));
  assert.equal(ok.valid, true);

  const swapOk = validateIntent(parseIntentFallback('swap 10 USDC to SOL'));
  assert.equal(swapOk.valid, true);

  const navOk = validateIntent(parseIntentFallback('open contacts'));
  assert.equal(navOk.valid, true);

  const noAmount = validateIntent(parseIntentFallback('send to Ahmad'));
  assert.equal(noAmount.valid, false);
  assert.equal(noAmount.missingField, 'amount');

  const noRecipient = validateIntent(parseIntentFallback('send 5 USDC'));
  assert.equal(noRecipient.valid, false);
  assert.equal(noRecipient.missingField, 'recipient');

  const unknown = validateIntent(parseIntentFallback('hello how are you'));
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

test('buildScribeKeyterms enforces English commands, <= 50 chars, <= 5 words, and deduplication', () => {
  const noisyContacts = [
    ...SEED_CONTACTS,
    {
      ...SEED_CONTACTS[0],
      id: 'cnt-too-long',
      name: 'This Contact Name Exceeds Fifty Characters And Must Be Filtered Out Completely',
    },
    {
      ...SEED_CONTACTS[0],
      id: 'cnt-too-many-words',
      name: 'One Two Three Four Five Six',
    },
  ];
  const terms = buildScribeKeyterms(noisyContacts);
  assert.equal(terms.includes('USDC'), true);
  assert.equal(terms.includes('open contacts'), true);
  assert.equal(terms.includes('check price'), true);
  assert.equal(terms.includes('swap'), true);
  assert.equal(terms.includes('Ahmad'), true);
  assert.equal(terms.every((t) => t.length <= 50 && t.split(' ').length <= 5), true);
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
    voiceTranscript: 'send 5 USDC to Ahmad',
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
    voiceTranscript: 'send 100 USDC to Ahmad',
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
    voiceTranscript: 'send 5 USDC to Raka',
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
    voiceTranscript: 'send 5 USDC to Ahmad',
    resolutionSource: 'on_chain',
    timestampIso: '2026-11-19T10:00:00Z',
  });
  assert.equal(success.ok, true);
  assert.equal(success.nextSenderBalance, 20);
  assert.equal(success.tx?.rawUnits, '5000000');
  assert.equal(success.instruction?.decimals, 6);
  assert.match(success.spokenMessage, /Sent\. You sent 5 USDC to Ahmad\./);
});
