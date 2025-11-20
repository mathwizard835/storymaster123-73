import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from 'https://esm.sh/stripe@14.21.0';

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

    const { planType, deviceId } = await req.json();

    if (!planType || !deviceId) {
      throw new Error('Missing required parameters: planType and deviceId');
    }

    // Define price IDs based on plan type
    const priceIds = {
      premium: Deno.env.get('STRIPE_PREMIUM_PRICE_ID'),
      premium_plus: Deno.env.get('STRIPE_PREMIUM_PLUS_PRICE_ID'),
    };

    const priceId = priceIds[planType as keyof typeof priceIds];
    
    if (!priceId) {
      throw new Error(`Invalid plan type: ${planType}`);
    }

    // Get the origin from request
    const origin = req.headers.get('origin') || 'https://2809bfa0-b669-424e-9eb0-6511e3cb6327.lovableproject.com';

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${origin}/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/subscription?cancelled=true`,
      metadata: {
        device_id: deviceId,
        plan_type: planType,
      },
      subscription_data: {
        metadata: {
          device_id: deviceId,
          plan_type: planType,
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
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
