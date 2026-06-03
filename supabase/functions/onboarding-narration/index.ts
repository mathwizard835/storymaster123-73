import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// Fixed demo content — must match the client text/voice exactly
const MYSTERY_VOICE_ID = '1UllZlmEKI6fNlrEtCx7';
const MYSTERY_NARRATION_TEXT =
  'The clock struck midnight as the detective slipped through the shadowed hall, every footstep a whispered clue.';

// Module-level cache — populated once per cold start, so ElevenLabs is hit
// at most once per isolate regardless of how many users tap the demo button.
let cachedBase64: string | null = null;
let inflight: Promise<string> | null = null;

async function generateAudio(): Promise<string> {
  const apiKey = Deno.env.get('ELEVENLABS_API_KEY');
  if (!apiKey) throw new Error('ElevenLabs API key not configured');

  const response = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${MYSTERY_VOICE_ID}`,
    {
      method: 'POST',
      headers: {
        Accept: 'audio/mpeg',
        'Content-Type': 'application/json',
        'xi-api-key': apiKey,
      },
      body: JSON.stringify({
        text: MYSTERY_NARRATION_TEXT,
        model_id: 'eleven_turbo_v2',
        voice_settings: { stability: 0.5, similarity_boost: 0.75 },
      }),
    }
  );

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`ElevenLabs ${response.status}: ${errText}`);
  }

  const bytes = new Uint8Array(await response.arrayBuffer());
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode.apply(
      null,
      Array.from(bytes.subarray(i, Math.min(i + chunkSize, bytes.length)))
    );
  }
  return btoa(binary);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    if (!cachedBase64) {
      if (!inflight) inflight = generateAudio();
      cachedBase64 = await inflight;
      inflight = null;
    }

    return new Response(JSON.stringify({ audioContent: cachedBase64 }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=86400',
      },
    });
  } catch (err) {
    inflight = null;
    console.error('onboarding-narration error:', err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'Unknown error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
