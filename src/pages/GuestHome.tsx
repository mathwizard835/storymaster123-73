import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, BookOpen } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { STARTER_STORIES } from "@/content/starterStories";
import { trackGuestEvent } from "@/lib/guestAnalytics";
import { Seo } from "@/components/Seo";

const GuestHome = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    // One view event per mount, regardless of card count.
    trackGuestEvent("story_card_view");
  }, []);

  const handlePick = (slug: string) => {
    trackGuestEvent("story_card_tap", { storySlug: slug });
    navigate(`/story/${slug}`);
  };

  return (
    <>
      <Seo
        title="StoryMaster Kids – Pick a Story"
        description="Three short interactive stories. Tap one and start reading instantly. No signup required."
        canonical="/"
      />
      <main
        className="min-h-[100dvh] w-full overflow-x-hidden"
        style={{
          background:
            "radial-gradient(circle at 20% 0%, hsl(265 70% 18%) 0%, transparent 55%), radial-gradient(circle at 80% 100%, hsl(220 70% 14%) 0%, transparent 55%), hsl(245 50% 8%)",
        }}
      >
        <div
          className="mx-auto max-w-2xl px-5 pb-16"
          style={{
            paddingTop: "max(env(safe-area-inset-top, 24px), 32px)",
          }}
        >
          {/* Tiny logged-in shortcut — non-intrusive */}
          {user && (
            <div className="flex justify-end mb-2">
              <button
                onClick={() => navigate("/dashboard")}
                className="text-xs text-white/50 hover:text-white/90 transition-colors flex items-center gap-1"
              >
                Continue your adventure
                <ArrowRight className="h-3 w-3" />
              </button>
            </div>
          )}

          <motion.h1
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45 }}
            className="text-white/95 text-2xl sm:text-3xl font-bold tracking-tight mt-4 mb-6"
          >
            Pick a story
          </motion.h1>

          <div className="space-y-4">
            {STARTER_STORIES.map((s, i) => (
              <motion.button
                key={s.slug}
                onClick={() => handlePick(s.slug)}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.08 * i + 0.1, duration: 0.4 }}
                whileTap={{ scale: 0.98 }}
                className="w-full text-left rounded-3xl p-5 sm:p-6 relative overflow-hidden shadow-[0_12px_40px_-12px_rgba(0,0,0,0.6)] active:shadow-[0_4px_16px_-8px_rgba(0,0,0,0.6)] transition-shadow"
                style={{
                  background: `linear-gradient(135deg, hsl(${s.gradientFrom}) 0%, hsl(${s.gradientTo}) 100%)`,
                }}
              >
                <div className="absolute -right-4 -top-4 text-7xl sm:text-8xl opacity-20 select-none pointer-events-none">
                  {s.emoji}
                </div>
                <div className="relative z-10">
                  <div className="flex items-center gap-2 text-white/70 text-xs font-semibold uppercase tracking-widest mb-3">
                    <BookOpen className="h-3.5 w-3.5" />
                    Story {i + 1}
                  </div>
                  <h2 className="text-white text-xl sm:text-2xl font-extrabold leading-tight mb-2 max-w-[85%]">
                    {s.title}
                  </h2>
                  <p className="text-white/80 text-sm sm:text-base leading-snug max-w-[90%]">
                    {s.hook}
                  </p>
                  <div className="mt-4 inline-flex items-center gap-1.5 text-white text-sm font-semibold">
                    Tap to read
                    <ArrowRight className="h-4 w-4" />
                  </div>
                </div>
              </motion.button>
            ))}
          </div>

          <p className="text-center text-white/30 text-xs mt-8">
            No signup. Just tap and read.
          </p>
        </div>
      </main>
    </>
  );
};

export default GuestHome;
