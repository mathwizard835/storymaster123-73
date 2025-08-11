import { Seo } from "@/components/Seo";
import { Button } from "@/components/ui/button";
import spaceStation from "@/assets/space-station.jpg";
import mysticMageBg from "@/assets/mystic-mage-bg.jpg";
import beastMasterBg from "@/assets/beast-master-bg.jpg";
import detectiveBg from "@/assets/detective-bg.jpg";
import actionHeroBg from "@/assets/action-hero-bg.jpg";
import socialChampionBg from "@/assets/social-champion-bg.jpg";
import creativeGeniusBg from "@/assets/creative-genius-bg.jpg";
import { useNavigate } from "react-router-dom";
import { Zap, Timer, Star, Heart, Shield, Eye, Wand2, PawPrint, Crosshair, Users, Palette } from "lucide-react";
import { useEffect, useState } from "react";
import { generateNextScene, loadProfile, type Scene } from "@/lib/story";
import { useToast } from "@/components/ui/use-toast";

const Mission = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [scene, setScene] = useState<Scene | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  const profile = loadProfile();

  // Background and theme mapping
  const getThemeByBadge = (badges: string[]) => {
    const themeMap: Record<string, { bg: string; alt: string; color: string; icon: any }> = {
      mystic: { bg: mysticMageBg, alt: "Mystical fantasy landscape with magical crystals and glowing runes", color: "text-purple-300", icon: Wand2 },
      beast: { bg: beastMasterBg, alt: "Jungle adventure scene with mystical creatures and ancient totems", color: "text-green-300", icon: PawPrint },
      detective: { bg: detectiveBg, alt: "Noir detective office with rain-streaked windows at night", color: "text-blue-300", icon: Eye },
      action: { bg: actionHeroBg, alt: "Dynamic urban action scene with skyscrapers and dramatic lighting", color: "text-red-300", icon: Crosshair },
      social: { bg: socialChampionBg, alt: "Vibrant community gathering in a festive town square", color: "text-amber-300", icon: Users },
      creative: { bg: creativeGeniusBg, alt: "Inspiring artist studio with colorful artwork and creative tools", color: "text-pink-300", icon: Palette },
      space: { bg: spaceStation, alt: "Futuristic space station control room with asteroid field outside", color: "text-cyan-300", icon: Zap },
    };

    // Find the first matching badge, default to space
    const primaryBadge = badges.find(badge => themeMap[badge]) || 'space';
    return themeMap[primaryBadge] || themeMap.space;
  };

  const theme = profile ? getThemeByBadge(profile.selectedBadges) : getThemeByBadge(['space']);

  useEffect(() => {
    if (!profile) {
      navigate("/profile");
      return;
    }
    const init = async () => {
      try {
        setLoading(true);
        const { parsed, text } = await generateNextScene(profile);
        if (!parsed) {
          throw new Error("Invalid AI response: " + text.slice(0, 140));
        }
        setScene(parsed);
      } catch (e: any) {
        console.error(e);
        toast({ title: "Story error", description: e.message ?? "Failed to start mission", variant: "destructive" });
      } finally {
        setLoading(false);
      }
    };
    init();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onChoose = async (choiceId: string) => {
    if (!profile || !scene) return;
    try {
      setLoading(true);
      const { parsed, text } = await generateNextScene(profile, { ...scene, selectedChoiceId: choiceId });
      if (!parsed) throw new Error("Invalid AI response: " + text.slice(0, 140));
      setScene(parsed);
    } catch (e: any) {
      console.error(e);
      toast({ title: "Story error", description: e.message ?? "Failed to continue", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const energy = scene?.hud?.energy ?? 75;
  const time = scene?.hud?.time ?? "--";
  const choicePoints = scene?.hud?.choicePoints ?? 0;
  const uiElements = scene?.hud?.ui || [];

  const ThemeIcon = theme.icon;

  return (
    <>
      <Seo
        title="StoryMaster Quest – Mission"
        description="Dynamic, AI-powered mission with choices and live HUD."
        canonical="/mission"
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "VideoGame",
          name: scene?.sceneTitle || "StoryMaster Quest – Mission",
          gamePlatform: "Web",
        }}
      />
      <main className="relative min-h-screen w-full overflow-hidden">
        <img
          src={theme.bg}
          alt={theme.alt}
          className="absolute inset-0 h-full w-full object-cover"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background/40 to-background/70" />

        {/* Enhanced HUD */}
        <aside className="relative z-10 px-6 pt-6">
          <div className="glass-panel rounded-xl px-4 py-3 inline-flex items-center gap-4 flex-wrap">
            <div className={`flex items-center gap-2 ${theme.color}`}>
              <ThemeIcon className="h-5 w-5" />
              <span className="text-sm font-semibold">Energy:</span>
              <span className="text-sm">{energy}%</span>
            </div>
            <div className="flex items-center gap-2">
              <Timer className="h-5 w-5" />
              <span className="text-sm font-semibold">Time:</span>
              <span className="text-sm">{time}</span>
            </div>
            <div className="flex items-center gap-2">
              <Star className="h-5 w-5" />
              <span className="text-sm font-semibold">Choice Points:</span>
              <span className="text-sm">{choicePoints}</span>
            </div>
            {/* Dynamic UI elements from AI */}
            {uiElements.map((element, index) => (
              <div key={index} className="flex items-center gap-2 text-sm">
                <Heart className="h-4 w-4 opacity-70" />
                <span className="opacity-90">{element}</span>
              </div>
            ))}
          </div>
        </aside>

        {/* Mission content */}
        <section className="relative z-10 min-h-[70vh] flex items-center">
          <div className="container grid gap-6 md:grid-cols-5 py-10 md:py-16">
            <article className="md:col-span-3 glass-panel rounded-2xl p-6 md:p-8 animate-enter">
              <h1 className="font-heading text-2xl md:text-4xl font-extrabold">{scene?.sceneTitle ?? "Initializing Mission..."}</h1>
              <p className="mt-4 text-base md:text-lg whitespace-pre-line">
                {scene?.narrative ?? (loading ? "Generating your first scene..." : "Click Start again if this persists.")}
              </p>
            </article>

            <nav className="md:col-span-2 grid gap-3 content-start">
              {scene?.choices?.length ? (
                scene.choices.map((c) => (
                  <Button key={c.id} variant="choice" size="xl" onClick={() => onChoose(c.id)} disabled={loading}>
                    {c.label}
                  </Button>
                ))
              ) : (
                <Button variant="game" size="lg" disabled>
                  {loading ? "Generating..." : "No choices available"}
                </Button>
              )}

              {scene?.end && (
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <Button variant="game" size="lg" onClick={() => navigate("/profile")}>Create New Hero</Button>
                  <Button variant="hero" size="lg" onClick={() => navigate("/")}>Home</Button>
                </div>
              )}
            </nav>
          </div>
        </section>
      </main>
    </>
  );
};

export default Mission;

