import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// Rate limiting for text-to-speech
const rateLimit = (() => {
  const ipRequestLog = new Map<string, number[]>();
  const MAX_REQUESTS_IP = 20; // 20 requests per minute per IP
  const MAX_TEXT_LENGTH = 5000; // Max 5000 chars per request
  const TIME_WINDOW = 60000; // 1 minute

  return (ipAddress: string, textLength: number): { allowed: boolean; reason?: string } => {
    // Check text length
    if (textLength > MAX_TEXT_LENGTH) {
      return { allowed: false, reason: 'Text too long. Maximum 5000 characters allowed.' };
    }

    const now = Date.now();
    const ipRequests = ipRequestLog.get(ipAddress) || [];
    const recentIpRequests = ipRequests.filter(timestamp => now - timestamp < TIME_WINDOW);
    
    if (recentIpRequests.length >= MAX_REQUESTS_IP) {
      console.warn(`Rate limit exceeded for IP: ${ipAddress}`);
      return { allowed: false, reason: 'Too many requests. Please wait a moment before trying again.' };
    }
    
    recentIpRequests.push(now);
    ipRequestLog.set(ipAddress, recentIpRequests);
    
    return { allowed: true };
  };
})();

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // === JWT AUTHENTICATION ===
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return new Response(
      JSON.stringify({ error: 'Authentication required' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

  const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } }
  });

  const token = authHeader.replace('Bearer ', '');
  const { data: claimsData, error: claimsError } = await supabaseAuth.auth.getClaims(token);
  if (claimsError || !claimsData?.claims) {
    return new Response(
      JSON.stringify({ error: 'Invalid or expired token' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const userId = claimsData.claims.sub as string;

  // === SUBSCRIPTION CHECK: Read-to-Me requires Adventure Pass Plus ===
  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
  const { data: activeSub } = await supabaseAdmin
    .from('user_subscriptions')
    .select('id, plan_id, subscription_plans(name)')
    .eq('user_id', userId)
    .eq('status', 'active')
    .limit(1)
    .maybeSingle();

  const planName = (activeSub as any)?.subscription_plans?.name?.toLowerCase() || '';
  if (!planName.includes('premium_plus') && planName !== 'premium plus') {
    return new Response(
      JSON.stringify({ error: 'Read-to-Me requires an Adventure Pass Plus subscription.' }),
      { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const { text, voiceId } = await req.json();

    if (!text) {
      throw new Error('Text is required');
    }

    // Apply rate limiting
    const ipAddress = req.headers.get('x-forwarded-for')?.split(',')[0] || 
                      req.headers.get('x-real-ip') || 
                      'unknown';
    
    const rateLimitResult = rateLimit(ipAddress, text.length);
    if (!rateLimitResult.allowed) {
      return new Response(
        JSON.stringify({ error: rateLimitResult.reason }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const ELEVENLABS_API_KEY = Deno.env.get('ELEVENLABS_API_KEY');
    if (!ELEVENLABS_API_KEY) {
      throw new Error('ElevenLabs API key not configured');
    }

    console.log('Generating speech for text length:', text.length, 'with voice:', voiceId);

    // Call ElevenLabs API
    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
      {
        method: 'POST',
        headers: {
          'Accept': 'audio/mpeg',
          'Content-Type': 'application/json',
          'xi-api-key': ELEVENLABS_API_KEY,
        },
        body: JSON.stringify({
          text,
          model_id: 'eleven_turbo_v2',
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('ElevenLabs API error:', response.status, errorText);
      
      // Provide specific error messages
      if (response.status === 401) {
        throw new Error('ElevenLabs API key is invalid or account suspended. Please check your API key configuration.');
      } else if (response.status === 429) {
        throw new Error('Rate limit exceeded. Please try again later.');
      } else {
        throw new Error(`ElevenLabs API error: ${response.status}`);
      }
    }

    // Convert audio buffer to base64 (chunked for large files)
    const arrayBuffer = await response.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    
    // Process in chunks to avoid stack overflow
    let binary = '';
    const chunkSize = 0x8000; // 32KB chunks
    for (let i = 0; i < bytes.length; i += chunkSize) {
      const chunk = bytes.subarray(i, Math.min(i + chunkSize, bytes.length));
      binary += String.fromCharCode.apply(null, Array.from(chunk));
    }
    const base64Audio = btoa(binary);

    console.log('Successfully generated audio, size:', arrayBuffer.byteLength);

    return new Response(
      JSON.stringify({ audioContent: base64Audio }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Text-to-speech error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
