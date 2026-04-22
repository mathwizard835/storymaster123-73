import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify webhook authorization
    const authHeader = req.headers.get("Authorization");
    const webhookSecret = Deno.env.get("REVENUECAT_WEBHOOK_SECRET");

    if (!webhookSecret || authHeader !== webhookSecret) {
      console.error("Unauthorized webhook request");
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const event = body.event;

    if (!event) {
      return new Response(JSON.stringify({ error: "No event in body" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`RevenueCat event: ${event.type}`, JSON.stringify({
      app_user_id: event.app_user_id,
      product_id: event.product_id,
      type: event.type,
    }));

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // The app_user_id from RevenueCat is the Supabase user ID (set via identifyUser)
    const userId = event.app_user_id;
    const productId = event.product_id;

    // Map product IDs to plan types
    const planTypeMap: Record<string, string> = {
      sm_699_1m: "premium",
      "sm_7.99_1m": "premium_plus",
    };
    const planType = planTypeMap[productId] || "premium";

    // Get plan_id from subscription_plans table
    const { data: plans } = await supabase
      .from("subscription_plans")
      .select("id, name")
      .ilike("name", `%${planType.replace("_", " ")}%`);

    // Fallback: try exact match
    let planId = plans?.[0]?.id;
    if (!planId) {
      const { data: allPlans } = await supabase
        .from("subscription_plans")
        .select("id, name");
      
      console.log("Available plans:", allPlans);
      
      // Try matching by price
      const priceMap: Record<string, number> = {
        sm_699_1m: 4.99,
        "sm_7.99_1m": 7.99,
      };
      const targetPrice = priceMap[productId];
      if (targetPrice && allPlans) {
        const { data: pricePlan } = await supabase
          .from("subscription_plans")
          .select("id")
          .eq("price_monthly", targetPrice)
          .limit(1)
          .single();
        planId = pricePlan?.id;
      }
    }

    if (!planId) {
      console.error("Could not find matching plan for product:", productId);
      return new Response(
        JSON.stringify({ error: "Plan not found", productId }),
        {
          status: 200, // Return 200 so RevenueCat doesn't retry
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    switch (event.type) {
      case "INITIAL_PURCHASE":
      case "RENEWAL":
      case "PRODUCT_CHANGE": {
        // Cancel any existing active subscriptions for this user
        if (userId && userId !== "$RCAnonymousID") {
          await supabase
            .from("user_subscriptions")
            .update({ status: "cancelled" })
            .eq("user_id", userId)
            .eq("status", "active");
        }

        // Create new active subscription
        const expirationDate = event.expiration_at_ms
          ? new Date(event.expiration_at_ms).toISOString()
          : null;

        const insertData: Record<string, any> = {
          plan_id: planId,
          status: "active",
          device_id: userId || "revenuecat", // fallback device_id
          starts_at: new Date().toISOString(),
          expires_at: expirationDate,
        };

        // Only set user_id if it's a real Supabase user ID (UUID format)
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (userId && uuidRegex.test(userId)) {
          insertData.user_id = userId;
        }

        const { error: insertError } = await supabase
          .from("user_subscriptions")
          .insert([insertData]);

        if (insertError) {
          console.error("Failed to insert subscription:", insertError);
        } else {
          console.log(`✅ Subscription activated for user ${userId}, plan: ${planType}`);
        }
        break;
      }

      case "CANCELLATION":
      case "EXPIRATION": {
        if (userId && userId !== "$RCAnonymousID") {
          const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
          
          if (uuidRegex.test(userId)) {
            const { error: updateError } = await supabase
              .from("user_subscriptions")
              .update({ status: event.type === "CANCELLATION" ? "cancelled" : "expired" })
              .eq("user_id", userId)
              .eq("status", "active");

            if (updateError) {
              console.error("Failed to update subscription:", updateError);
            } else {
              console.log(`✅ Subscription ${event.type.toLowerCase()} for user ${userId}`);
            }
          }
        }
        break;
      }

      case "BILLING_ISSUE_DETECTED": {
        console.log(`⚠️ Billing issue for user ${userId}`);
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Webhook error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 200, // Return 200 to prevent RevenueCat retries on our errors
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
