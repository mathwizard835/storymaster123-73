import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { user_id, device_id } = await req.json();

    if (!user_id && !device_id) {
      return new Response(
        JSON.stringify({ error: 'user_id or device_id required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user/device is banned
    const { data: isBanned, error } = await supabase.rpc('is_banned', {
      _user_id: user_id || null,
      _device_id: device_id || null,
    });

    if (error) {
      console.error('Error checking ban status:', error);
      return new Response(
        JSON.stringify({ error: 'Failed to check ban status' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get violation count if not banned
    let violations = 0;
    if (!isBanned) {
      const { data: violationData, error: violationError } = await supabase
        .from('content_violations')
        .select('id', { count: 'exact', head: true })
        .or(`device_id.eq.${device_id || 'unknown'},user_id.eq.${user_id || 'null'}`);

      if (!violationError) {
        violations = violationData?.length || 0;
      }
    }

    return new Response(
      JSON.stringify({ 
        is_banned: isBanned,
        violation_count: violations,
        remaining_attempts: Math.max(0, 3 - violations)
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in check-ban-status:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});