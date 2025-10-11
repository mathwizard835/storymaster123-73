import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { userId, deviceId, email } = await req.json();

    console.log('Checking ban status for:', { userId, deviceId, email });

    // Check if user is banned by userId, deviceId, or email
    let query = supabaseClient
      .from('banned_users')
      .select('*');

    if (userId) {
      query = query.or(`user_id.eq.${userId}`);
    }
    if (deviceId) {
      query = query.or(`device_id.eq.${deviceId}`);
    }
    if (email) {
      query = query.or(`email.eq.${email}`);
    }

    const { data: ban, error } = await query.maybeSingle();

    if (error) {
      console.error('Error checking ban status:', error);
      throw error;
    }

    if (ban) {
      // Check if ban has expired
      if (ban.expires_at && new Date(ban.expires_at) < new Date()) {
        console.log('Ban has expired, removing...');
        await supabaseClient
          .from('banned_users')
          .delete()
          .eq('id', ban.id);

        return new Response(
          JSON.stringify({ banned: false }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log('User is banned:', ban);
      return new Response(
        JSON.stringify({
          banned: true,
          reason: ban.reason,
          expires_at: ban.expires_at,
          banned_at: ban.banned_at
        }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ banned: false }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in check-ban-status:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
