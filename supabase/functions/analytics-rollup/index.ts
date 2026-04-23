// Admin-only aggregate analytics reader.
//
// Returns ONLY aggregate counts/averages — no raw events, no identifiers.
// Caller must be authenticated AND have the 'admin' role.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Max-Age": "86400",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

function percentile(values: number[], p: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length));
  return sorted[idx];
}

// Rough Anthropic price estimates (USD per 1M tokens). Source-of-truth lives
// outside this function; numbers below are intentionally conservative.
const MODEL_COSTS: Record<string, { in: number; out: number }> = {
  "claude-sonnet-4-20250514": { in: 3, out: 15 },
  "claude-haiku-4-5-20251001": { in: 1, out: 5 },
};

function estimateCost(model: string | undefined, tokensIn: number, tokensOut: number): number {
  const c = MODEL_COSTS[model ?? ""] ?? { in: 3, out: 15 };
  return (tokensIn / 1_000_000) * c.in + (tokensOut / 1_000_000) * c.out;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Auth: must be a logged-in admin.
  const authHeader = req.headers.get("Authorization");
  if (!authHeader || !authHeader.toLowerCase().startsWith("bearer ")) {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const token = authHeader.slice("bearer ".length).trim();

  const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false },
  });

  // Pass the JWT explicitly — relying on the Authorization global header
  // can fail when the function is invoked without a session attached to
  // the SDK instance.
  const { data: userData, error: userErr } = await userClient.auth.getUser(token);
  if (userErr || !userData?.user) {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

  const { data: roleData, error: roleErr } = await admin
    .from("user_roles")
    .select("role")
    .eq("user_id", userData.user.id)
    .eq("role", "admin")
    .maybeSingle();

  if (roleErr || !roleData) {
    return new Response(JSON.stringify({ error: "forbidden" }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Window: default last 7 days, max 90.
  let days = 7;
  try {
    const url = new URL(req.url);
    const d = Number(url.searchParams.get("days"));
    if (Number.isFinite(d) && d >= 1 && d <= 90) days = Math.floor(d);
  } catch { /* ignore */ }

  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  // Pull recent events (capped). Service role bypasses RLS but we never expose
  // raw rows to the client — only aggregates derived below.
  const { data: events, error: evtErr } = await admin
    .from("analytics_events")
    .select("event_category,event_name,session_token,meta,created_at")
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(50_000);

  if (evtErr) {
    console.error("analytics-rollup read failed:", evtErr);
    return new Response(JSON.stringify({ error: "read failed" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const rows = events ?? [];

  // ---------- 1. System-level usage (aggregate) ----------
  const sessions = new Set<string>();
  let storiesGeneratedTotal = 0;
  let storiesFromCache = 0;
  let storiesNew = 0;
  const storiesPerSession = new Map<string, number>();

  // ---------- 2. Performance + cost ----------
  const latencies: number[] = [];
  let costTotal = 0;
  const modelCounts = new Map<string, number>();

  // ---------- 3. Subscription ----------
  const subscriptionEvents = { started: 0, renewed: 0, churned: 0, trial: 0 };
  const planDistribution = new Map<string, number>();

  // ---------- 4. Content ----------
  const lengthDistribution = new Map<string, number>();
  const themeDistribution = new Map<string, number>();
  const ageBucketUsage = new Map<string, number>();

  // ---------- 5. Cache ----------
  let cacheHits = 0;
  let cacheMisses = 0;
  const promptHashFreq = new Map<string, number>();
  const cacheByDay = new Map<string, { hits: number; misses: number }>();

  for (const r of rows) {
    sessions.add(r.session_token);
    const meta = (r.meta ?? {}) as Record<string, unknown>;
    const day = (r.created_at as string).slice(0, 10);

    if (r.event_category === "system" && r.event_name === "story_generated") {
      storiesGeneratedTotal += 1;
      storiesPerSession.set(
        r.session_token,
        (storiesPerSession.get(r.session_token) ?? 0) + 1,
      );
    }

    if (r.event_category === "performance" && r.event_name === "story_latency") {
      const ms = Number(meta.latency_ms);
      if (Number.isFinite(ms)) latencies.push(ms);
      const tokIn = Number(meta.tokens_in) || 0;
      const tokOut = Number(meta.tokens_out) || 0;
      const model = typeof meta.model === "string" ? meta.model : undefined;
      if (model) modelCounts.set(model, (modelCounts.get(model) ?? 0) + 1);
      costTotal += estimateCost(model, tokIn, tokOut);
    }

    if (r.event_category === "subscription") {
      const evt = String(meta.event ?? "");
      if (evt in subscriptionEvents) {
        (subscriptionEvents as any)[evt] += 1;
      }
      const plan = typeof meta.plan === "string" ? meta.plan : null;
      if (plan) planDistribution.set(plan, (planDistribution.get(plan) ?? 0) + 1);
    }

    if (r.event_category === "content" && r.event_name === "story_started") {
      const len = typeof meta.length_bucket === "string" ? meta.length_bucket : null;
      if (len) lengthDistribution.set(len, (lengthDistribution.get(len) ?? 0) + 1);
      const theme = typeof meta.theme_category === "string" ? meta.theme_category : null;
      if (theme) themeDistribution.set(theme, (themeDistribution.get(theme) ?? 0) + 1);
      const age = typeof meta.age_bucket === "string" ? meta.age_bucket : null;
      if (age) ageBucketUsage.set(age, (ageBucketUsage.get(age) ?? 0) + 1);
    }

    if (r.event_category === "cache") {
      const hit = meta.hit === true;
      if (hit) {
        cacheHits += 1;
        storiesFromCache += 1;
      } else {
        cacheMisses += 1;
        storiesNew += 1;
      }
      const dayBucket = cacheByDay.get(day) ?? { hits: 0, misses: 0 };
      if (hit) dayBucket.hits += 1; else dayBucket.misses += 1;
      cacheByDay.set(day, dayBucket);

      const ph = typeof meta.prompt_hash === "string" ? meta.prompt_hash : null;
      if (ph) promptHashFreq.set(ph, (promptHashFreq.get(ph) ?? 0) + 1);
    }
  }

  const sessionStoryCounts = Array.from(storiesPerSession.values());
  const avgStoriesPerSession = sessionStoryCounts.length
    ? sessionStoryCounts.reduce((a, b) => a + b, 0) / sessionStoryCounts.length
    : 0;

  const cacheTotal = cacheHits + cacheMisses;
  const cacheHitRate = cacheTotal > 0 ? cacheHits / cacheTotal : 0;

  // Top cached prompt hashes — anonymous, frequency only, max 20.
  const topCached = Array.from(promptHashFreq.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([hash, count]) => ({ hash, count }));

  const cacheHitRateOverTime = Array.from(cacheByDay.entries())
    .sort()
    .map(([date, v]) => ({
      date,
      hit_rate: v.hits + v.misses > 0 ? v.hits / (v.hits + v.misses) : 0,
      hits: v.hits,
      misses: v.misses,
    }));

  // Subscriptions snapshot from user_subscriptions (parent-level only).
  const { count: activeSubsCount } = await admin
    .from("user_subscriptions")
    .select("*", { count: "exact", head: true })
    .eq("status", "active");

  const result = {
    window: { days, since },
    system: {
      stories_generated_total: storiesGeneratedTotal,
      stories_served_from_cache_total: storiesFromCache,
      stories_generated_new_total: storiesNew,
      active_sessions_total: sessions.size,
      avg_stories_per_session: Number(avgStoriesPerSession.toFixed(2)),
      cache_hit_rate: Number(cacheHitRate.toFixed(4)),
    },
    performance: {
      avg_story_generation_latency_ms: latencies.length
        ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length)
        : 0,
      p95_latency_ms: Math.round(percentile(latencies, 95)),
      estimated_cost_total_usd: Number(costTotal.toFixed(4)),
      estimated_cost_per_story_usd: storiesGeneratedTotal > 0
        ? Number((costTotal / storiesGeneratedTotal).toFixed(6))
        : 0,
      model_usage_breakdown: Object.fromEntries(modelCounts),
    },
    subscription: {
      total_active_subscriptions: activeSubsCount ?? 0,
      events_in_window: subscriptionEvents,
      subscription_type_distribution: Object.fromEntries(planDistribution),
    },
    content: {
      story_length_distribution: Object.fromEntries(lengthDistribution),
      prompt_category_distribution: Object.fromEntries(themeDistribution),
      age_bucket_usage: Object.fromEntries(ageBucketUsage),
    },
    cache: {
      cache_hit_rate_over_time: cacheHitRateOverTime,
      cache_misses_total: cacheMisses,
      top_cached_prompt_hashes: topCached,
    },
  };

  return new Response(JSON.stringify(result), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
