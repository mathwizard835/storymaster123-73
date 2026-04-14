import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useDevice } from "@/contexts/DeviceContext";
import { NativeNavigationHeader } from "@/components/NativeNavigationHeader";
import { SwipeBackIndicator } from "@/components/SwipeBackIndicator";
import { useSwipeBack } from "@/hooks/useSwipeBack";
import { addHapticFeedback } from "@/lib/mobileFeatures";
import { Seo } from "@/components/Seo";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { useState, useRef } from "react";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  User,
  Palette,
  Bell,
  Shield,
  LogOut,
  ChevronRight,
  Crown,
  Mail,
  HelpCircle,
  FileText,
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function Settings() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { isPhone, isNative } = useDevice();
  const scrollRef = useRef<HTMLDivElement>(null);
  const { swipeProgress } = useSwipeBack();

  const [notificationsEnabled, setNotificationsEnabled] = useState(() => {
    return localStorage.getItem("notifications-enabled") !== "false";
  });

  const [currentTheme, setCurrentTheme] = useState(() => {
    return localStorage.getItem("premium-theme") || "default";
  });

  const handleSignOut = async () => {
    addHapticFeedback("medium");
    await signOut();
    navigate("/");
  };

  const toggleNotifications = (enabled: boolean) => {
    addHapticFeedback("light");
    setNotificationsEnabled(enabled);
    localStorage.setItem("notifications-enabled", String(enabled));
  };

  const settingsSections = [
    {
      title: "Account",
      items: [
        {
          icon: User,
          label: "Story Profile",
          description: "Character name, badge & story preferences",
          action: () => { addHapticFeedback("light"); navigate("/profile"); },
          chevron: true,
        },
        {
          icon: Crown,
          label: "Adventure Pass",
          description: "Manage your subscription",
          action: () => { addHapticFeedback("light"); navigate("/subscription"); },
          chevron: true,
        },
        {
          icon: Mail,
          label: "Email",
          description: user?.email || "Not signed in",
          action: undefined,
          chevron: false,
        },
      ],
    },
    {
      title: "Preferences",
      items: [
        {
          icon: Bell,
          label: "Notifications",
          description: "Streak reminders & story updates",
          toggle: true,
          toggleValue: notificationsEnabled,
          onToggle: toggleNotifications,
        },
        {
          icon: Palette,
          label: "Theme",
          description: currentTheme === "default" ? "Default" : currentTheme.charAt(0).toUpperCase() + currentTheme.slice(1),
          action: () => { addHapticFeedback("light"); navigate("/dashboard"); },
          chevron: true,
        },
      ],
    },
    {
      title: "Family",
      items: [
        {
          icon: Shield,
          label: "Parent Dashboard",
          description: "View reading progress & stats",
          action: () => { addHapticFeedback("light"); navigate("/parent-dashboard"); },
          chevron: true,
        },
      ],
    },
    {
      title: "About",
      items: [
        {
          icon: HelpCircle,
          label: "Help & Support",
          description: "Get help with the app",
          action: () => { addHapticFeedback("light"); navigate("/support"); },
          chevron: true,
        },
        {
          icon: FileText,
          label: "Privacy Policy",
          action: () => { addHapticFeedback("light"); navigate("/privacy"); },
          chevron: true,
        },
        {
          icon: FileText,
          label: "Terms of Service",
          action: () => { addHapticFeedback("light"); navigate("/terms"); },
          chevron: true,
        },
      ],
    },
  ];

  return (
    <div
      ref={scrollRef}
      className={cn(
        "min-h-screen bg-background overflow-y-auto",
        isPhone && "pb-28"
      )}
    >
      <Seo title="Settings | StoryMaster Kids" description="Manage your StoryMaster Kids settings" />
      <SwipeBackIndicator progress={swipeProgress} />

      {isNative ? (
        <NativeNavigationHeader
          title="Settings"
          scrollRef={scrollRef}
          leftAction={
            <button onClick={() => { addHapticFeedback("light"); navigate(-1); }} className="p-1">
              <ArrowLeft className="h-5 w-5 text-primary" />
            </button>
          }
        />
      ) : (
        <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border/50">
          <div className="max-w-lg mx-auto flex items-center gap-3 px-4 py-3">
            <button onClick={() => navigate(-1)} className="p-1">
              <ArrowLeft className="h-5 w-5 text-primary" />
            </button>
            <h1 className="font-heading text-xl font-bold">Settings</h1>
          </div>
        </div>
      )}

      <div className="max-w-lg mx-auto px-4 py-4 space-y-6">
        {settingsSections.map((section, sIdx) => (
          <motion.div
            key={section.title}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: sIdx * 0.05, duration: 0.3 }}
          >
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-1">
              {section.title}
            </p>
            <Card className="overflow-hidden">
              <CardContent className="p-0">
                {section.items.map((item, iIdx) => {
                  const Icon = item.icon;
                  const isLast = iIdx === section.items.length - 1;

                  return (
                    <div key={item.label}>
                      <button
                        onClick={item.action}
                        disabled={!item.action && !("toggle" in item)}
                        className={cn(
                          "w-full flex items-center gap-3 px-4 py-3.5 text-left transition-colors",
                          item.action && "active:bg-muted/50"
                        )}
                      >
                        <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                          <Icon className="h-4 w-4 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground">{item.label}</p>
                          {item.description && (
                            <p className="text-xs text-muted-foreground truncate">{item.description}</p>
                          )}
                        </div>
                        {"toggle" in item && item.toggle ? (
                          <Switch
                            checked={item.toggleValue}
                            onCheckedChange={item.onToggle}
                            onClick={(e) => e.stopPropagation()}
                          />
                        ) : item.chevron ? (
                          <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        ) : null}
                      </button>
                      {!isLast && <Separator className="ml-15" />}
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </motion.div>
        ))}

        {/* Sign Out */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: settingsSections.length * 0.05, duration: 0.3 }}
        >
          <Button
            variant="outline"
            className="w-full border-destructive/30 text-destructive hover:bg-destructive/10"
            onClick={handleSignOut}
          >
            <LogOut className="h-4 w-4 mr-2" />
            Sign Out
          </Button>
        </motion.div>

        <p className="text-center text-xs text-muted-foreground pb-4">
          StoryMaster Kids v1.0.0
        </p>
      </div>
    </div>
  );
}
