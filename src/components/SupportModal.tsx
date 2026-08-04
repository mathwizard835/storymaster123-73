import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { LifeBuoy, Mail } from "lucide-react";

export const SUPPORT_EMAIL = "support@storymaster.app";

interface SupportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const SupportModal = ({ open, onOpenChange }: SupportModalProps) => {
  const mailto = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(
    "StoryMaster Kids — Support request"
  )}&body=${encodeURIComponent(
    "Hi StoryMaster team,\n\nHere's what I'm running into:\n\n"
  )}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
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

        <div className="space-y-3">
          <Button asChild className="w-full" size="lg">
            <a href={mailto}>
              <Mail className="h-4 w-4 mr-2" />
              Email {SUPPORT_EMAIL}
            </a>
          </Button>
          <p className="text-center text-xs text-muted-foreground">
            We typically reply within one business day.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SupportModal;
