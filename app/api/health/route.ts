import { NextResponse } from 'next/server';

function isConfigured(val: string | undefined): boolean {
  if (!val) return false;
  const trimmed = val.trim();
  return trimmed.length > 0 && !trimmed.startsWith('MY_');
}

export async function GET() {
  const geminiConfigured = isConfigured(process.env.GEMINI_API_KEY);
  const elevenLabsConfigured = isConfigured(process.env.ELEVENLABS_API_KEY);
  const voiceIdConfigured = isConfigured(process.env.ELEVENLABS_VOICE_ID);
  const jupiterConfigured = isConfigured(process.env.JUPITER_API_KEY);

  return NextResponse.json({
    ok: true,
    service: 'bicara-voice-proxy',
    timestamp: new Date().toISOString(),
    env: {
      geminiConfigured,
      elevenLabsConfigured,
      voiceIdConfigured,
      jupiterConfigured,
    },
    models: {
      stt: 'scribe_v2',
      nlu: 'gemini-3.1-flash-lite (failover: gemini-4-hydrogen)',
      tts: 'eleven_flash_v2_5',
    },
    endpoints: [
      '/api/health',
      '/api/stt',
      '/api/intent',
      '/api/tts',
      '/api/swap/quote',
      '/api/prices',
    ],
    usbSetup: {
      adbReverseCmd: 'adb reverse tcp:3000 tcp:3000',
      mobileBaseUrl: 'http://localhost:3000',
    },
  });
}
