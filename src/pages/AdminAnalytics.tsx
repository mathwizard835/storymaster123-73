import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Seo } from "@/components/Seo";

type Rollup = {
  window: { days: number; since: string };
  system: {
    stories_generated_total: number;
    stories_served_from_cache_total: number;
    stories_generated_new_total: number;
    active_sessions_total: number;
    avg_stories_per_session: number;
    cache_hit_rate: number;
  };
  performance: {
    avg_story_generation_latency_ms: number;
    p95_latency_ms: number;
    estimated_cost_total_usd: number;
    estimated_cost_per_story_usd: number;
    model_usage_breakdown: Record<string, number>;
  };
  subscription: {
    total_active_subscriptions: number;
    events_in_window: Record<string, number>;
    subscription_type_distribution: Record<string, number>;
  };
  content: {
    story_length_distribution: Record<string, number>;
    prompt_category_distribution: Record<string, number>;
    age_bucket_usage: Record<string, number>;
  };
  cache: {
    cache_hit_rate_over_time: Array<{ date: string; hit_rate: number; hits: number; misses: number }>;
    cache_misses_total: number;
    top_cached_prompt_hashes: Array<{ hash: string; count: number }>;
  };
  funnel?: {
    step_counts: Record<string, number>;
    conversion_rates: {
      app_to_story_started: number | null;
      story_started_to_completed: number | null;
      completed_to_paywall: number | null;
      paywall_to_parent_gate: number | null;
      parent_gate_to_subscription: number | null;
    };
    average_conversion_rate: number | null;
  };
};

const DAY_OPTIONS = [1, 7, 30];

export default function AdminAnalytics() {
  const { user, loading: authLoading } = useAuth();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [days, setDays] = useState<number>(7);
  const [data, setData] = useState<Rollup | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check admin role
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .maybeSingle();
      if (!cancelled) setIsAdmin(!!roles);
    })();
    return () => { cancelled = true; };
  }, [user]);

  // Fetch aggregate metrics
  useEffect(() => {
    if (!isAdmin) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    (async () => {
      try {
        const { data: result, error: invErr } = await supabase.functions.invoke(
          "analytics-rollup",
          { body: {}, method: "GET" as any },
        );
        // supabase-js doesn't support GET via invoke uniformly; fall back to fetch
        let payload = result as Rollup | null;
        if (invErr || !payload) {
          const session = await supabase.auth.getSession();
          const token = session.data.session?.access_token;
          const projectRef = "lwxaqxxuednuwflojlfc";
          const res = await fetch(
            `https://${projectRef}.supabase.co/functions/v1/analytics-rollup?days=${days}`,
            { headers: { Authorization: `Bearer ${token}` } },
          );
          if (!res.ok) throw new Error(`request failed (${res.status})`);
          payload = (await res.json()) as Rollup;
        }
        if (!cancelled) setData(payload);
      } catch (err: any) {
        if (!cancelled) setError(err?.message ?? "Failed to load metrics");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [isAdmin, days]);

  if (authLoading || isAdmin === null) {
    return (
      <div className="container mx-auto p-6 space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" replace />;
  if (!isAdmin) return <Navigate to="/dashboard" replace />;

  return (
    <div className="container mx-auto p-6 space-y-6 max-w-6xl">
      <Seo title="Admin Analytics — StoryMaster" description="Aggregate, privacy-safe analytics dashboard" />

      <header className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold">System Analytics</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Aggregate, anonymized metrics only. No per-child behavior or identifiers are stored.
          </p>
        </div>
        <div className="flex gap-2">
          {DAY_OPTIONS.map((d) => (
            <Button
              key={d}
              variant={days === d ? "default" : "outline"}
              size="sm"
              onClick={() => setDays(d)}
            >
              {d === 1 ? "24h" : `${d}d`}
            </Button>
          ))}
        </div>
      </header>

      {error && (
        <Card className="border-destructive">
          <CardContent className="pt-6 text-destructive text-sm">{error}</CardContent>
        </Card>
      )}

      {loading || !data ? (
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
        </div>
      ) : (
        <div className="space-y-6">
          {/* System usage */}
          <Card>
            <CardHeader>
              <CardTitle>System usage</CardTitle>
              <CardDescription>Aggregate counts over the last {data.window.days} day(s)</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <Metric label="Stories generated" value={data.system.stories_generated_total} />
              <Metric label="From cache" value={data.system.stories_served_from_cache_total} />
              <Metric label="Newly generated" value={data.system.stories_generated_new_total} />
              <Metric label="Active sessions" value={data.system.active_sessions_total} />
              <Metric label="Avg stories / session" value={data.system.avg_stories_per_session} />
              <Metric label="Cache hit rate" value={`${(data.system.cache_hit_rate * 100).toFixed(1)}%`} />
            </CardContent>
          </Card>

          {/* Performance + cost */}
          <Card>
            <CardHeader>
              <CardTitle>Performance &amp; cost</CardTitle>
              <CardDescription>Latency and estimated spend (system-wide)</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <Metric label="Avg latency" value={`${data.performance.avg_story_generation_latency_ms} ms`} />
              <Metric label="p95 latency" value={`${data.performance.p95_latency_ms} ms`} />
              <Metric label="Estimated cost" value={`$${data.performance.estimated_cost_total_usd.toFixed(2)}`} />
              <Metric label="Cost / story" value={`$${data.performance.estimated_cost_per_story_usd.toFixed(4)}`} />
              <div className="col-span-2 md:col-span-3">
                <p className="text-xs text-muted-foreground mb-2">Model usage</p>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(data.performance.model_usage_breakdown).map(([m, n]) => (
                    <Badge key={m} variant="secondary">{m}: {n}</Badge>
                  ))}
                  {Object.keys(data.performance.model_usage_breakdown).length === 0 && (
                    <span className="text-sm text-muted-foreground">No data</span>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Subscriptions */}
          <Card>
            <CardHeader>
              <CardTitle>Subscriptions</CardTitle>
              <CardDescription>Parent-level metrics only</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Metric label="Active subscriptions" value={data.subscription.total_active_subscriptions} />
              <Metric label="New (in window)" value={data.subscription.events_in_window.started ?? 0} />
              <Metric label="Renewed" value={data.subscription.events_in_window.renewed ?? 0} />
              <Metric label="Churned" value={data.subscription.events_in_window.churned ?? 0} />
              <div className="col-span-2 md:col-span-4">
                <p className="text-xs text-muted-foreground mb-2">Plan distribution</p>
                <Distribution map={data.subscription.subscription_type_distribution} />
              </div>
            </CardContent>
          </Card>

          {/* Content */}
          <Card>
            <CardHeader>
              <CardTitle>Content</CardTitle>
              <CardDescription>Theme, length, and age-bucket distributions (no individual mapping)</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <DistributionBlock title="Story length" map={data.content.story_length_distribution} />
              <DistributionBlock title="Theme category" map={data.content.prompt_category_distribution} />
              <DistributionBlock title="Age bucket" map={data.content.age_bucket_usage} />
            </CardContent>
          </Card>

          {/* Cache */}
          <Card>
            <CardHeader>
              <CardTitle>Cache</CardTitle>
              <CardDescription>Hit rate over time and most-reused prompt templates (anonymous hashes)</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-xs text-muted-foreground mb-2">Hit rate by day</p>
                <div className="flex flex-wrap gap-2">
                  {data.cache.cache_hit_rate_over_time.map((d) => (
                    <Badge key={d.date} variant="outline" className="font-mono text-xs">
                      {d.date}: {(d.hit_rate * 100).toFixed(0)}% ({d.hits}/{d.hits + d.misses})
                    </Badge>
                  ))}
                  {data.cache.cache_hit_rate_over_time.length === 0 && (
                    <span className="text-sm text-muted-foreground">No data</span>
                  )}
                </div>
              </div>
              <Metric label="Cache misses (total)" value={data.cache.cache_misses_total} />
              <div>
                <p className="text-xs text-muted-foreground mb-2">Top cached prompt hashes (anonymous frequency only)</p>
                <div className="space-y-1 font-mono text-xs">
                  {data.cache.top_cached_prompt_hashes.slice(0, 10).map((h) => (
                    <div key={h.hash} className="flex justify-between border-b border-border/50 py-1">
                      <span className="truncate mr-2">{h.hash.slice(0, 16)}…</span>
                      <span>{h.count}</span>
                    </div>
                  ))}
                  {data.cache.top_cached_prompt_hashes.length === 0 && (
                    <span className="text-sm text-muted-foreground font-sans">No data</span>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-2xl font-semibold mt-1">{value}</p>
    </div>
  );
}

function Distribution({ map }: { map: Record<string, number> }) {
  const entries = Object.entries(map);
  if (entries.length === 0) return <span className="text-sm text-muted-foreground">No data</span>;
  return (
    <div className="flex flex-wrap gap-2">
      {entries.map(([k, v]) => (
        <Badge key={k} variant="secondary">{k}: {v}</Badge>
      ))}
    </div>
  );
}

function DistributionBlock({ title, map }: { title: string; map: Record<string, number> }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground mb-2">{title}</p>
      <Distribution map={map} />
    </div>
  );
}
