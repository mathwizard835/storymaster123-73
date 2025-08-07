import { Seo } from "@/components/Seo";
import { Button } from "@/components/ui/button";
import spaceStation from "@/assets/space-station.jpg";
import { useNavigate } from "react-router-dom";
import { Zap, Timer, Star } from "lucide-react";

const Mission = () => {
  const navigate = useNavigate();

  return (
    <>
      <Seo
        title="StoryMaster Quest – Mission: Asteroid Alert"
        description="Launch your first mission aboard Starwatch Station. Choose your next move!"
        canonical="/mission"
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "VideoGame",
          name: "StoryMaster Quest – Mission",
          gamePlatform: "Web",
        }}
      />
      <main className="relative min-h-screen w-full overflow-hidden">
        <img
          src={spaceStation}
          alt="Futuristic space station control room with asteroid field outside"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background/40 to-background/70" />

        {/* HUD */}
        <aside className="relative z-10 px-6 pt-6">
          <div className="glass-panel rounded-xl px-4 py-3 inline-flex items-center gap-6">
            <div className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              <span className="text-sm font-semibold">Energy:</span>
              <span className="text-sm">75%</span>
            </div>
            <div className="flex items-center gap-2">
              <Timer className="h-5 w-5" />
              <span className="text-sm font-semibold">Time:</span>
              <span className="text-sm">12 min</span>
            </div>
            <div className="flex items-center gap-2">
              <Star className="h-5 w-5" />
              <span className="text-sm font-semibold">Choice Points:</span>
              <span className="text-sm">0</span>
            </div>
          </div>
        </aside>

        {/* Mission content */}
        <section className="relative z-10 min-h-[70vh] flex items-center">
          <div className="container grid gap-6 md:grid-cols-5 py-10 md:py-16">
            <article className="md:col-span-3 glass-panel rounded-2xl p-6 md:p-8 animate-enter">
              <h1 className="font-heading text-2xl md:text-4xl font-extrabold">🚀 MISSION: ASTEROID ALERT!</h1>
              <p className="mt-4 text-base md:text-lg">
                You are Commander Nova, the youngest cadet aboard Starwatch Station. The warning lights flash red as a massive asteroid field barrels toward your orbit. The main thrusters are offline.
              </p>
              <p className="mt-3 text-base md:text-lg">
                Captain Zara turns to you: “We have minutes to act. Choose your mission!”
              </p>
            </article>

            <nav className="md:col-span-2 grid gap-3 content-start">
              <Button variant="choice" size="xl" onClick={() => navigate("/coming-soon")}>A) 🔧 Try to restart the engines manually</Button>
              <Button variant="choice" size="xl" onClick={() => navigate("/coming-soon")}>B) 🛡️ Route power to the shield array</Button>
              <Button variant="choice" size="xl" onClick={() => navigate("/coming-soon")}>C) 📡 Send a distress signal to the lunar colony</Button>
              <Button variant="choice" size="xl" onClick={() => navigate("/coming-soon")}>D) 🚀 Prepare escape pods for emergency evacuation</Button>
            </nav>
          </div>
        </section>
      </main>
    </>
  );
};

export default Mission;
