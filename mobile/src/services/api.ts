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
): Promise<{ transcript: string; latencyMs: number }> {
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
    error?: string;
  };
  if (!res.ok) {
    throw new Error(data.error ?? `STT proxy error (${res.status})`);
  }
  return {
    transcript: data.transcript ?? '',
    latencyMs: data.latencyMs ?? 0,
  };
}

export async function parseVoiceIntent(
  transcript: string,
  contactNames: string[],
  mode: 'ai' | 'fallback' = 'ai'
) {
  const res = await fetch(`${API_BASE_URL}/api/intent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ transcript, contactNames, mode }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error ?? `Intent proxy error (${res.status})`);
  }
  return data;
}
