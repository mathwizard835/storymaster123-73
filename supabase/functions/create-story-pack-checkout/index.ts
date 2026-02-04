import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from 'https://esm.sh/stripe@14.21.0';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// Story pack pricing (one-time purchases)
const STORY_PACKS: Record<number, { price: number; name: string }> = {
  10: { price: 499, name: '10 Story Pack' },  // $4.99
  20: { price: 699, name: '20 Story Pack' },  // $6.99
  30: { price: 999, name: '30 Story Pack' },  // $9.99
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
      apiVersion: '2023-10-16',
    });

    const { packSize, deviceId } = await req.json();
    
    // Validate pack size
    const packInfo = STORY_PACKS[packSize];
    if (!packInfo) {
      throw new Error(`Invalid pack size: ${packSize}. Valid sizes are 10, 20, or 30.`);
    }

    // Get user_id from auth header if available
    let userId = null;
    let userEmail = null;
    const authHeader = req.headers.get('Authorization');
    if (authHeader) {
      const supabaseClient = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_ANON_KEY') ?? ''
      );
      const token = authHeader.replace('Bearer ', '');
      const { data: { user } } = await supabaseClient.auth.getUser(token);
      userId = user?.id || null;
      userEmail = user?.email || null;
    }

    if (!deviceId) {
      throw new Error('Missing required parameter: deviceId');
    }

    console.log(`Creating story pack checkout: ${packSize} stories for device ${deviceId}`);

    // Get the origin from request - for native apps, use the published URL
    const requestOrigin = req.headers.get('origin');
    const origin = requestOrigin || 'https://storymaster123-73.lovable.app';
    
    const successUrl = `${origin}/subscription?pack_success=true&stories=${packSize}`;
    const cancelUrl = `${origin}/subscription?pack_cancelled=true`;

    // Create one-time payment session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: packInfo.name,
              description: `Add ${packSize} bonus stories to your account`,
            },
            unit_amount: packInfo.price,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: successUrl,
      cancel_url: cancelUrl,
      customer_email: userEmail || undefined,
      metadata: {
        device_id: deviceId,
        user_id: userId || '',
        pack_size: packSize.toString(),
        pack_type: 'story_pack',
      },
    });

    console.log('Story pack checkout session created:', session.id);

    return new Response(
      JSON.stringify({ url: session.url, sessionId: session.id }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error creating story pack checkout session:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
