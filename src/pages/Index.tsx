import { Button } from "@/components/ui/button";
import { Seo } from "@/components/Seo";
import heroPortal from "@/assets/hero-portal.jpg";
import { useNavigate } from "react-router-dom";
import { getCompletedStories } from "@/lib/story";
import { BookOpen } from "lucide-react";

const Index = () => {
  const navigate = useNavigate();
  const completedStories = getCompletedStories();

  return (
    <>
      <Seo
        title="StoryMaster Quest – Welcome"
        description="Welcome to StoryMaster Quest! Create your hero and begin your interactive adventure."
        canonical="/"
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "VideoGame",
          name: "StoryMaster Quest",
          applicationCategory: "Game",
          genre: ["Interactive Fiction", "Adventure"],
        }}
      />
      <header className="sr-only">
        <h1>Welcome to StoryMaster Quest! 🎮✨</h1>
      </header>
      <main className="relative min-h-screen w-full overflow-hidden">
        <img
          src={heroPortal}
          alt="Vibrant sci‑fi portal with stars and magical energy"
          className="absolute inset-0 h-full w-full object-cover"
          loading="eager"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background/20 to-background/60" />

        <section className="relative z-10 flex min-h-screen items-center justify-center px-6">
          <div className="max-w-3xl text-center animate-enter">
            <h2 className="font-heading text-4xl md:text-6xl font-extrabold tracking-tight drop-shadow-xl text-foreground">
              Welcome to StoryMaster Quest! 🎮✨
            </h2>
            <p className="mt-4 text-lg md:text-xl text-muted-foreground">
              Build your hero. Launch your mission. Your choices shape the story.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                size="xl"
                variant="hero"
                onClick={() => navigate("/profile")}
                aria-label="Create my hero"
              >
                Create My Hero
              </Button>
              {completedStories.length > 0 && (
                <Button
                  size="xl"
                  variant="outline"
                  onClick={() => navigate("/gallery")}
                  className="flex items-center gap-2"
                  aria-label="View story gallery"
                >
                  <BookOpen className="h-4 w-4" />
                  Story Gallery ({completedStories.length})
                </Button>
              )}
            </div>
          </div>
        </section>
      </main>
    </>
  );
};

export default Index;
