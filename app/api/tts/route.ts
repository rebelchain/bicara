import { NextRequest, NextResponse } from 'next/server';

const DEFAULT_VOICE_ID = '21m00Tcm4TlvDq8ikWAM';

export async function POST(req: NextRequest) {
  const startedAt = Date.now();
  try {
    const apiKey = process.env.ELEVENLABS_API_KEY?.trim();
    if (!apiKey || apiKey.startsWith('MY_')) {
      return NextResponse.json(
        {
          error:
            'ELEVENLABS_API_KEY belum dikonfigurasi di server. Tambahkan ELEVENLABS_API_KEY di .env lokal atau gunakan fallback expo-speech pada perangkat.',
          code: 'MISSING_ELEVENLABS_KEY',
        },
        { status: 503 }
      );
    }

    const body = (await req.json()) as {
      text?: string;
      voiceId?: string;
    };

    const text = (body.text ?? '').trim();
    if (!text) {
      return NextResponse.json({ error: 'Field "text" wajib diisi.' }, { status: 400 });
    }
    if (text.length > 600) {
      return NextResponse.json(
        { error: 'Teks TTS melebihi batas 600 karakter per narasi.' },
        { status: 400 }
      );
    }

    const configuredVoice = process.env.ELEVENLABS_VOICE_ID?.trim();
    const voiceId =
      body.voiceId?.trim() ||
      (configuredVoice && !configuredVoice.startsWith('MY_') ? configuredVoice : DEFAULT_VOICE_ID);

    const url = `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(
      voiceId
    )}?output_format=mp3_44100_128`;

    const response = await fetch(url, {
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
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to synthesize TTS audio';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
