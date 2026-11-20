import { EN_UI_COPY } from '../i18n/en';

export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://localhost:3000';

export interface ProxyHealthResponse {
  ok: boolean;
  service: string;
  timestamp: string;
  env: {
    geminiConfigured: boolean;
    elevenLabsConfigured: boolean;
    voiceIdConfigured: boolean;
    jupiterConfigured?: boolean;
  };
  models: {
    stt: string;
    nlu: string;
    tts: string;
  };
  endpoints: string[];
}

export type VoiceAction =
  | 'send'
  | 'swap_quote'
  | 'check_price'
  | 'navigate'
  | 'check_balance'
  | 'list_contacts'
  | 'read_history'
  | 'confirm'
  | 'cancel'
  | 'repeat'
  | 'help'
  | 'unknown';

export interface ParsedVoiceIntent {
  action: VoiceAction;
  targetTab?: 'home' | 'contacts' | 'history' | null;
  amount: number | null;
  currency: string | null;
  swapDirection?: 'buy' | 'sell' | null;
  outputCurrency?: string | null;
  recipient: string | null;
  confidence: 'high' | 'low';
  raw_amount_text: string | null;
}

export interface IntentProxyResponse {
  intent: ParsedVoiceIntent;
  engine: string;
  latencyMs: number;
}

export interface PricesProxyResponse {
  solUsd: number;
  usdcUsd: number;
  source: string;
  fetchedAt: string;
  latencyMs: number;
}

export interface SwapQuoteResponse {
  quoteOnly: true;
  transaction: null;
  inputSymbol: 'USDC' | 'SOL';
  outputSymbol: 'USDC' | 'SOL';
  inputMint: string;
  outputMint: string;
  inAmount: string;
  outAmount: string | null;
  inAmountUi: number | null;
  outAmountUi: number | null;
  slippageBps: number;
  priceImpactPct: number;
  feeBps: number;
  router: string;
  latencyMs: number;
}

export interface SwapQuoteBlockedError {
  blocked: true;
  blockedToken: string;
  spokenWarning: string;
  error: string;
}

export function buildMobileKeyterms(savedContactNames: string[]): string[] {
  const staticTerms = [
    'USDC',
    'SOL',
    'Solana',
    'Bicara',
    'dollars',
    'send',
    'transfer',
    'swap',
    'buy',
    'sell',
    'quote',
    'confirm',
    'yes',
    'cancel',
    'stop',
    'open contacts',
    'open history',
    'go home',
    'check balance',
    'check price',
    'read portfolio',
    'read contacts',
    'read history',
    'repeat',
    'help',
  ];

  const sanitizedContacts = savedContactNames
    .map((name) => name.trim().replace(/\s+/g, ' '))
    .filter((name) => name.length > 0 && name.length <= 50 && name.split(' ').length <= 5);

  return Array.from(new Set([...staticTerms, ...sanitizedContacts])).slice(0, 1000);
}

export async function checkVoiceProxyHealth(): Promise<ProxyHealthResponse> {
  const res = await fetch(`${API_BASE_URL}/api/health`);
  if (!res.ok) {
    throw new Error(
      `${EN_UI_COPY.api.healthFailedPrefix} (${res.status}). ${EN_UI_COPY.api.healthFailedHint}`
    );
  }
  return (await res.json()) as ProxyHealthResponse;
}

export async function transcribeVoiceRecording(
  fileUri: string,
  keyterms: string[]
): Promise<{ transcript: string; latencyMs: number; model: string }> {
  const form = new FormData();
  form.append('language_code', 'eng');
  form.append('keyterms', JSON.stringify(keyterms));
  form.append('audio', {
    uri: fileUri,
    name: 'bicara-utterance.m4a',
    type: 'audio/m4a',
  } as unknown as Blob);

  const res = await fetch(`${API_BASE_URL}/api/stt`, {
    method: 'POST',
    body: form,
  });
  const data = (await res.json()) as {
    transcript?: string;
    latencyMs?: number;
    model?: string;
    error?: string;
  };
  if (!res.ok) {
    throw new Error(data.error ?? `STT proxy error (${res.status})`);
  }
  return {
    transcript: data.transcript ?? '',
    latencyMs: data.latencyMs ?? 0,
    model: data.model ?? 'scribe_v2',
  };
}

export async function parseVoiceIntent(
  transcript: string,
  contactNames: string[],
  mode: 'ai' | 'fallback' = 'ai'
): Promise<IntentProxyResponse> {
  const res = await fetch(`${API_BASE_URL}/api/intent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ transcript, contactNames, mode }),
  });
  const data = (await res.json()) as IntentProxyResponse & { error?: string };
  if (!res.ok) {
    throw new Error(data.error ?? `Intent proxy error (${res.status})`);
  }
  return data;
}

export async function fetchTokenPrices(): Promise<PricesProxyResponse> {
  const res = await fetch(`${API_BASE_URL}/api/prices`);
  const data = (await res.json()) as PricesProxyResponse & { error?: string };
  if (!res.ok) {
    throw new Error(data.error ?? `Prices proxy error (${res.status})`);
  }
  return data;
}

export async function fetchSwapQuote(
  inputToken: string,
  outputToken: string,
  amount: number
): Promise<SwapQuoteResponse | SwapQuoteBlockedError> {
  const query = new URLSearchParams({
    inputToken,
    outputToken,
    amount: String(amount),
  });
  const res = await fetch(`${API_BASE_URL}/api/swap/quote?${query.toString()}`);
  const data = (await res.json()) as Partial<SwapQuoteResponse> & {
    code?: string;
    blockedToken?: string;
    spokenWarning?: string;
    error?: string;
  };
  if (res.status === 403 && data.code === 'UNVERIFIED_TOKEN_BLOCKED') {
    return {
      blocked: true,
      blockedToken: data.blockedToken ?? outputToken,
      spokenWarning:
        data.spokenWarning ??
        `Blocked. ${outputToken} is not on your verified token list. Bicara blocks unverified tokens to protect against scam mints.`,
      error: data.error ?? 'Unverified token blocked.',
    };
  }
  if (!res.ok) {
    throw new Error(data.error ?? `Swap quote error (${res.status})`);
  }
  return data as SwapQuoteResponse;
}
