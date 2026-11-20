import { NextRequest, NextResponse } from 'next/server';

const JUPITER_SWAP_V2_ORDER_URL = 'https://api.jup.ag/swap/v2/order';

interface VerifiedToken {
  symbol: 'USDC' | 'SOL';
  mint: string;
  decimals: number;
}

const VERIFIED_TOKENS: Record<'USDC' | 'SOL', VerifiedToken> = {
  USDC: {
    symbol: 'USDC',
    mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
    decimals: 6,
  },
  SOL: {
    symbol: 'SOL',
    mint: 'So11111111111111111111111111111111111111112',
    decimals: 9,
  },
};

const MINT_TO_TOKEN = new Map<string, VerifiedToken>([
  [VERIFIED_TOKENS.USDC.mint, VERIFIED_TOKENS.USDC],
  [VERIFIED_TOKENS.SOL.mint, VERIFIED_TOKENS.SOL],
]);

function resolveVerifiedToken(tokenOrMint: string): VerifiedToken | null {
  const trimmed = tokenOrMint.trim();
  if (!trimmed) return null;
  const byMint = MINT_TO_TOKEN.get(trimmed);
  if (byMint) return byMint;
  const upper = trimmed.toUpperCase();
  if (upper === 'USDC') return VERIFIED_TOKENS.USDC;
  if (upper === 'SOL' || upper === 'SOLANA') return VERIFIED_TOKENS.SOL;
  return null;
}

function toRawAmount(amountUi: number, decimals: number): string {
  const factor = 10 ** decimals;
  return BigInt(Math.round(amountUi * factor)).toString();
}

function fromRawAmount(raw: string | undefined, decimals: number): number | null {
  if (!raw || !/^\d+$/.test(raw)) return null;
  const value = Number(raw) / 10 ** decimals;
  return Number.isFinite(value) ? Number(value.toFixed(decimals === 9 ? 6 : 4)) : null;
}

interface QuoteRequestParams {
  inputToken: string;
  outputToken: string;
  amount: number;
  amountIsRaw: boolean;
  slippageBps?: number;
}

async function handleQuote(params: QuoteRequestParams) {
  const startedAt = Date.now();

  const inputToken = resolveVerifiedToken(params.inputToken);
  if (!inputToken) {
    return NextResponse.json(
      {
        error: `Blocked: "${params.inputToken}" is not on Bicara's verified token allowlist (USDC, SOL).`,
        code: 'UNVERIFIED_TOKEN_BLOCKED',
        blockedToken: params.inputToken,
        spokenWarning: `Blocked. ${params.inputToken} is not on your verified token list. Bicara blocks unverified tokens to protect against scam mints.`,
      },
      { status: 403 }
    );
  }

  const outputToken = resolveVerifiedToken(params.outputToken);
  if (!outputToken) {
    return NextResponse.json(
      {
        error: `Blocked: "${params.outputToken}" is not on Bicara's verified token allowlist (USDC, SOL).`,
        code: 'UNVERIFIED_TOKEN_BLOCKED',
        blockedToken: params.outputToken,
        spokenWarning: `Blocked. ${params.outputToken} is not on your verified token list. Bicara blocks unverified tokens to protect against scam mints.`,
      },
      { status: 403 }
    );
  }

  if (inputToken.mint === outputToken.mint) {
    return NextResponse.json(
      {
        error: 'Input and output tokens must be different (USDC <-> SOL).',
        code: 'SAME_TOKEN_PAIR',
      },
      { status: 400 }
    );
  }

  if (!Number.isFinite(params.amount) || params.amount <= 0) {
    return NextResponse.json(
      { error: 'A positive numeric amount is required.', code: 'INVALID_AMOUNT' },
      { status: 400 }
    );
  }

  const apiKey = process.env.JUPITER_API_KEY?.trim();
  if (!apiKey || apiKey.startsWith('MY_')) {
    return NextResponse.json(
      {
        error:
          'JUPITER_API_KEY is not configured on the server. Add JUPITER_API_KEY to your local .env or AI Studio Secrets.',
        code: 'MISSING_JUPITER_KEY',
      },
      { status: 503 }
    );
  }

  const rawAmount = params.amountIsRaw
    ? BigInt(Math.round(params.amount)).toString()
    : toRawAmount(params.amount, inputToken.decimals);

  // Quote-Only mode: call Jupiter Swap API V2 /swap/v2/order WITHOUT `taker`.
  // Omitting `taker` returns a live executable quote with `transaction: null` (zero mainnet funds at risk).
  const query = new URLSearchParams({
    inputMint: inputToken.mint,
    outputMint: outputToken.mint,
    amount: rawAmount,
  });

  if (
    typeof params.slippageBps === 'number' &&
    Number.isFinite(params.slippageBps) &&
    params.slippageBps > 0 &&
    params.slippageBps <= 500
  ) {
    query.set('slippageBps', String(Math.round(params.slippageBps)));
  }

  const response = await fetch(`${JUPITER_SWAP_V2_ORDER_URL}?${query.toString()}`, {
    method: 'GET',
    headers: {
      'x-api-key': apiKey,
      Accept: 'application/json',
    },
    cache: 'no-store',
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    return NextResponse.json(
      {
        error: `Jupiter Swap API V2 error (${response.status}): ${detail.slice(0, 240) || response.statusText}`,
        code: 'JUPITER_UPSTREAM_ERROR',
      },
      { status: response.status }
    );
  }

  const data = (await response.json()) as {
    inputMint?: string;
    outputMint?: string;
    inAmount?: string;
    outAmount?: string;
    otherAmountThreshold?: string;
    slippageBps?: number;
    priceImpactPct?: string | number;
    priceImpact?: number;
    feeBps?: number;
    router?: string;
    swapMode?: string;
    transaction?: string | null;
  };

  const inAmountRaw = data.inAmount ?? rawAmount;
  const outAmountRaw = data.outAmount ?? null;
  const parsedImpact =
    typeof data.priceImpactPct === 'string'
      ? parseFloat(data.priceImpactPct)
      : typeof data.priceImpactPct === 'number'
        ? data.priceImpactPct
        : typeof data.priceImpact === 'number'
          ? data.priceImpact
          : 0;

  return NextResponse.json({
    quoteOnly: true,
    transaction: null,
    inputSymbol: inputToken.symbol,
    outputSymbol: outputToken.symbol,
    inputMint: inputToken.mint,
    outputMint: outputToken.mint,
    inAmount: inAmountRaw,
    outAmount: outAmountRaw,
    inAmountUi: fromRawAmount(inAmountRaw, inputToken.decimals),
    outAmountUi: fromRawAmount(outAmountRaw ?? undefined, outputToken.decimals),
    slippageBps: data.slippageBps ?? params.slippageBps ?? 50,
    priceImpactPct: Number.isFinite(parsedImpact) ? parsedImpact : 0,
    feeBps: data.feeBps ?? 0,
    router: data.router ?? 'jupiter-swap-v2',
    latencyMs: Date.now() - startedAt,
  });
}

export async function GET(req: NextRequest) {
  try {
    const sp = req.nextUrl.searchParams;
    const inputToken = sp.get('inputMint') ?? sp.get('inputToken') ?? 'USDC';
    const outputToken = sp.get('outputMint') ?? sp.get('outputToken') ?? 'SOL';
    const rawParam = sp.get('rawAmount');
    const uiParam = sp.get('amount') ?? '10';
    const amountIsRaw = rawParam !== null;
    const amount = Number(rawParam ?? uiParam);
    const slippageBpsParam = sp.get('slippageBps');
    const slippageBps = slippageBpsParam ? Number(slippageBpsParam) : undefined;

    return await handleQuote({
      inputToken,
      outputToken,
      amount,
      amountIsRaw,
      slippageBps,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch Jupiter swap quote';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      inputMint?: string;
      outputMint?: string;
      inputToken?: string;
      outputToken?: string;
      amount?: number;
      rawAmount?: number | string;
      slippageBps?: number;
    };

    const inputToken = body.inputMint ?? body.inputToken ?? 'USDC';
    const outputToken = body.outputMint ?? body.outputToken ?? 'SOL';
    const amountIsRaw = body.rawAmount !== undefined;
    const amount = Number(body.rawAmount ?? body.amount ?? 0);

    return await handleQuote({
      inputToken,
      outputToken,
      amount,
      amountIsRaw,
      slippageBps: body.slippageBps,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch Jupiter swap quote';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
