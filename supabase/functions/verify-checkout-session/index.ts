import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from 'https://esm.sh/stripe@14.21.0';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
      apiVersion: '2023-10-16',
    });

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { sessionId } = await req.json();
    
    if (!sessionId) {
      throw new Error('Missing sessionId');
    }

    console.log('Verifying checkout session:', sessionId);

    // Retrieve the session from Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    
    if (session.payment_status !== 'paid') {
      console.log('Payment not completed:', session.payment_status);
      return new Response(
        JSON.stringify({ success: false, message: 'Payment not completed' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    const deviceId = session.metadata?.device_id;
    const planType = session.metadata?.plan_type;
    const userId = session.metadata?.user_id;

    if (!deviceId || !planType) {
      console.error('Missing metadata in session');
      throw new Error('Missing metadata in checkout session');
    }

    console.log('Session verified:', { deviceId, planType, userId, paymentStatus: session.payment_status });

    // Map plan type to plan ID
    const planIds = {
      premium: 'c414127f-af31-47f1-b474-d59bf4956e1f',
      premium_plus: '1f07f062-4123-4e51-9c5d-9541836a8f1c',
    };

    const planId = planIds[planType as keyof typeof planIds];

    // Check if subscription already exists
    const { data: existingSub } = await supabaseClient
      .from('user_subscriptions')
      .select('*')
      .eq('device_id', deviceId)
      .eq('status', 'active')
      .maybeSingle();

    if (existingSub) {
      console.log('Subscription already exists:', existingSub.id);
      return new Response(
        JSON.stringify({ success: true, subscription: existingSub }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // Cancel any existing active subscriptions
    if (userId) {
      await supabaseClient
        .from('user_subscriptions')
        .update({ status: 'cancelled' })
        .or(`device_id.eq.${deviceId},user_id.eq.${userId}`)
        .eq('status', 'active');
    } else {
      await supabaseClient
        .from('user_subscriptions')
        .update({ status: 'cancelled' })
        .eq('device_id', deviceId)
        .eq('status', 'active');
    }

    // Create new subscription
    const { data: newSub, error } = await supabaseClient
      .from('user_subscriptions')
      .insert({
        device_id: deviceId,
        user_id: userId || null,
        plan_id: planId,
        status: 'active',
        starts_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating subscription:', error);
      throw error;
    }

    console.log('Subscription created successfully:', newSub.id);

    return new Response(
      JSON.stringify({ success: true, subscription: newSub }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error verifying checkout session:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
