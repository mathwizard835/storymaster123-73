import { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { LifeBuoy, Mail, Loader2, CheckCircle2 } from "lucide-react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

export const SUPPORT_EMAIL = "support@storymaster.app";
export const APP_VERSION = "1.0.0";

interface SupportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const supportSchema = z.object({
  name: z
    .string()
    .trim()
    .nonempty({ message: "Please enter your name" })
    .max(100, { message: "Name must be less than 100 characters" }),
  email: z
    .string()
    .trim()
    .email({ message: "Please enter a valid email address" })
    .max(255, { message: "Email must be less than 255 characters" }),
  message: z
    .string()
    .trim()
    .nonempty({ message: "Please describe the issue" })
    .max(2000, { message: "Message must be less than 2000 characters" }),
});

export const SupportModal = ({ open, onOpenChange }: SupportModalProps) => {
  const { user } = useAuth();
  const { toast } = useToast();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Prefill the email field for signed-in users.
  useEffect(() => {
    if (open && user?.email) {
      setEmail((prev) => prev || user.email || "");
    }
  }, [open, user?.email]);

  // Reset the success state whenever the modal is reopened.
  useEffect(() => {
    if (open) setSubmitted(false);
  }, [open]);

  // Debug metadata collected automatically so bug reports are actionable.
  const debug = useMemo(() => {
    const deviceInfo =
      typeof navigator !== "undefined"
        ? `${navigator.userAgent} | ${window.screen?.width ?? "?"}x${
            window.screen?.height ?? "?"
          } @${window.devicePixelRatio ?? 1}x`
        : "unknown";
    const page =
      typeof window !== "undefined"
        ? `${window.location.pathname}${window.location.search}`
        : "unknown";
    return {
      appVersion: APP_VERSION,
      userId: user?.id ?? "not signed in",
      deviceInfo,
      page,
    };
  }, [user?.id, open]);

  const debugBlock = `\n\n---\nDiagnostics (auto-attached)\nApp version: ${debug.appVersion}\nUser ID: ${debug.userId}\nPage: ${debug.page}\nDevice: ${debug.deviceInfo}`;

  const mailto = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(
    "StoryMaster Kids — Support request"
  )}&body=${encodeURIComponent(
    `Hi StoryMaster team,\n\nHere's what I'm running into:\n\n${message}${debugBlock}`
  )}`;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = supportSchema.safeParse({ name, email, message });
    if (!result.success) {
      toast({
        title: "Check your details",
        description: result.error.errors[0]?.message,
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase.from("support_requests").insert({
        user_id: user?.id ?? null,
        name: result.data.name,
        email: result.data.email,
        message: result.data.message,
        app_version: debug.appVersion,
        device_info: debug.deviceInfo,
        page: debug.page,
      });
      if (error) throw error;

      setSubmitted(true);
      setMessage("");
    } catch (err) {
      console.error("Support request failed", err);
      toast({
        title: "Couldn't send your message",
        description: "Please use the email button below instead.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="mx-auto mb-2 w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
            <LifeBuoy className="h-6 w-6 text-primary" />
          </div>
          <DialogTitle className="text-center">Help &amp; Support</DialogTitle>
          <DialogDescription className="text-center">
            Encountering an issue? We're here to help! Send us a direct message and our team
            will get back to you shortly.
          </DialogDescription>
        </DialogHeader>

        {submitted ? (
          <div className="space-y-4 text-center">
            <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <CheckCircle2 className="h-6 w-6 text-primary" />
            </div>
            <p className="text-sm text-foreground font-medium">Message sent!</p>
            <p className="text-xs text-muted-foreground">
              We typically reply within one business day.
            </p>
            <Button variant="outline" className="w-full" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </div>
        ) : (
          <>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="support-name">Name</Label>
                <Input
                  id="support-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={100}
                  placeholder="Your name"
                  autoComplete="name"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="support-email">Email</Label>
                <Input
                  id="support-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  maxLength={255}
                  placeholder="you@example.com"
                  autoComplete="email"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="support-message">Message</Label>
                <Textarea
                  id="support-message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  maxLength={2000}
                  rows={4}
                  placeholder="Tell us what happened…"
                />
              </div>

              <p className="text-[11px] text-muted-foreground leading-relaxed">
                We automatically attach your app version, page, and device info so we can
                troubleshoot faster.
              </p>

              <Button type="submit" className="w-full" size="lg" disabled={submitting}>
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Sending…
                  </>
                ) : (
                  "Send Message"
                )}
              </Button>
            </form>

            <div className="pt-1 space-y-2">
              <Button asChild variant="outline" className="w-full">
                <a href={mailto}>
                  <Mail className="h-4 w-4 mr-2" />
                  Or email {SUPPORT_EMAIL}
                </a>
              </Button>
              <p className="text-center text-xs text-muted-foreground">
                We typically reply within one business day.
              </p>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default SupportModal;
