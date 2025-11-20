import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from 'https://esm.sh/stripe@14.21.0';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, stripe-signature',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const signature = req.headers.get('stripe-signature');
  
  if (!signature) {
    return new Response(
      JSON.stringify({ error: 'Missing stripe-signature header' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
      apiVersion: '2023-10-16',
    });

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const body = await req.text();
    const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret!);
    } catch (err) {
      console.error('Webhook signature verification failed:', err.message);
      return new Response(
        JSON.stringify({ error: 'Webhook signature verification failed' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Webhook event received:', event.type);

    // Handle the event
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const deviceId = session.metadata?.device_id;
        const planType = session.metadata?.plan_type;

        if (!deviceId || !planType) {
          console.error('Missing metadata in checkout session');
          break;
        }

        // Map plan type to plan ID
        const planIds = {
          premium: 'c414127f-af31-47f1-b474-d59bf4956e1f',
          premium_plus: '1f07f062-4123-4e51-9c5d-9541836a8f1c',
        };

        const planId = planIds[planType as keyof typeof planIds];

        // Cancel any existing active subscriptions for this device
        await supabaseClient
          .from('user_subscriptions')
          .update({ status: 'cancelled' })
          .eq('device_id', deviceId)
          .eq('status', 'active');

        // Create new subscription record
        const { error } = await supabaseClient
          .from('user_subscriptions')
          .insert({
            device_id: deviceId,
            plan_id: planId,
            status: 'active',
            starts_at: new Date().toISOString(),
          });

        if (error) {
          console.error('Error creating subscription:', error);
        } else {
          console.log('Subscription created for device:', deviceId);
        }
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        const deviceId = subscription.metadata?.device_id;

        if (!deviceId) {
          console.error('Missing device_id in subscription metadata');
          break;
        }

        // Update subscription status based on Stripe status
        const status = subscription.status === 'active' ? 'active' : 'cancelled';

        await supabaseClient
          .from('user_subscriptions')
          .update({ 
            status,
            updated_at: new Date().toISOString(),
          })
          .eq('device_id', deviceId)
          .eq('status', 'active');

        console.log('Subscription updated for device:', deviceId);
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const deviceId = subscription.metadata?.device_id;

        if (!deviceId) {
          console.error('Missing device_id in subscription metadata');
          break;
        }

        // Mark subscription as cancelled
        await supabaseClient
          .from('user_subscriptions')
          .update({ 
            status: 'cancelled',
            updated_at: new Date().toISOString(),
          })
          .eq('device_id', deviceId);

        console.log('Subscription cancelled for device:', deviceId);
        break;
      }

      default:
        console.log('Unhandled event type:', event.type);
    }

    return new Response(
      JSON.stringify({ received: true }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error processing webhook:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
