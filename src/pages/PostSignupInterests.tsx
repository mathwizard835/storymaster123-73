import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Skull, Smile, Compass, Zap, ChevronRight } from "lucide-react";
import { saveProfileToLocal, type Profile } from "@/lib/story";
import {
  getPendingStarterStory,
  clearPendingStarterStory,
} from "@/lib/guestAnalytics";
import { trackGuestEvent } from "@/lib/guestAnalytics";

const INTERESTS = [
  { id: "mystery", label: "Mystery", icon: Skull, color: "265 70% 55%" },
  { id: "comedy", label: "Comedy", icon: Smile, color: "45 95% 55%" },
  { id: "explore", label: "Adventure", icon: Compass, color: "145 65% 45%" },
  { id: "thrill", label: "Thrill", icon: Zap, color: "0 80% 55%" },
];

const PostSignupInterests = () => {
  const navigate = useNavigate();
  const [picked, setPicked] = useState<string | null>(null);

  const finish = async (mode: string | null) => {
    // Build a minimal profile so the AI engine has what it needs.
    // Reading level / age / badges can be filled in later from Settings.
    const profile: Profile = {
      age: 9,
      lexileScore: 600,
      selectedBadges: [],
      mode: mode ?? "explore",
      storyLength: "medium",
    };
    await saveProfileToLocal(profile);

    trackGuestEvent("signup_after_cliffhanger", {
      storySlug: getPendingStarterStory() ?? undefined,
    });
    clearPendingStarterStory();

    navigate("/mission");
  };

  return (
    <main
      className="min-h-[100dvh] w-full overflow-x-hidden"
      style={{
        background:
          "radial-gradient(circle at 50% 0%, hsl(265 60% 18%) 0%, transparent 55%), hsl(245 45% 8%)",
      }}
    >
      <div
        className="mx-auto max-w-md px-5 pb-12 flex flex-col min-h-[100dvh]"
        style={{ paddingTop: "max(env(safe-area-inset-top, 32px), 40px)" }}
      >
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <p className="text-white/50 text-xs uppercase tracking-widest font-semibold mb-2">
            One quick thing
          </p>
          <h1 className="text-white text-3xl font-extrabold leading-tight">
            What kind of story do you love most?
          </h1>
        </motion.div>

        <div className="grid grid-cols-2 gap-3 flex-1">
          {INTERESTS.map((it, i) => {
            const Icon = it.icon;
            const isPicked = picked === it.id;
            return (
              <motion.button
                key={it.id}
                onClick={() => setPicked(it.id)}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 + 0.1 }}
                whileTap={{ scale: 0.97 }}
                className={`rounded-3xl p-5 text-left border-2 transition-all ${
                  isPicked
                    ? "border-white bg-white/10"
                    : "border-white/10 bg-white/[0.03]"
                }`}
                style={
                  isPicked
                    ? {
                        boxShadow: `0 0 0 4px hsl(${it.color} / 0.2)`,
                      }
                    : undefined
                }
              >
                <div
                  className="w-10 h-10 rounded-2xl flex items-center justify-center mb-3"
                  style={{
                    background: `linear-gradient(135deg, hsl(${it.color}) 0%, hsl(${it.color} / 0.6) 100%)`,
                  }}
                >
                  <Icon className="h-5 w-5 text-white" />
                </div>
                <div className="text-white font-bold text-lg">{it.label}</div>
              </motion.button>
            );
          })}
        </div>

        <div className="mt-6 space-y-3">
          <button
            onClick={() => finish(picked)}
            disabled={!picked}
            className="w-full py-4 rounded-2xl bg-white text-black font-bold text-lg disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.97] transition-all flex items-center justify-center gap-2"
          >
            Start my adventure
            <ChevronRight className="h-5 w-5" />
          </button>
          <button
            onClick={() => finish(null)}
            className="w-full py-3 text-white/50 text-sm font-medium active:text-white/90 transition-colors"
          >
            Skip for now
          </button>
        </div>
      </div>
    </main>
  );
};

export default PostSignupInterests;
