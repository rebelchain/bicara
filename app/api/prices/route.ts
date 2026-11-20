import { NextResponse } from 'next/server';

const SOL_MINT = 'So11111111111111111111111111111111111111112';
const JUPITER_PRICE_V3_URL = `https://api.jup.ag/price/v3?ids=${SOL_MINT}`;
const COINGECKO_SOL_URL =
  'https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd';

async function fetchFromJupiterV3(): Promise<number | null> {
  const headers: Record<string, string> = {
    Accept: 'application/json',
  };
  const apiKey = process.env.JUPITER_API_KEY?.trim();
  if (apiKey && !apiKey.startsWith('MY_')) {
    headers['x-api-key'] = apiKey;
  }

  const res = await fetch(JUPITER_PRICE_V3_URL, {
    method: 'GET',
    headers,
    cache: 'no-store',
    signal: AbortSignal.timeout(5000),
  });

  if (!res.ok) return null;

  const data = (await res.json()) as Record<
    string,
    { usdPrice?: number | string } | undefined
  >;
  const rawPrice = data[SOL_MINT]?.usdPrice;
  const price = typeof rawPrice === 'string' ? parseFloat(rawPrice) : rawPrice;
  return typeof price === 'number' && Number.isFinite(price) && price > 0
    ? Number(price.toFixed(2))
    : null;
}

async function fetchFromCoinGecko(): Promise<number | null> {
  const res = await fetch(COINGECKO_SOL_URL, {
    method: 'GET',
    headers: { Accept: 'application/json' },
    cache: 'no-store',
    signal: AbortSignal.timeout(5000),
  });

  if (!res.ok) return null;

  const data = (await res.json()) as { solana?: { usd?: number } };
  const price = data.solana?.usd;
  return typeof price === 'number' && Number.isFinite(price) && price > 0
    ? Number(price.toFixed(2))
    : null;
}

export async function GET() {
  const startedAt = Date.now();
  try {
    let solUsd: number | null = null;
    let source: 'jupiter-price-v3' | 'coingecko-fallback' = 'jupiter-price-v3';

    try {
      solUsd = await fetchFromJupiterV3();
    } catch {
      solUsd = null;
    }

    if (solUsd === null) {
      source = 'coingecko-fallback';
      try {
        solUsd = await fetchFromCoinGecko();
      } catch {
        solUsd = null;
      }
    }

    if (solUsd === null) {
      return NextResponse.json(
        {
          error: 'Unable to fetch SOL/USD price from Jupiter Price V3 or CoinGecko.',
          code: 'PRICE_UPSTREAM_UNAVAILABLE',
        },
        { status: 502 }
      );
    }

    return NextResponse.json({
      solUsd,
      usdcUsd: 1.0,
      source,
      fetchedAt: new Date().toISOString(),
      latencyMs: Date.now() - startedAt,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch token prices';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
