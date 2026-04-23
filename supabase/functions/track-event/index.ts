// Privacy-safe analytics ingestion for StoryMaster.
//
// HARD RULES (do not change without compliance review):
//   - Never store user_id, device_id, email, name, age, or raw prompt text.
//   - Only an ephemeral session_token (rotated client-side ~30 min) is kept.
//   - meta is filtered against an allowlist BEFORE insert; everything else
//     is dropped silently.
//   - Numeric metadata is coerced into bounded buckets where possible.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Max-Age": "86400",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// --- Allowed shapes ---------------------------------------------------------

const ALLOWED_CATEGORIES = new Set([
  "system",
  "performance",
  "subscription",
  "content",
  "cache",
  "funnel",
]);

// Allowlist of metadata keys per category. Any key not listed is dropped.
// Values are coerced to safe primitives before storage.
const META_ALLOWLIST: Record<string, Set<string>> = {
  system: new Set(["scene_index_bucket", "is_first_scene"]),
  performance: new Set(["latency_ms", "tokens_in", "tokens_out", "model"]),
  subscription: new Set(["plan", "event"]), // event: started|renewed|churned
  content: new Set([
    "length_bucket", // short|medium|epic
    "age_bucket",    // 5-7|8-10|11-13
    "theme_category", // mystery|comedy|thrill|explore|learning
  ]),
  cache: new Set(["hit", "prompt_hash"]), // prompt_hash = 64-char sha256
  funnel: new Set([]), // funnel events use only event_name; no meta needed
};

const AGE_BUCKETS: Array<[number, number, string]> = [
  [5, 7, "5-7"],
  [8, 10, "8-10"],
  [11, 13, "11-13"],
];

function bucketAge(age: unknown): string | null {
  const n = typeof age === "number" ? age : Number(age);
  if (!Number.isFinite(n)) return null;
  for (const [lo, hi, label] of AGE_BUCKETS) {
    if (n >= lo && n <= hi) return label;
  }
  return null;
}

function bucketSceneIndex(idx: unknown): string | null {
  const n = typeof idx === "number" ? idx : Number(idx);
  if (!Number.isFinite(n) || n < 0) return null;
  if (n === 0) return "first";
  if (n <= 2) return "1-2";
  if (n <= 5) return "3-5";
  if (n <= 10) return "6-10";
  return "11+";
}

function clampNumber(v: unknown, min: number, max: number): number | null {
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n)) return null;
  return Math.max(min, Math.min(max, n));
}

function sanitizeMeta(category: string, meta: any): Record<string, unknown> {
  if (!meta || typeof meta !== "object" || Array.isArray(meta)) return {};
  const allowed = META_ALLOWLIST[category];
  if (!allowed) return {};

  const out: Record<string, unknown> = {};
  for (const key of Object.keys(meta)) {
    if (!allowed.has(key)) continue;
    const v = meta[key];

    switch (key) {
      case "latency_ms":
        out[key] = clampNumber(v, 0, 120000);
        break;
      case "tokens_in":
      case "tokens_out":
        out[key] = clampNumber(v, 0, 200000);
        break;
      case "model":
        if (typeof v === "string" && v.length <= 64) out[key] = v;
        break;
      case "plan":
        if (typeof v === "string" && /^[a-z0-9_-]{1,32}$/i.test(v)) out[key] = v;
        break;
      case "event":
        if (typeof v === "string" && ["started", "renewed", "churned", "trial"].includes(v)) {
          out[key] = v;
        }
        break;
      case "length_bucket":
        if (typeof v === "string" && ["short", "medium", "epic"].includes(v)) out[key] = v;
        break;
      case "age_bucket": {
        // Accept either a raw age number or a pre-bucketed label.
        if (typeof v === "string" && ["5-7", "8-10", "11-13"].includes(v)) out[key] = v;
        else {
          const bucket = bucketAge(v);
          if (bucket) out[key] = bucket;
        }
        break;
      }
      case "theme_category":
        if (typeof v === "string" && /^[a-z_-]{1,32}$/.test(v)) out[key] = v;
        break;
      case "scene_index_bucket": {
        if (typeof v === "string" && ["first", "1-2", "3-5", "6-10", "11+"].includes(v)) {
          out[key] = v;
        } else {
          const bucket = bucketSceneIndex(v);
          if (bucket) out[key] = bucket;
        }
        break;
      }
      case "is_first_scene":
        if (typeof v === "boolean") out[key] = v;
        break;
      case "hit":
        if (typeof v === "boolean") out[key] = v;
        break;
      case "prompt_hash":
        if (typeof v === "string" && /^[a-f0-9]{64}$/.test(v)) out[key] = v;
        break;
    }
  }
  return out;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "invalid json" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Accept a single event or a small batch.
  const events: any[] = Array.isArray(body?.events) ? body.events : [body];
  if (events.length === 0 || events.length > 25) {
    return new Response(JSON.stringify({ error: "batch size must be 1..25" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const rows: Array<{
    event_category: string;
    event_name: string;
    session_token: string;
    meta: Record<string, unknown>;
  }> = [];

  const promptHashUpdates: Array<{ hash: string; hit: boolean }> = [];

  for (const evt of events) {
    if (!evt || typeof evt !== "object") continue;

    const category = String(evt.category ?? "").toLowerCase();
    if (!ALLOWED_CATEGORIES.has(category)) continue;

    const name = String(evt.name ?? "");
    if (name.length < 1 || name.length > 64) continue;
    if (!/^[a-z0-9_.-]+$/i.test(name)) continue;

    const sessionToken = String(evt.session_token ?? "");
    if (sessionToken.length < 8 || sessionToken.length > 64) continue;
    if (!/^[a-zA-Z0-9_-]+$/.test(sessionToken)) continue;

    const meta = sanitizeMeta(category, evt.meta);

    rows.push({
      event_category: category,
      event_name: name,
      session_token: sessionToken,
      meta,
    });

    // Side-effect: bump anonymous prompt-hash counter for cache events.
    if (category === "cache" && typeof meta.prompt_hash === "string") {
      promptHashUpdates.push({
        hash: meta.prompt_hash,
        hit: meta.hit === true,
      });
    }
  }

  if (rows.length === 0) {
    return new Response(JSON.stringify({ ok: true, accepted: 0 }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

  const { error } = await admin.from("analytics_events").insert(rows);
  if (error) {
    console.error("track-event insert failed:", error);
    return new Response(JSON.stringify({ error: "insert failed" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Best-effort prompt-hash counter updates (don't fail the whole request).
  for (const up of promptHashUpdates) {
    const { error: bumpErr } = await admin.rpc("bump_prompt_hash", {
      _hash: up.hash,
      _hit: up.hit,
    });
    if (bumpErr) console.warn("bump_prompt_hash failed:", bumpErr.message);
  }

  return new Response(JSON.stringify({ ok: true, accepted: rows.length }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
