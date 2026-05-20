import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

// Rate limiting: Track requests per device
const requestCounts = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const MAX_REQUESTS_PER_MINUTE = 10;

// More restrictive CORS - only allow specific origins in production
const corsHeaders = {
  "Access-Control-Allow-Origin": "*", // TODO: Restrict to specific domains in production
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Max-Age": "86400",
};

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");

// Strict content blocking for ages 5-12
const BLOCKED_PATTERNS = [
  // Sexual content and innuendo
  /\b(sex|sexual|porn|pornography|xxx|nsfw|nude|naked|explicit|romantic|kiss|dating|boyfriend|girlfriend|lover|seductive|flirt)\b/i,
  // Drugs, alcohol, smoking
  /\b(drugs|cocaine|heroin|meth|marijuana|weed|cannabis|alcohol|beer|wine|liquor|drunk|smoking|cigarette|vape|tobacco)\b/i,
  // Graphic violence and gore
  /\b(kill|killing|murder|stab|stabbing|blood|bloody|gore|gory|death|die|dying|corpse|torture|mutilate|dismember|decapitate)\b/i,
  // Weapons and violence
  /\b(gun|guns|firearm|shoot|shooting|weapon|knife|sword|explosive|bomb|grenade|attack|assault)\b/i,
  // Hate and discrimination
  /\b(hate|racist|racism|nazi|supremacy|discriminat|bully|bullying|harass|harassment)\b/i,
  // Self-harm and mental health crisis
  /\b(suicide|self-harm|cutting|hanging)\b/i,
  // Gambling and adult themes
  /\b(gambling|casino|betting|adult|mature|18\+|21\+)\b/i,
  // Dark horror themes
  /\b(horror|terrifying|nightmare|demon|possessed|haunted|evil|sinister|creepy|scary|frightening)\b/i,
  // Unsafe behaviors
  /\b(dangerous|unsafe|reckless|poison|toxic)\b/i,
];

function containsInappropriateContent(text: string): boolean {
  if (!text || typeof text !== "string") return false;

  const normalized = text.toLowerCase().trim();

  // Check blocked patterns
  for (const pattern of BLOCKED_PATTERNS) {
    if (pattern.test(normalized)) {
      console.error(`Blocked content detected: matched pattern ${pattern}`);
      return true;
    }
  }

  // Check for URLs
  if (/https?:\/\//i.test(normalized)) {
    console.error("Blocked content: URL detected");
    return true;
  }

  // Check for excessive special characters
  if (/(.)\1{5,}/.test(normalized)) {
    console.error("Blocked content: excessive repetition");
    return true;
  }

  return false;
}

// Input validation functions
function validateProfileData(profile: any): boolean {
  if (!profile || typeof profile !== "object") return true; // Optional field

  if (profile.age && (typeof profile.age !== "number" || profile.age < 5 || profile.age > 12)) {
    return false;
  }

  // Handle interests as both array and string format
  if (profile.interests) {
    if (Array.isArray(profile.interests) && profile.interests.length > 20) {
      return false;
    }
    if (typeof profile.interests === "string" && profile.interests.length > 500) {
      return false;
    }
  }

  if (profile.selectedBadges && (!Array.isArray(profile.selectedBadges) || profile.selectedBadges.length > 10)) {
    return false;
  }

  // Content filtering for name field
  if (profile.name && typeof profile.name === "string") {
    if (profile.name.length > 50) return false;
    if (containsInappropriateContent(profile.name)) {
      console.error("Blocked: inappropriate content in name");
      return false;
    }
  }

  // Content filtering for interests string field
  if (profile.interests && typeof profile.interests === "string") {
    if (profile.interests.length > 500) return false;
    if (containsInappropriateContent(profile.interests)) {
      console.error("Blocked: inappropriate content in interests");
      return false;
    }
  }

  // Content filtering for topic field
  if (profile.topic && typeof profile.topic === "string") {
    if (profile.topic.length > 500) return false;
    if (containsInappropriateContent(profile.topic)) {
      console.error("Blocked: inappropriate content in topic");
      return false;
    }
  }

  return true;
}

function validateRequestSize(body: any): boolean {
  const bodyStr = JSON.stringify(body);
  return bodyStr.length <= 50000; // 50KB limit
}

function rateLimit(deviceId: string, ipAddress: string): boolean {
  const now = Date.now();
  const deviceKey = deviceId || "anonymous";
  const ipKey = ipAddress || "unknown";

  // Check device-based rate limit
  const deviceData = requestCounts.get(`device_${deviceKey}`);
  if (deviceData && now <= deviceData.resetTime) {
    if (deviceData.count >= MAX_REQUESTS_PER_MINUTE) {
      console.warn(`Rate limit exceeded for device: ${deviceKey}`);
      return false;
    }
    deviceData.count++;
  } else {
    requestCounts.set(`device_${deviceKey}`, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
  }

  // Check IP-based rate limit (30 requests per minute - allows multiple devices per IP)
  const MAX_REQUESTS_PER_IP = 30;
  const ipData = requestCounts.get(`ip_${ipKey}`);
  if (ipData && now <= ipData.resetTime) {
    if (ipData.count >= MAX_REQUESTS_PER_IP) {
      console.warn(`Rate limit exceeded for IP: ${ipKey}`);
      return false;
    }
    ipData.count++;
  } else {
    requestCounts.set(`ip_${ipKey}`, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
  }

  return true;
}

// Enhanced JSON extraction function to handle markdown-wrapped responses
function extractJSON(text: string): unknown | null {
  if (!text) return null;

  // Try direct parsing first
  try {
    return JSON.parse(text);
  } catch (_) {
    console.log("Direct JSON parse failed, trying extraction methods...");
  }

  // Try extracting from markdown code blocks
  const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (codeBlockMatch) {
    try {
      console.log("Found code block, parsing...");
      return JSON.parse(codeBlockMatch[1]);
    } catch (e) {
      console.log("Code block parsing failed:", e);
    }
  }

  // Try finding JSON object boundaries - look for complete objects only
  const jsonStart = text.indexOf("{");
  if (jsonStart !== -1) {
    let braceCount = 0;
    let jsonEnd = -1;

    for (let i = jsonStart; i < text.length; i++) {
      if (text[i] === "{") braceCount++;
      if (text[i] === "}") braceCount--;
      if (braceCount === 0) {
        jsonEnd = i;
        break;
      }
    }

    if (jsonEnd !== -1) {
      try {
        const jsonStr = text.substring(jsonStart, jsonEnd + 1);
        console.log("Extracted JSON string length:", jsonStr.length);
        return JSON.parse(jsonStr);
      } catch (e) {
        console.log("Extracted JSON parsing failed:", e);
      }
    }
  }

  console.log("All JSON extraction methods failed. Raw response preview:", text.substring(0, 500));
  return null;
}

function hasQuizQuestions(value: unknown): value is { questions: unknown[] } {
  return typeof value === "object" &&
    value !== null &&
    "questions" in value &&
    Array.isArray((value as { questions?: unknown }).questions);
}

const SYSTEM_PROMPT = `You are StoryMaster AI, an interactive choose-your-own-adventure storyteller for children ages 6–11. Create cinematic, immersive, emotionally engaging stories that are fun, safe, and replayable.

SAFETY (strict): No violence, gore, blood, weapons used to harm, sexual/romantic content, drugs/alcohol/smoking, bullying, discrimination, horror, scary imagery, or unsafe behaviors. Villains are goofy or redeemable. Keep everything age-appropriate.

QUEST MODES (primary tone driver):
- FUN/COMEDY: silly, wacky, cartoon humor, onomatopoeia ("BONK!", "ZAP!"). Kids should giggle, not feel danger.
- THRILL: high stakes, urgent ticking-clock action.
- MYSTERY: clues, puzzles, slow-building investigation with clever payoffs.
- EXPLORE: wonder, magical worlds, fantastical creatures, curiosity-driven discovery.
- LEARNING: embed math/reading/science/logic; wrong answers cause fun consequences, never dead ends.

AGE TUNING:
- 6–7: simple words, short sentences, 3 ideas per scene, visual & humorous.
- 8–9: moderate vocabulary, 4–5 connected ideas, early twists and problem-solving.
- 10–11: rich but clear vocabulary, 1–2 interwoven threads, emotional arcs, character growth, subtle callbacks.

LEXILE TUNING:
- 200–400L: simple words, 5–10 word sentences, single-idea paragraphs, explicit cause/effect.
- 400–650L: moderate vocab with context clues, varied sentence length, connected ideas.
- 650–900L: rich vocab, compound-complex sentences, multiple threads, emotional depth.
- 900–1200L: advanced vocab, sophisticated structure, layered narratives, nuanced themes.

STRUCTURE:
- Opening scene: hook fast — where am I, what's happening, who am I.
- Each scene: build stakes, reference items/achievements/personality, end with 2–4 meaningful choices.
- Length: short = 5 scenes, medium = 8 scenes, epic = 12+ scenes.

INTERACTIVITY: surface objects and items that can affect choices, inventory, and achievements. Unlock new paths/secrets/rewards.

VOICE: natural, cinematic, adaptive to mode + age + Lexile. Make scenes feel alive.

RESPONSE: Always return ONLY valid JSON in the schema the user prompt provides. No markdown, no commentary.`;

// ---- JWT verification cache ----
// Skips supabase.auth.getUser on continuation scenes. Keyed by sha256(JWT).
type JwtCacheEntry = { userId: string; expiresAt: number };
const jwtCache = new Map<string, JwtCacheEntry>();
const JWT_CACHE_MAX = 500;
const JWT_CACHE_TTL_MS = 5 * 60 * 1000;

async function sha256Hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function jwtCacheGet(key: string): string | null {
  const entry = jwtCache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    jwtCache.delete(key);
    return null;
  }
  // LRU touch
  jwtCache.delete(key);
  jwtCache.set(key, entry);
  return entry.userId;
}

function jwtCacheSet(key: string, userId: string, jwtExpSec?: number) {
  if (jwtCache.size >= JWT_CACHE_MAX) {
    const oldest = jwtCache.keys().next().value;
    if (oldest) jwtCache.delete(oldest);
  }
  const ttl = jwtExpSec ? Math.min(jwtExpSec * 1000 - Date.now(), JWT_CACHE_TTL_MS) : JWT_CACHE_TTL_MS;
  jwtCache.set(key, { userId, expiresAt: Date.now() + Math.max(30_000, ttl) });
}

function decodeJwtExp(token: string): number | undefined {
  try {
    const payload = token.split(".")[1];
    const json = JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/")));
    return typeof json.exp === "number" ? json.exp : undefined;
  } catch {
    return undefined;
  }
}

// ---- Per-user model cache (stable Sonnet/Haiku choice for ~5 min) ----
const userModelCache = new Map<string, { model: string; expiresAt: number }>();
const USER_MODEL_TTL_MS = 5 * 60 * 1000;



serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (!ANTHROPIC_API_KEY) {
    console.error("Missing ANTHROPIC_API_KEY secret");
    return new Response(JSON.stringify({ error: "Service configuration error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  // Use service role for server-side queries (bypasses RLS)
  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

  // Peek at body early to check for guest demo mode
  let body: any;
  try {
    const contentLength = req.headers.get("content-length");
    if (contentLength && parseInt(contentLength) > 50000) {
      return new Response(JSON.stringify({ error: "Request too large" }), {
        status: 413,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    body = await req.json();
  } catch (_e) {
    return new Response(JSON.stringify({ error: "Invalid request body" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const isGuest = body?.guest === true;
  let userId: string;

  if (isGuest) {
    // Guest demo mode: no auth required. Force a short, capped, non-persisted story.
    userId = "guest";
    console.log("Guest demo story request");
    // Force short length & cap scenes
    if (body.profile && typeof body.profile === "object") {
      body.profile.storyLength = "short";
    }
  } else {
    // === JWT AUTHENTICATION (with in-memory cache) ===
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Authentication required" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const jwtKey = await sha256Hex(token);
    const cachedUserId = jwtCacheGet(jwtKey);

    if (cachedUserId) {
      userId = cachedUserId;
    } else {
      const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: userData, error: userError } = await supabaseAuth.auth.getUser(token);
      if (userError || !userData?.user) {
        console.error("JWT verification failed:", userError);
        return new Response(JSON.stringify({ error: "Invalid or expired token" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      userId = userData.user.id;
      jwtCacheSet(jwtKey, userId, decodeJwtExp(token));
    }
    console.log(`Authenticated user: ${userId}`);
  }

  try {
    // (body already parsed above)

    // Check if this is a quiz generation request
    if (body?.action === "generate-quiz") {
      const scenes = body?.scenes || [];
      const profile = body?.profile || {};

      if (!scenes || scenes.length === 0) {
        return new Response(JSON.stringify({ error: "No story scenes provided for quiz generation" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Build story summary from scenes
      const storySummary = scenes
        .map(
          (scene: any, idx: number) => `Scene ${idx + 1}: ${scene.sceneTitle || "Untitled"}\n${scene.narrative || ""}`,
        )
        .join("\n\n");

      const quizPrompt = `Based on this children's story (age ${profile.age || "8-10"}), generate 5 comprehension quiz questions.

STORY:
${storySummary}

REQUIREMENTS:
- 3 multiple-choice questions (with 4 options each)
- 2 true/false questions
- Questions should test understanding of: plot events, character decisions, story themes, and key details
- Age-appropriate language for ${profile.age || 8} year olds
- Make questions engaging and fun, not overly academic
- Each question worth 5 points

Return ONLY valid JSON (no markdown, no explanations):
{
  "questions": [
    {
      "id": "q1",
      "type": "multiple-choice",
      "question": "What was the main character's goal in the story?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctAnswer": "Option A",
      "explanation": "Brief explanation of why this is correct",
      "points": 5
    },
    {
      "id": "q2",
      "type": "true-false",
      "question": "The hero found a magic key in the castle.",
      "correctAnswer": "true",
      "explanation": "The key was found in Scene 3",
      "points": 5
    }
  ]
}`;

      try {
        const quizResponse = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "x-api-key": ANTHROPIC_API_KEY,
            "anthropic-version": "2023-06-01",
            "content-type": "application/json",
          },
          body: JSON.stringify({
            model: "claude-sonnet-4-20250514", // Quiz always uses Sonnet for quality
            max_tokens: 2000,
            messages: [{ role: "user", content: quizPrompt }],
          }),
        });

        if (!quizResponse.ok) {
          const errText = await quizResponse.text();
          console.error("Quiz generation error:", quizResponse.status, errText);
          return new Response(JSON.stringify({ error: "Failed to generate quiz" }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const quizData = await quizResponse.json();
        const quizText = quizData?.content?.[0]?.text ?? "";
        const quizParsed = extractJSON(quizText);

        if (!hasQuizQuestions(quizParsed)) {
          console.error("Invalid quiz response format");
          return new Response(JSON.stringify({ error: "Invalid quiz format" }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        return new Response(JSON.stringify(quizParsed), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } catch (error) {
        console.error("Quiz generation error:", error);
        return new Response(JSON.stringify({ error: "Quiz generation failed" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Validate request structure and content
    if (!validateRequestSize(body)) {
      return new Response(JSON.stringify({ error: "Request payload too large" }), {
        status: 413,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Extract device ID and IP address for rate limiting
    const deviceId = req.headers.get("x-device-id") || body?.device_id || "anonymous";
    const ipAddress = req.headers.get("x-forwarded-for")?.split(",")[0] || req.headers.get("x-real-ip") || "unknown";

    // === SERVER-SIDE STORY LIMIT ENFORCEMENT ===
    // Check if this is a new story (no scene context = first scene)
    const isNewStory = !body?.scene;
    let deviceFingerprint: string | null = null;

    // === GUEST DEMO ONE-SHOT LIMIT (server-enforced) ===
    if (isGuest && isNewStory) {
      const userAgent = req.headers.get("user-agent") || "unknown";
      const ipPrefix = ipAddress.split(".").slice(0, 3).join(".");
      const salt = Deno.env.get("DEVICE_FINGERPRINT_SALT") || "default-salt";
      const guestRaw = `guest:${salt}:${userAgent}:${ipPrefix}`;
      const guestHashBuf = await crypto.subtle.digest(
        "SHA-256",
        new TextEncoder().encode(guestRaw),
      );
      const guestFp = Array.from(new Uint8Array(guestHashBuf))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");

      const { data: existing, error: guestSelErr } = await supabaseAdmin
        .from("guest_demo_usage")
        .select("fingerprint")
        .eq("fingerprint", guestFp)
        .maybeSingle();

      if (guestSelErr) {
        console.error("Guest demo lookup failed:", guestSelErr);
      }

      if (existing) {
        console.warn(`🚫 Guest demo already used for fp ${guestFp.slice(0, 12)}...`);
        return new Response(
          JSON.stringify({
            error: "demo_used",
            message: "You've already tried your free demo. Sign up to keep playing!",
          }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      const { error: guestInsErr } = await supabaseAdmin
        .from("guest_demo_usage")
        .insert({ fingerprint: guestFp, ip_prefix: ipPrefix, user_agent: userAgent });
      if (guestInsErr) {
        console.error("Guest demo insert failed:", guestInsErr);
      }
    }

    if (isNewStory && !isGuest) {
      // Detect mobile/native client — hard paywall after 1 free story applies to native only
      const isNativeClient = body?.platform === "native" || body?.platform === "ios" || body?.platform === "android";

      // Count stories started by this user in the last 30 days (used for web cap + soft cap)
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const { count: storyCount, error: countErr } = await supabaseAdmin
        .from("user_stories")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)
        .gte("started_at", thirtyDaysAgo);

      if (countErr) {
        console.error("Failed to count user stories:", countErr);
      }

      const userStoryCount = storyCount ?? 0;

      // For native: count LIFETIME stories (hard paywall after 1)
      let lifetimeStoryCount = userStoryCount;
      if (isNativeClient) {
        const { count: lifeCount, error: lifeErr } = await supabaseAdmin
          .from("user_stories")
          .select("*", { count: "exact", head: true })
          .eq("user_id", userId);
        if (lifeErr) console.error("Failed to count lifetime stories:", lifeErr);
        lifetimeStoryCount = lifeCount ?? 0;
      }

      // Check if user has an active subscription
      const { data: activeSub } = await supabaseAdmin
        .from("user_subscriptions")
        .select("id, status, plan_id")
        .eq("user_id", userId)
        .eq("status", "active")
        .limit(1)
        .maybeSingle();

      const FREE_STORY_LIMIT_WEB = 3;
      const FREE_STORY_LIMIT_NATIVE = 0; // Hard paywall on native — subscription required to generate.
      const PREMIUM_SOFT_CAP = 40;

      if (!activeSub && isNativeClient && lifetimeStoryCount >= FREE_STORY_LIMIT_NATIVE) {
        console.warn(`Native paywall: user ${userId} has ${lifetimeStoryCount} lifetime stories (subscription required)`);
        return new Response(
          JSON.stringify({ error: "paywall_required", message: "Adventure Pass required to start a new story." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      if (!activeSub && !isNativeClient && userStoryCount >= FREE_STORY_LIMIT_WEB) {
        console.warn(`Web story limit reached for user ${userId}: ${userStoryCount}/${FREE_STORY_LIMIT_WEB}`);
        return new Response(
          JSON.stringify({ error: "Story limit reached. Upgrade to Adventure Pass for stories your child will want to come back to every day." }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      if (activeSub && userStoryCount >= PREMIUM_SOFT_CAP) {
        console.warn(`Premium soft cap reached for user ${userId}: ${userStoryCount}/${PREMIUM_SOFT_CAP}`);
        return new Response(
          JSON.stringify({ error: `You've reached ${PREMIUM_SOFT_CAP} stories in the last 30 days. Take a break and come back tomorrow — your stories reset on a rolling 30-day basis.` }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      // === DEVICE FINGERPRINT ANTI-ABUSE CHECK ===
      const userAgent = req.headers.get("user-agent") || "unknown";
      const ipPrefix = ipAddress.split(".").slice(0, 3).join("."); // /24 prefix only
      const salt = Deno.env.get("DEVICE_FINGERPRINT_SALT") || "default-salt";

      const fingerprintRaw = `${salt}:${deviceId}:${userAgent}:${ipPrefix}`;
      const hashBuffer = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(fingerprintRaw));
      deviceFingerprint = Array.from(new Uint8Array(hashBuffer))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");

      if (!activeSub) {
        // Count stories across ALL accounts from this device fingerprint
        const { count: deviceStoryCount, error: deviceCountErr } = await supabaseAdmin
          .from("user_stories")
          .select("*", { count: "exact", head: true })
          .eq("device_fingerprint", deviceFingerprint)
          .gte("started_at", thirtyDaysAgo);

        if (deviceCountErr) {
          console.error("Failed to count device stories:", deviceCountErr);
        }

        const deviceTotal = deviceStoryCount ?? 0;

        if (deviceTotal >= 6) {
          console.warn(
            `🚫 Device abuse blocked: fingerprint ${deviceFingerprint.slice(0, 12)}... has ${deviceTotal} stories across accounts`,
          );
          return new Response(
            JSON.stringify({ error: "Story limit reached. Upgrade to Adventure Pass for stories your child will want to come back to every day." }),
            { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
          );
        } else if (deviceTotal >= 3) {
          console.warn(
            `⚠️ Device abuse warning: fingerprint ${deviceFingerprint.slice(0, 12)}... has ${deviceTotal} stories across accounts`,
          );
        }
      }

      console.log(
        `📊 User ${userId}: ${userStoryCount} stories in 30 days, subscription: ${activeSub ? "active" : "none"}, device fingerprint: ${deviceFingerprint?.slice(0, 12)}...`,
      );
    }

    // Determine model based on total stories started by this user.
    // Guests always get Haiku. Continuation scenes reuse the cached choice
    // (model is stable within a story for a user).
    const isNewStoryForModel = !body?.scene;
    let selectedModel = isGuest ? "claude-haiku-4-5-20251001" : "claude-sonnet-4-20250514";

    if (!isGuest) {
      const cachedModel = userModelCache.get(userId);
      if (cachedModel && Date.now() < cachedModel.expiresAt && !isNewStoryForModel) {
        selectedModel = cachedModel.model;
      } else if (isNewStoryForModel) {
        try {
          const { count, error: countError } = await supabaseAdmin
            .from("user_stories")
            .select("*", { count: "exact", head: true })
            .eq("user_id", userId);
          if (!countError && count !== null && count >= 20) {
            selectedModel = "claude-haiku-4-5-20251001";
            console.log(`📊 User ${userId} has ${count} stories - using Haiku 4.5`);
          } else {
            console.log(`📊 User ${userId} has ${count ?? 0} stories - using Sonnet`);
          }
        } catch (modelErr) {
          console.warn("Failed to check story count for model selection, defaulting to Sonnet:", modelErr);
        }
        userModelCache.set(userId, { model: selectedModel, expiresAt: Date.now() + USER_MODEL_TTL_MS });
      } else if (cachedModel) {
        // Expired but continuation — keep the cached model rather than re-querying mid-story.
        selectedModel = cachedModel.model;
      }
    }

    // Apply rate limiting with IP-based backup
    if (!rateLimit(deviceId, ipAddress)) {
      return new Response(
        JSON.stringify({ error: "Rate limit exceeded. Please wait before making another request." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Validate profile data
    if (!validateProfileData(body?.profile)) {
      return new Response(JSON.stringify({ error: "Invalid profile data" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const profile = body?.profile ?? {};
    const scene = body?.scene ?? null; // optional current scene context
    const sceneCount = Number(body?.scene_count ?? 1);
    const megastory = Boolean(body?.megastory ?? false);
    // Token budgets — narrative target ~215 words, but JSON schema + memory flags
    // can push total output past 3.5k chars. Keep headroom so responses don't truncate.
    const getOptimalTokens = (sceneCount: number, isNewStory: boolean) => {
      if (isNewStory) return 2000;
      if (sceneCount >= 12) return 1800;
      return 1800;
    };
    const max_tokens = Math.min(Number(body?.max_tokens ?? getOptimalTokens(sceneCount, !scene)), 4000);

    const abilities = body?.abilities || [];
    const abilityContext =
      abilities.length > 0
        ? `\n\n🔐 PLAYER HAS UNLOCKED ABILITIES:
${abilities.join(", ")}

When generating choices, include ONE "Secret Choice" that requires one of these abilities. Secret Choices should:
- Have type: "secret"
- Have requiresAbility set to one of the ability categories the player has
- Offer a uniquely powerful, creative, or advantageous option
- Make the player feel rewarded for earning abilities
- Be clearly more interesting than standard choices`
        : "";

    const inventoryContext =
      profile.inventory && profile.inventory.length > 0
        ? `\nCurrent Inventory: ${profile.inventory.map((item: any) => `${item.name} (${item.type})`).join(", ")}`
        : "\nInventory: Empty";

    const profileSummary = `Player Profile:
- Hero Name: ${profile.name || "the hero"}
- Age: ${profile.age ?? "unknown"}
- Lexile Score: ${profile.lexileScore ?? 500}L
- Interest: ${(profile.selectedBadges || []).join(", ") || "none"}${profile.interests ? `\n- Personal Interests: ${profile.interests}` : ""}
- Mode: ${profile.mode ?? "unknown"}
- Story Length: ${profile.storyLength ?? "medium"}${profile.topic ? `\n- Topic: ${profile.topic}` : ""}${inventoryContext}`;

    const sceneContext = scene ? `\nContinue from: ${JSON.stringify(scene)}` : "\nCreate a new adventure opening.";
    // Dynamic story progression based on selected length
    const getStoryProgressContext = () => {
      const storyLength = profile.storyLength || "medium";
      let endScene, conclusionScene;

      switch (storyLength) {
        case "short":
          endScene = 5;
          conclusionScene = 4;
          break;
        case "epic":
          endScene = 12;
          conclusionScene = 9;
          break;
        case "medium":
        default:
          endScene = 8;
          conclusionScene = 6;
          break;
      }

      const progressMessage =
        sceneCount >= endScene
          ? " END THE STORY NOW with a satisfying conclusion."
          : sceneCount >= conclusionScene
            ? " Build toward the climactic finale - story should end within the next 1-2 scenes."
            : "";

      return `\nSTORY PROGRESS: This is scene ${sceneCount} of a ${storyLength} story (${storyLength === "short" ? "4-5" : storyLength === "epic" ? "10-12" : "6-8"} scenes total).${progressMessage}`;
    };

    const storyProgressContext = getStoryProgressContext();

    // Optimized learning mode instructions (compressed for speed)
    const learningModeInstructions =
      profile.mode === "learning"
        ? `
LEARNING: Age ${profile.age} - ${profile.age <= 7 ? "Basic math/letters via puzzles" : profile.age <= 9 ? "Math/science/reading challenges" : "Advanced concepts through gameplay"}. ${profile.topic ? `Focus: ${profile.topic}` : ""}`
        : "";

    // Restructured prompt: Profile requirements FIRST and prominent
    const contextSize = scene ? "CONTINUATION" : "NEW STORY";
    const modeLower = (profile.mode ?? "").toString().toLowerCase();
    const modeToneInstruction =
      modeLower === "comedy" || modeLower === "fun"
        ? "🎭 COMEDY MODE - Make everything silly, funny, and ridiculous! Use wacky situations, goofy characters, playful language, absurd humor. The story should make kids LAUGH and GIGGLE, NOT feel suspense or danger. Think cartoon comedy!"
        : modeLower === "thrill"
          ? "⚡ THRILL MODE - High-stakes, urgent, time-sensitive danger and intense action. Keep tension HIGH every scene with clear stakes and ticking-clock urgency."
          : modeLower === "mystery"
            ? "🔍 MYSTERY MODE - Suspenseful, clue-driven investigation with slow tension. Every scene should reveal a clue or deepen the puzzle."
            : modeLower === "explore"
              ? "🗺️ EXPLORE MODE - Imaginative, wonder-filled, open-ended discovery. Emphasize awe, new places, and curious choices."
              : modeLower === "learning"
                ? "📚 LEARNING MODE - Embed educational challenges that affect story consequences."
                : "Adventure-focused";

    const profileBlock = `=== CRITICAL PLAYER PROFILE (MUST FOLLOW EXACTLY) ===

${profileSummary}

⚠️ MANDATORY REQUIREMENTS:
- PROTAGONIST NAME: ${profile.name || "the hero"} - Use this as the main character's name throughout the story. Refer to the protagonist by this name in the narrative and choices. Make the player feel like THEY are the hero.
- AGE ${profile.age ?? "unknown"}: Use ${profile.age && profile.age <= 7 ? "simple, clear vocabulary for young readers" : profile.age && profile.age <= 10 ? "age-appropriate vocabulary with moderate complexity" : "advanced vocabulary and complex themes"}
- LEXILE SCORE ${profile.lexileScore ?? 500}L: ${(profile.lexileScore ?? 500) <= 400 ? "Use simple vocabulary (common words), short sentences (5-10 words), single-idea paragraphs, and very clear structure" : (profile.lexileScore ?? 500) <= 650 ? "Use moderate vocabulary with context clues, varied sentence lengths (8-15 words), and connected ideas" : (profile.lexileScore ?? 500) <= 900 ? "Use rich vocabulary, compound-complex sentences, multiple story threads, and emotional depth" : "Use advanced vocabulary, sophisticated structures, layered narratives, and nuanced themes"}
- INTERESTS/BADGES: ${(profile.selectedBadges || []).join(", ") || "general"} - Story MUST incorporate these themes prominently
- **QUEST MODE "${profile.mode ?? "unknown"}" - THIS IS YOUR PRIMARY TONE**: ${modeToneInstruction}
- STORY LENGTH: ${profile.storyLength ?? "medium"} story${profile.topic ? `\n- TOPIC: ${profile.topic} - weave this into the narrative` : ""}`;

    const continuationReinforcement = scene
      ? `\n\n🔁 CONTINUATION REMINDER: MAINTAIN THE EXACT SAME mode tone (${profile.mode ?? "unknown"}), age (${profile.age ?? "unknown"}), Lexile (${profile.lexileScore ?? 500}L), badges (${(profile.selectedBadges || []).join(", ") || "general"}), and protagonist name (${profile.name || "the hero"}) as defined above. Do NOT drift in tone, vocabulary, or character voice from previous scenes.`
      : "";

    // Stable prefix — same for every scene in this story; eligible for prompt cache.
    const stablePrefix = `${profileBlock}

=== RESPONSE FORMAT ===
Return ONLY valid JSON (no markdown, no explanations):
{"sceneTitle":"...","hud":{"energy":0-100,"time":"...","choicePoints":0-50,"ui":["..."]},"narrative":"...","choices":[{"id":"a","text":"...","type":"standard|item_use|object_interact|secret","createsFlag":"...","requires":[],"requiresItem":"...","consumesItem":true,"requiresAbility":"..."}],"interactiveObjects":[{"id":"...","name":"...","description":"...","actions":["Examine","Search"],"requiresItem":"..."}],"itemsFound":[{"id":"...","name":"...","description":"...","type":"key|tool|consumable|document|weapon|potion","usable":true,"consumable":false}],"memory":{"flags":[],"pastChoices":[]},"end":false}

SCENE REQUIREMENTS:
- Use the protagonist's name (${profile.name || "the hero"}) naturally in the narrative and address them directly
- 3-4 compelling choices that matter, each with a distinct personality tone
- Narrative: 215 words max, formatted in 3-4 paragraphs with \\n\\n breaks
- Incorporate interactive objects/items when appropriate
- Include memory flags for meaningful choices
${profile.mode === "learning" ? "- Embed educational content naturally into the story" : ""}
- Ensure story reflects ALL profile requirements listed above`;

    // Dynamic tail — changes per scene; not cached.
    const dynamicTail = `${continuationReinforcement}
${sceneContext}
${storyProgressContext}
${learningModeInstructions}
${inventoryContext}
${abilityContext}

THIS SCENE: ${scene ? "Continue the story naturally from the previous scene." : `Open with an immediate action hook that establishes setting, character, and conflict. Introduce ${profile.name || "the hero"} as the protagonist.`}`;

    // Log profile for validation
    console.log(`Story generation request: ${max_tokens} tokens, scene ${sceneCount}`);
    console.log(
      `Profile validation - Age: ${profile.age}, Lexile: ${profile.lexileScore}L, Badges: ${(profile.selectedBadges || []).join(", ")}, Mode: ${profile.mode}`,
    );

    // ---- Privacy-safe analytics: anonymous prompt hash + bucketed metadata ----
    // Hash is over NORMALIZED parameters only (mode + length + age bucket + scene #).
    // We never hash or store the user's name, topic, badges, or raw prompt text.
    const ageBucketForHash = (() => {
      const a = Number(profile?.age);
      if (!Number.isFinite(a)) return "unknown";
      if (a <= 7) return "5-7";
      if (a <= 10) return "8-10";
      return "11-13";
    })();
    let promptHash: string | null = null;
    try {
      const normalized = `${profile?.mode ?? ""}|${profile?.storyLength ?? "medium"}|${ageBucketForHash}|${sceneCount}`;
      const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(normalized));
      promptHash = Array.from(new Uint8Array(buf))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
    } catch {
      promptHash = null;
    }

    const anthropicStart = Date.now();
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: selectedModel,
        max_tokens,
        system: [
          { type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } },
        ],
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: stablePrefix, cache_control: { type: "ephemeral" } },
              { type: "text", text: dynamicTail },
            ],
          },
        ],
      }),
    });
    const latencyMs = Date.now() - anthropicStart;

    if (!response.ok) {
      const errText = await response.text();
      console.error("Anthropic API error:", response.status, errText);
      return new Response(JSON.stringify({ error: "Story generation service error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const text: string = data?.content?.[0]?.text ?? "";

    console.log("Story generation completed, length:", text.length);

    // ---- Privacy-safe analytics writes (aggregate, no identifiers) ----
    // We use an ephemeral session token derived from the request timestamp +
    // a small random value — NOT the user_id or device_id. The track-event
    // pipeline rejects identifiers, so we keep the same contract here.
    try {
      const sessionToken = `srv_${Date.now().toString(36)}_${crypto.randomUUID().slice(0, 8)}`;
      const tokensIn = Number(data?.usage?.input_tokens) || 0;
      const tokensOut = Number(data?.usage?.output_tokens) || 0;
      const themeCategory = typeof profile?.mode === "string"
        ? profile.mode.toLowerCase().replace(/[^a-z_-]/g, "").slice(0, 32)
        : null;
      const lengthBucket = ["short", "medium", "epic"].includes(profile?.storyLength)
        ? profile.storyLength
        : "medium";

      const rows = [
        {
          event_category: "system",
          event_name: "story_generated",
          session_token: sessionToken,
          meta: {
            scene_index_bucket:
              sceneCount === 1 ? "first" : sceneCount <= 2 ? "1-2" : sceneCount <= 5 ? "3-5" : sceneCount <= 10 ? "6-10" : "11+",
            is_first_scene: sceneCount === 1,
          },
        },
        {
          event_category: "performance",
          event_name: "story_latency",
          session_token: sessionToken,
          meta: {
            latency_ms: Math.min(120000, Math.max(0, latencyMs)),
            tokens_in: tokensIn,
            tokens_out: tokensOut,
            model: typeof data?.model === "string" ? data.model.slice(0, 64) : selectedModel,
          },
        },
        {
          event_category: "content",
          event_name: "story_started",
          session_token: sessionToken,
          meta: {
            length_bucket: lengthBucket,
            age_bucket: ageBucketForHash,
            theme_category: themeCategory,
          },
        },
        {
          event_category: "cache",
          event_name: "cache_miss", // server-generated = always a miss at API layer
          session_token: sessionToken,
          meta: { hit: false, prompt_hash: promptHash },
        },
      ];
      await supabaseAdmin.from("analytics_events").insert(rows);
      if (promptHash) {
        await supabaseAdmin.rpc("bump_prompt_hash", { _hash: promptHash, _hit: false });
      }
    } catch (analyticsErr) {
      // Never let analytics break the user response.
      console.warn("analytics write failed:", analyticsErr);
    }


    // Use enhanced JSON extraction
    const parsed = extractJSON(text);

    // Profile validation warning (for debugging)
    if (parsed && typeof parsed === "object") {
      const storyText = JSON.stringify(parsed).toLowerCase();
      const badges = profile.selectedBadges || [];
      const matchedBadges = badges.filter(
        (badge: string) =>
          storyText.includes(badge.toLowerCase()) || storyText.includes(badge.split(" ")[0].toLowerCase()),
      );

      if (badges.length > 0 && matchedBadges.length === 0) {
        console.warn(`⚠️ Profile validation warning: Story may not incorporate selected badges: ${badges.join(", ")}`);
      }

      if (profile.mode && !storyText.includes(profile.mode.toLowerCase())) {
        console.warn(`⚠️ Profile validation warning: Story may not match quest mode: ${profile.mode}`);
      }
    }

    if (!parsed) {
      console.error("Failed to parse JSON from response. Raw text length:", text.length);
      console.error("Response preview:", text.substring(0, 200));
      console.error("Response ending:", text.substring(Math.max(0, text.length - 200)));

      // Return error response for better debugging
      return new Response(
        JSON.stringify({
          error: "Failed to parse AI response as valid JSON",
          details: `Response was ${text.length} characters but could not be parsed`,
          preview: text.substring(0, 500),
        }),
        { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        ok: true,
        model: data?.model,
        usage: data?.usage ?? null,
        resultText: text,
        result: parsed,
        parsed: parsed,
        text: text,
        deviceFingerprint: deviceFingerprint,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("generate-story error:", error);
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
