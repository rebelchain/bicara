import { NextRequest, NextResponse } from 'next/server';

// Verified ElevenLabs premade free-tier voice: Sarah (legacy Rachel 21m00Tcm4TlvDq8ikWAM now returns 402 on Free tier)
const DEFAULT_VOICE_ID = 'EXAVITQu4vr4xnSDxMaL';

async function callElevenLabsTts(apiKey: string, voiceId: string, text: string) {
  const url = `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(
    voiceId
  )}?output_format=mp3_44100_128`;

  return fetch(url, {
    method: 'POST',
    headers: {
      'xi-api-key': apiKey,
      'Content-Type': 'application/json',
      Accept: 'audio/mpeg',
    },
    body: JSON.stringify({
      text,
      model_id: 'eleven_flash_v2_5',
      voice_settings: {
        stability: 0.55,
        similarity_boost: 0.78,
      },
    }),
  });
}

async function synthesizeElevenLabs(textInput: string, voiceIdInput?: string) {
  const startedAt = Date.now();
  const apiKey = process.env.ELEVENLABS_API_KEY?.trim();
  if (!apiKey || apiKey.startsWith('MY_')) {
    return NextResponse.json(
      {
        error:
          'ELEVENLABS_API_KEY is not configured on the server. Add ELEVENLABS_API_KEY to local .env or use on-device expo-speech fallback.',
        code: 'MISSING_ELEVENLABS_KEY',
      },
      { status: 503 }
    );
  }

  const text = textInput.trim();
  if (!text) {
    return NextResponse.json({ error: 'Field "text" is required.' }, { status: 400 });
  }
  if (text.length > 600) {
    return NextResponse.json(
      { error: 'TTS text exceeds the 600-character limit per narration.' },
      { status: 400 }
    );
  }

  const configuredVoice = process.env.ELEVENLABS_VOICE_ID?.trim();
  let voiceId =
    voiceIdInput?.trim() ||
    (configuredVoice && !configuredVoice.startsWith('MY_') ? configuredVoice : DEFAULT_VOICE_ID);

  let response = await callElevenLabsTts(apiKey, voiceId, text);

  // If a legacy/library voice ID (e.g. old Rachel 21m00Tcm4TlvDq8ikWAM) returns 402 on Free tier,
  // seamlessly retry with the verified premade default voice so spoken verification never fails.
  if (response.status === 402 && voiceId !== DEFAULT_VOICE_ID) {
    voiceId = DEFAULT_VOICE_ID;
    response = await callElevenLabsTts(apiKey, voiceId, text);
  }

  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    return NextResponse.json(
      {
        error: `ElevenLabs TTS error (${response.status}): ${detail.slice(0, 240) || response.statusText}`,
      },
      { status: response.status }
    );
  }

  const audioBuffer = await response.arrayBuffer();

  return new NextResponse(audioBuffer, {
    status: 200,
    headers: {
      'Content-Type': 'audio/mpeg',
      'Cache-Control': 'no-store',
      'X-Bicara-TTS-Model': 'eleven_flash_v2_5',
      'X-Bicara-Latency-Ms': String(Date.now() - startedAt),
    },
  });
}

export async function GET(req: NextRequest) {
  try {
    const sp = req.nextUrl.searchParams;
    const text = sp.get('text') ?? '';
    const voiceId = sp.get('voiceId') ?? undefined;
    return await synthesizeElevenLabs(text, voiceId);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to synthesize TTS audio';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      text?: string;
      voiceId?: string;
    };
    return await synthesizeElevenLabs(body.text ?? '', body.voiceId);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to synthesize TTS audio';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
