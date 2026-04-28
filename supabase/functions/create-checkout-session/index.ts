import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from 'https://esm.sh/stripe@14.21.0';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const getErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : 'An unknown error occurred';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
      apiVersion: '2023-10-16',
    });

    const { planType, deviceId } = await req.json();
    
    // Get user_id from auth header if available
    let userId = null;
    const authHeader = req.headers.get('Authorization');
    if (authHeader) {
      const supabaseClient = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_ANON_KEY') ?? ''
      );
      const token = authHeader.replace('Bearer ', '');
      const { data: { user } } = await supabaseClient.auth.getUser(token);
      userId = user?.id || null;
    }

    if (!planType || !deviceId) {
      throw new Error('Missing required parameters: planType and deviceId');
    }

    // Define price IDs based on plan type
    const priceIds = {
      premium: Deno.env.get('STRIPE_PREMIUM_PRICE_ID'),
    };

    const priceId = priceIds[planType as keyof typeof priceIds];
    
    if (!priceId) {
      throw new Error(`Invalid plan type: ${planType}`);
    }

    // Get the origin from request - for native apps, use the published URL
    const requestOrigin = req.headers.get('origin');
    // Use published URL for native platforms or fallback to request origin
    const origin = requestOrigin || 'https://storymaster123-73.lovable.app';
    
    // For native apps, use the published website URL for success/cancel
    // This ensures users land on the web page after payment
    const successUrl = `${origin}/subscription/success?session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${origin}/subscription?cancelled=true`;

    // Create checkout session
    // Note: Omitting payment_method_types lets Stripe automatically enable
    // wallets like Apple Pay and Google Pay (configured via Stripe Dashboard
    // > Settings > Payment methods). This makes Apple Pay appear as a button
    // inside Stripe Checkout on supported Safari/iOS devices.
    const session = await stripe.checkout.sessions.create({
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        device_id: deviceId,
        plan_type: planType,
        user_id: userId || '',
      },
      subscription_data: {
        metadata: {
          device_id: deviceId,
          plan_type: planType,
          user_id: userId || '',
        },
      },
    });

    console.log('Checkout session created:', session.id);

    return new Response(
      JSON.stringify({ url: session.url, sessionId: session.id }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error creating checkout session:', error);
    return new Response(
      JSON.stringify({ error: getErrorMessage(error) }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
