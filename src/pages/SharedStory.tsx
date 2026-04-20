import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Seo } from "@/components/Seo";
import { ArrowLeft, ArrowRight, Sparkles, BookOpen, Wand2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { Scene } from "@/lib/story";
import mysticMageBg from "@/assets/mystic-mage-bg.jpg";
import beastMasterBg from "@/assets/beast-master-bg.jpg";
import detectiveBg from "@/assets/detective-bg.jpg";
import actionHeroBg from "@/assets/action-hero-bg.jpg";
import socialChampionBg from "@/assets/social-champion-bg.jpg";
import creativeGeniusBg from "@/assets/creative-genius-bg.jpg";

const getBackgroundForBadge = (badges: string[] = []) => {
  if (badges.includes("mystic")) return mysticMageBg;
  if (badges.includes("beast")) return beastMasterBg;
  if (badges.includes("detective")) return detectiveBg;
  if (badges.includes("action")) return actionHeroBg;
  if (badges.includes("social")) return socialChampionBg;
  if (badges.includes("creative")) return creativeGeniusBg;
  return mysticMageBg;
};

const SharedStory = () => {
  const { storyId } = useParams<{ storyId: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const [title, setTitle] = useState<string>("A StoryMaster Adventure");
  const [sceneIndex, setSceneIndex] = useState(0);

  useEffect(() => {
    const load = async () => {
      if (!storyId) {
        setError("Invalid story link");
        setLoading(false);
        return;
      }
      try {
        const { data, error: dbError } = await supabase
          .from("user_stories")
          .select("scenes, profile, title, shared_publicly")
          .eq("id", storyId)
          .maybeSingle();

        if (dbError) throw dbError;
        if (!data) {
          setError("This story isn't available. The link may be invalid or the owner stopped sharing it.");
          setLoading(false);
          return;
        }
        if (!data.shared_publicly) {
          setError("This story is no longer being shared.");
          setLoading(false);
          return;
        }

        const loadedScenes = (data.scenes as unknown as Scene[]) || [];
        if (loadedScenes.length === 0) {
          setError("This story doesn't have any scenes yet.");
          setLoading(false);
          return;
        }

        setScenes(loadedScenes);
        setProfile(data.profile);
        setTitle(data.title || loadedScenes[0]?.sceneTitle || "A StoryMaster Adventure");
      } catch (e: any) {
        console.error("Failed to load shared story", e);
        setError("Couldn't load this story. Please try again.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [storyId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[hsl(250,50%,12%)] via-[hsl(230,50%,10%)] to-[hsl(260,50%,8%)] flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 border-4 border-white/20 border-t-white/60 rounded-full animate-spin mx-auto" />
          <p className="text-white/70">Loading the adventure…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[hsl(250,50%,12%)] via-[hsl(230,50%,10%)] to-[hsl(260,50%,8%)] flex items-center justify-center p-4">
        <Card className="max-w-md p-8 text-center space-y-4 bg-white/10 backdrop-blur-md border-white/20">
          <Wand2 className="h-12 w-12 text-white/70 mx-auto" />
          <h1 className="text-xl font-bold text-white">Story Unavailable</h1>
          <p className="text-white/70 text-sm">{error}</p>
          <Button onClick={() => navigate("/")} variant="hero" className="w-full">
            Make Your Own Adventure
          </Button>
        </Card>
      </div>
    );
  }

  const scene = scenes[sceneIndex];
  if (!scene) return null;

  const backgroundImage = getBackgroundForBadge(profile?.selectedBadges);
  const isLast = sceneIndex >= scenes.length - 1;
  const isFirst = sceneIndex === 0;

  return (
    <div
      className="min-h-screen bg-cover bg-center bg-no-repeat relative"
      style={{ backgroundImage: `url(${backgroundImage})` }}
    >
      <Seo
        title={`${title} — StoryMaster Kids`}
        description="A friend shared their StoryMaster adventure with you. Read it, then create your own!"
      />
      <div className="absolute inset-0 bg-black/50" />

      <div className="relative z-10 min-h-screen flex flex-col">
        {/* Header */}
        <div className="bg-black/40 backdrop-blur-sm border-b border-white/20 p-3 md:p-4">
          <div className="max-w-3xl mx-auto flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <Sparkles className="h-5 w-5 text-yellow-300 flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-xs text-white/60 uppercase tracking-wide">Shared with you</p>
                <h1 className="text-base md:text-lg font-bold text-white truncate">{title}</h1>
              </div>
            </div>
            <Badge variant="secondary" className="bg-white/15 text-white border-white/20 flex-shrink-0">
              Scene {sceneIndex + 1} / {scenes.length}
            </Badge>
          </div>
        </div>

        {/* Story content */}
        <div className="flex-1 p-4 md:p-6 overflow-y-auto">
          <div className="max-w-3xl mx-auto">
            <AnimatePresence mode="wait">
              <motion.div
                key={sceneIndex}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -16 }}
                transition={{ duration: 0.3 }}
              >
                <Card className="bg-black/55 backdrop-blur-md border-white/20 p-5 md:p-7 space-y-4">
                  <div className="flex items-center gap-2 text-white/80">
                    <BookOpen className="h-4 w-4" />
                    <h2 className="text-lg md:text-xl font-bold text-white">{scene.sceneTitle}</h2>
                  </div>
                  <p className="text-white/90 text-base md:text-lg leading-relaxed whitespace-pre-wrap">
                    {scene.narrative}
                  </p>

                  {scene.choices && scene.choices.length > 0 && !isLast && (
                    <div className="pt-2 border-t border-white/15">
                      <p className="text-xs uppercase tracking-wide text-white/50 mb-2">
                        The reader chose…
                      </p>
                      <div className="space-y-1.5">
                        {scene.choices.map((c) => (
                          <div
                            key={c.id}
                            className="text-sm text-white/70 bg-white/5 rounded px-3 py-2"
                          >
                            {c.text}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </Card>
              </motion.div>
            </AnimatePresence>

            {/* Navigation */}
            <div className="flex items-center justify-between gap-3 mt-5">
              <Button
                variant="outline"
                onClick={() => setSceneIndex((i) => Math.max(0, i - 1))}
                disabled={isFirst}
                className="bg-white/10 border-white/20 text-white hover:bg-white/20"
              >
                <ArrowLeft className="h-4 w-4 mr-1" /> Back
              </Button>

              {!isLast ? (
                <Button
                  onClick={() => setSceneIndex((i) => Math.min(scenes.length - 1, i + 1))}
                  variant="hero"
                >
                  Next Scene <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              ) : (
                <Link to="/auth">
                  <Button variant="hero" className="font-bold">
                    Make Your Own Adventure ✨
                  </Button>
                </Link>
              )}
            </div>

            {/* End-of-story CTA card */}
            {isLast && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="mt-6"
              >
                <Card className="bg-gradient-to-br from-purple-600/40 to-pink-600/40 backdrop-blur-md border-white/20 p-6 text-center space-y-3">
                  <h3 className="text-xl font-bold text-white">Liked this story?</h3>
                  <p className="text-white/80 text-sm">
                    Create your own AI-powered adventure on StoryMaster Kids — pick your hero, your world, and your choices.
                  </p>
                  <Link to="/auth">
                    <Button variant="hero" size="lg" className="w-full font-bold">
                      Start My Adventure
                    </Button>
                  </Link>
                </Card>
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SharedStory;
