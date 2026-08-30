import { useEffect, useMemo, useState } from "react";
import { Navigate, Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Seo } from "@/components/Seo";
import { useToast } from "@/hooks/use-toast";
import { Mail, RefreshCw, BarChart3, Send, Loader2 } from "lucide-react";

type SupportRequest = {
  id: string;
  user_id: string | null;
  name: string;
  email: string;
  message: string;
  app_version: string | null;
  device_info: string | null;
  page: string | null;
  status: string;
  admin_notes: string | null;
  replied_at: string | null;
  created_at: string;
};

type SupportReply = {
  id: string;
  request_id: string;
  to_email: string;
  subject: string;
  body: string;
  delivery_status: string;
  error_message: string | null;
  sent_at: string;
};


const STATUSES = [
  { value: "new", label: "New" },
  { value: "in_progress", label: "In progress" },
  { value: "resolved", label: "Resolved" },
] as const;

const statusLabel = (s: string) => STATUSES.find((x) => x.value === s)?.label ?? s;

const statusVariant = (s: string): "default" | "secondary" | "outline" =>
  s === "new" ? "default" : s === "in_progress" ? "secondary" : "outline";

const formatDate = (iso: string) =>
  new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

export default function AdminSupport() {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [requests, setRequests] = useState<SupportRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [noteDraft, setNoteDraft] = useState("");
  const [replyDraft, setReplyDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [replies, setReplies] = useState<Record<string, SupportReply[]>>({});
  const [saving, setSaving] = useState(false);


  // Admin gate (same pattern as /admin/analytics)
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
    return () => {
      cancelled = true;
    };
  }, [user]);

  const loadRequests = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: err } = await supabase
        .from("support_requests")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500);
      if (err) throw err;
      setRequests((data ?? []) as SupportRequest[]);
    } catch (e: any) {
      setError(e?.message ?? "Failed to load support requests");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isAdmin) return;
    loadRequests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin]);

  const counts = useMemo(() => {
    const base: Record<string, number> = { all: requests.length, new: 0, in_progress: 0, resolved: 0 };
    for (const r of requests) base[r.status] = (base[r.status] ?? 0) + 1;
    return base;
  }, [requests]);

  const visible = useMemo(
    () => (filter === "all" ? requests : requests.filter((r) => r.status === filter)),
    [requests, filter],
  );

  const selected = useMemo(
    () => requests.find((r) => r.id === selectedId) ?? null,
    [requests, selectedId],
  );

  const openRequest = (r: SupportRequest) => {
    setSelectedId(r.id);
    setNoteDraft(r.admin_notes ?? "");
  };

  const patchRequest = async (id: string, patch: Partial<SupportRequest>) => {
    setSaving(true);
    try {
      const { error: err } = await supabase.from("support_requests").update(patch).eq("id", id);
      if (err) throw err;
      setRequests((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } as SupportRequest : r)));
      return true;
    } catch (e: any) {
      toast({
        title: "Could not save",
        description: e?.message ?? "Please try again.",
        variant: "destructive",
      });
      return false;
    } finally {
      setSaving(false);
    }
  };

  const buildMailto = (r: SupportRequest) => {
    const subject = `Re: StoryMaster support`;
    const quoted = r.message
      .split("\n")
      .map((line) => `> ${line}`)
      .join("\n");
    const body = `Hi ${r.name || "there"},\n\n\n\n---\nYou wrote on ${formatDate(r.created_at)}:\n${quoted}`;
    return `mailto:${encodeURIComponent(r.email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  const handleReply = (r: SupportRequest) => {
    window.location.href = buildMailto(r);
    if (r.status === "new") patchRequest(r.id, { status: "in_progress" });
  };

  const saveNotes = async (r: SupportRequest, markResolved: boolean) => {
    const ok = await patchRequest(r.id, {
      admin_notes: noteDraft.trim() ? noteDraft.trim() : null,
      replied_at: new Date().toISOString(),
      status: markResolved ? "resolved" : r.status === "new" ? "in_progress" : r.status,
    });
    if (ok) toast({ title: markResolved ? "Marked resolved" : "Saved" });
  };

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
      <Seo title="Support Inbox — StoryMaster Admin" description="Review and respond to user support requests" />

      <header className="flex items-start justify-between gap-4 flex-wrap">
        <div className="min-w-0">
          <h1 className="text-3xl font-bold">Support Inbox</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {counts.new} open request{counts.new === 1 ? "" : "s"} needing a reply.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={loadRequests} disabled={loading}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link to="/admin/analytics">
              <BarChart3 className="h-4 w-4 mr-2" />
              Analytics
            </Link>
          </Button>
        </div>
      </header>

      <div className="flex gap-2 flex-wrap">
        {[{ value: "all", label: "All" }, ...STATUSES].map((s) => (
          <Button
            key={s.value}
            variant={filter === s.value ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter(s.value)}
          >
            {s.label} ({counts[s.value] ?? 0})
          </Button>
        ))}
      </div>

      {error && (
        <Card className="border-destructive">
          <CardContent className="pt-6 text-destructive text-sm">{error}</CardContent>
        </Card>
      )}

      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      ) : visible.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-sm text-muted-foreground">No requests here.</CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {visible.map((r) => {
            const isOpen = selectedId === r.id;
            return (
              <Card key={r.id} className="overflow-hidden">
                <CardHeader
                  className="cursor-pointer"
                  onClick={() => (isOpen ? setSelectedId(null) : openRequest(r))}
                >
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="min-w-0 flex-1">
                      <CardTitle className="text-base truncate">
                        {r.name} <span className="text-muted-foreground font-normal">· {r.email}</span>
                      </CardTitle>
                      <CardDescription className="mt-1 line-clamp-2 break-words">
                        {r.message}
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant={statusVariant(r.status)}>{statusLabel(r.status)}</Badge>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {formatDate(r.created_at)}
                      </span>
                    </div>
                  </div>
                </CardHeader>

                {isOpen && selected && (
                  <CardContent className="space-y-4 border-t pt-4">
                    <p className="text-sm whitespace-pre-wrap break-words">{r.message}</p>

                    <div className="grid gap-2 sm:grid-cols-2 text-xs text-muted-foreground">
                      <div className="break-words">App version: {r.app_version ?? "—"}</div>
                      <div className="break-words">Page: {r.page ?? "—"}</div>
                      <div className="break-words">User ID: {r.user_id ?? "guest"}</div>
                      <div className="break-words">Device: {r.device_info ?? "—"}</div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" onClick={() => handleReply(r)}>
                        <Mail className="h-4 w-4 mr-2" />
                        Reply by email
                      </Button>
                      {STATUSES.map((s) => (
                        <Button
                          key={s.value}
                          size="sm"
                          variant={r.status === s.value ? "secondary" : "outline"}
                          disabled={saving || r.status === s.value}
                          onClick={() => patchRequest(r.id, { status: s.value })}
                        >
                          {s.label}
                        </Button>
                      ))}
                    </div>

                    <div className="space-y-2">
                      <Textarea
                        value={noteDraft}
                        onChange={(e) => setNoteDraft(e.target.value)}
                        placeholder="Paste the reply you sent, or add internal notes…"
                        rows={4}
                        maxLength={4000}
                      />
                      <div className="flex flex-wrap gap-2">
                        <Button size="sm" variant="outline" disabled={saving} onClick={() => saveNotes(r, false)}>
                          Save notes
                        </Button>
                        <Button size="sm" disabled={saving} onClick={() => saveNotes(r, true)}>
                          Save & mark resolved
                        </Button>
                      </div>
                      {r.replied_at && (
                        <p className="text-xs text-muted-foreground">
                          Last updated {formatDate(r.replied_at)}
                        </p>
                      )}
                    </div>
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
