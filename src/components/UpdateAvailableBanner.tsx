import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { startVersionCheck, markUpdateReload, recentlyReloadedForUpdate } from "@/lib/versionCheck";

/**
 * Detects a newer deployed build and reloads the app so users always run the
 * latest bug fixes. Shows a short banner first so the reload is never abrupt.
 */
export const UpdateAvailableBanner = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const stop = startVersionCheck(() => {
      if (recentlyReloadedForUpdate()) return;
      setVisible(true);
    });
    return stop;
  }, []);

  useEffect(() => {
    if (!visible) return;
    const t = setTimeout(() => {
      markUpdateReload();
      window.location.reload();
    }, 2500);
    return () => clearTimeout(t);
  }, [visible]);

  if (!visible) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[100] px-4 pointer-events-none" style={{ paddingTop: "max(env(safe-area-inset-top, 8px), 8px)" }}>
      <div className="mx-auto max-w-md rounded-xl bg-primary text-primary-foreground shadow-lg px-4 py-3 flex items-center gap-3 pointer-events-auto">
        <RefreshCw className="h-4 w-4 animate-spin flex-shrink-0" />
        <p className="text-sm font-medium leading-snug">
          A new version is available! Reloading to apply fixes...
        </p>
      </div>
    </div>
  );
};

export default UpdateAvailableBanner;
