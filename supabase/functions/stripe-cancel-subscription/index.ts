// Cancels a Stripe subscription at period end so the user retains access
// until their paid period expires. Updates the user_subscriptions row to
// keep status='active' but set expires_at to current_period_end.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const errMsg = (e: unknown) =>
  e instanceof Error ? e.message : "An unknown error occurred";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2023-10-16",
    });

    // Validate caller JWT
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing Authorization header");
    const token = authHeader.replace("Bearer ", "");

    const supabaseAnon = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
    );
    const { data: userData, error: userErr } = await supabaseAnon.auth.getUser(
      token,
    );
    if (userErr || !userData.user?.email) {
      throw new Error("Not authenticated");
    }
    const user = userData.user;

    // Find Stripe customer by email
    const customers = await stripe.customers.list({
      email: user.email!,
      limit: 1,
    });
    if (customers.data.length === 0) {
      throw new Error("No Stripe customer found");
    }
    const customerId = customers.data[0].id;

    // Find active subscription
    const subs = await stripe.subscriptions.list({
      customer: customerId,
      status: "active",
      limit: 1,
    });
    if (subs.data.length === 0) {
      // Nothing to cancel in Stripe — flip DB row to cancelled so UI updates
      const adminClient = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      );
      await adminClient
        .from("user_subscriptions")
        .update({
          status: "cancelled",
          expires_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", user.id)
        .eq("status", "active");
      return new Response(
        JSON.stringify({
          cancelled: true,
          accessUntil: new Date().toISOString(),
          note: "no_stripe_subscription_found",
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        },
      );
    }

    const sub = subs.data[0];

    // Schedule cancellation at period end (do NOT cancel immediately)
    const updated = await stripe.subscriptions.update(sub.id, {
      cancel_at_period_end: true,
    });
    const periodEndIso = new Date(updated.current_period_end * 1000)
      .toISOString();

    // Update DB row: keep active, set expires_at so the client knows when access ends
    const admin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );
    await admin
      .from("user_subscriptions")
      .update({
        expires_at: periodEndIso,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", user.id)
      .eq("status", "active");

    return new Response(
      JSON.stringify({
        cancelled: true,
        accessUntil: periodEndIso,
        subscriptionId: sub.id,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      },
    );
  } catch (error) {
    console.error("[stripe-cancel-subscription] error", error);
    return new Response(
      JSON.stringify({ error: errMsg(error) }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      },
    );
  }
});
