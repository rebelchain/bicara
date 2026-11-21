import { NextRequest, NextResponse } from 'next/server';

const ELEVENLABS_STT_URL = 'https://api.elevenlabs.io/v1/speech-to-text';

export async function POST(req: NextRequest) {
  const startedAt = Date.now();
  try {
    const apiKey = process.env.ELEVENLABS_API_KEY?.trim();
    if (!apiKey || apiKey.startsWith('MY_')) {
      return NextResponse.json(
        {
          error:
            'ELEVENLABS_API_KEY is not configured on the server. Add ELEVENLABS_API_KEY to your local .env or AI Studio Secrets.',
          code: 'MISSING_ELEVENLABS_KEY',
        },
        { status: 503 }
      );
    }

    const incoming = await req.formData();
    const audio = incoming.get('audio');
    if (!(audio instanceof Blob) || audio.size === 0) {
      return NextResponse.json(
        { error: 'Field "audio" (.m4a/.wav/.webm file) is required in multipart/form-data.' },
        { status: 400 }
      );
    }

    const languageCode = String(incoming.get('language_code') || 'eng');
    const rawKeyterms = incoming.get('keyterms');

    const upstream = new FormData();
    upstream.append('model_id', 'scribe_v2');
    upstream.append('language_code', languageCode);
    upstream.append('file', audio, 'voice-command.m4a');

    if (typeof rawKeyterms === 'string' && rawKeyterms.trim()) {
      try {
        const parsed = JSON.parse(rawKeyterms);
        if (Array.isArray(parsed)) {
          const seen = new Set<string>();
          const validTerms: string[] = [];
          for (const rawTerm of parsed) {
            if (typeof rawTerm !== 'string') continue;
            const term = rawTerm.trim().replace(/\s+/g, ' ');
            if (!term || term.length > 50) continue;
            if (term.split(' ').length > 5) continue;
            if (seen.has(term)) continue;
            seen.add(term);
            validTerms.push(term);
            if (validTerms.length >= 1000) break;
          }
          for (const term of validTerms) {
            upstream.append('keyterms', term);
          }
        }
      } catch {
        // Ignore malformed keyterms hint and proceed with standard transcription
      }
    }

    let response: Response;
    try {
      response = await fetch(ELEVENLABS_STT_URL, {
        method: 'POST',
        headers: {
          'xi-api-key': apiKey,
        },
        body: upstream,
        signal: AbortSignal.timeout(12000),
      });
    } catch {
      // Single retry on transient cold socket / Wi-Fi hiccup
      const retryUpstream = new FormData();
      retryUpstream.append('model_id', 'scribe_v2');
      retryUpstream.append('language_code', languageCode);
      retryUpstream.append('file', audio, 'voice-command.m4a');
      response = await fetch(ELEVENLABS_STT_URL, {
        method: 'POST',
        headers: {
          'xi-api-key': apiKey,
        },
        body: retryUpstream,
        signal: AbortSignal.timeout(12000),
      });
    }

    if (!response.ok) {
      const detail = await response.text().catch(() => '');
      return NextResponse.json(
        {
          error: `ElevenLabs STT error (${response.status}): ${detail.slice(0, 240) || response.statusText}`,
        },
        { status: response.status }
      );
    }

    const data = (await response.json()) as {
      text?: string;
      language_code?: string;
      language_probability?: number;
    };

    return NextResponse.json({
      transcript: (data.text ?? '').trim(),
      languageCode: data.language_code ?? languageCode,
      confidence: data.language_probability ?? null,
      model: 'scribe_v2',
      latencyMs: Date.now() - startedAt,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to transcribe audio';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
