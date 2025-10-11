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

    const { action, email, reason, expiresAt, deviceId } = await req.json();

    console.log('Manage bans action:', action, 'for:', email);

    switch (action) {
      case 'ban': {
        if (!email || !reason) {
          throw new Error('Email and reason are required to ban a user');
        }

        // Get user info if exists
        const { data: users } = await supabaseClient.auth.admin.listUsers();
        const user = users?.users.find(u => u.email === email);

        // Check if already banned
        const { data: existing } = await supabaseClient
          .from('banned_users')
          .select('*')
          .eq('email', email)
          .maybeSingle();

        if (existing) {
          return new Response(
            JSON.stringify({ error: 'User is already banned' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Create ban record
        const { data: ban, error } = await supabaseClient
          .from('banned_users')
          .insert({
            user_id: user?.id || null,
            device_id: deviceId || email, // Use email as fallback for device_id
            email,
            reason,
            expires_at: expiresAt || null,
            banned_by: 'admin'
          })
          .select()
          .single();

        if (error) throw error;

        console.log('User banned successfully:', ban);
        return new Response(
          JSON.stringify({ success: true, ban }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'unban': {
        if (!email) {
          throw new Error('Email is required to unban a user');
        }

        const { error } = await supabaseClient
          .from('banned_users')
          .delete()
          .eq('email', email);

        if (error) throw error;

        console.log('User unbanned successfully:', email);
        return new Response(
          JSON.stringify({ success: true, message: `User ${email} has been unbanned` }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'list': {
        const { data: bans, error } = await supabaseClient
          .from('banned_users')
          .select('*')
          .order('banned_at', { ascending: false });

        if (error) throw error;

        return new Response(
          JSON.stringify({ bans }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'violations': {
        if (!email) {
          throw new Error('Email is required to get violation history');
        }

        // Get user ID from email
        const { data: users } = await supabaseClient.auth.admin.listUsers();
        const user = users?.users.find(u => u.email === email);

        if (!user) {
          return new Response(
            JSON.stringify({ violations: [] }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const { data: violations, error } = await supabaseClient
          .from('content_violations')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (error) throw error;

        return new Response(
          JSON.stringify({ violations }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }
  } catch (error) {
    console.error('Error in manage-bans:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
