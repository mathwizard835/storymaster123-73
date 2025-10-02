import { Button } from "@/components/ui/button";
import { Seo } from "@/components/Seo";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import heroPortal from "@/assets/hero-portal.jpg";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { getCompletedStories } from "@/lib/story";
import { loadCurrentStoryFromDatabase } from "@/lib/databaseStory";
import { BookOpen, Star, Crown, LogOut, Play } from "lucide-react";
import { useState, useEffect } from "react";

const Index = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const completedStories = getCompletedStories();
  const [hasActiveStory, setHasActiveStory] = useState(false);
  const [showNewStoryDialog, setShowNewStoryDialog] = useState(false);
  
  // Check for active story when component mounts
  useEffect(() => {
    const checkActiveStory = async () => {
      if (user) {
        try {
          const activeStory = await loadCurrentStoryFromDatabase();
          setHasActiveStory(!!activeStory && activeStory.scenes.length > 0);
        } catch (e) {
          setHasActiveStory(false);
        }
      }
    };
    checkActiveStory();
  }, [user]);

  const SignOutButton = () => (
    <Button
      variant="ghost"
      size="sm"
      onClick={signOut}
      className="text-white/70 hover:text-white hover:bg-white/10"
    >
      <LogOut className="h-4 w-4 mr-2" />
      Sign Out
    </Button>
  );

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
            {user && (
              <div className="mb-8 flex items-center justify-end">
                <SignOutButton />
              </div>
            )}
            <h1 className="font-heading text-4xl md:text-6xl font-extrabold tracking-tight drop-shadow-xl text-foreground">
              Welcome to StoryMaster Quest! 🎮✨
            </h1>
            <p className="mt-4 text-lg md:text-xl text-muted-foreground">
              Build your hero. Launch your mission. Your choices shape the story.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
              {/* Continue or Start New Button */}
              {hasActiveStory ? (
                <div className="flex flex-col sm:flex-row gap-4">
                  <Button
                    size="xl"
                    variant="hero"
                    onClick={() => navigate("/mission")}
                    aria-label="Continue current adventure"
                  >
                    Continue Adventure
                  </Button>
                  <Button
                    size="xl" 
                    variant="outline"
                    onClick={() => setShowNewStoryDialog(true)}
                    aria-label="Start new adventure"
                    className="flex items-center gap-2"
                  >
                    <Play className="h-4 w-4" />
                    Start New Story
                  </Button>
                </div>
              ) : (
                <Button
                  size="xl"
                  variant="hero"
                  onClick={() => navigate(user ? "/profile?new=true" : "/auth")}
                  aria-label="Create my hero"
                >
                  {user ? "Start New Adventure" : "Play - Join Your Quest"}
                </Button>
              )}
            </div>
            
            {/* Big Access Buttons for Logged In Users */}
            {user && (
              <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-4xl mx-auto">
                <Button
                  size="xl"
                  variant="game"
                  onClick={() => navigate("/gallery")}
                  className="h-20 text-lg font-bold flex flex-col items-center gap-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                  aria-label="View story gallery"
                >
                  <BookOpen className="h-8 w-8" />
                  <div>
                    <div>Story Gallery</div>
                    <div className="text-sm opacity-75">({completedStories.length} stories)</div>
                  </div>
                </Button>
                <Button
                  onClick={() => navigate("/achievements")}
                  variant="game"
                  size="xl"
                  className="h-20 text-lg font-bold flex flex-col items-center gap-2 bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-700 hover:to-orange-700"
                >
                  <Star className="h-8 w-8" />
                  <div>
                    <div>🏆 Achievements</div>
                    <div className="text-sm opacity-75">View progress</div>
                  </div>
                </Button>
                <Button
                  onClick={() => navigate("/profile")}
                  variant="game"
                  size="xl"
                  className="h-20 text-lg font-bold flex flex-col items-center gap-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
                >
                  <Crown className="h-8 w-8" />
                  <div>
                    <div>Hero Profile</div>
                    <div className="text-sm opacity-75">Points & stats</div>
                  </div>
                </Button>
              </div>
            )}
          </div>
        </section>

        {/* New Story Confirmation Dialog */}
        <Dialog open={showNewStoryDialog} onOpenChange={setShowNewStoryDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Start New Adventure?</DialogTitle>
              <DialogDescription>
                You have an adventure in progress. Starting a new one will save your current progress and begin a fresh story.
              </DialogDescription>
            </DialogHeader>
            <div className="flex gap-3 mt-6">
              <Button
                variant="outline"
                onClick={() => setShowNewStoryDialog(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  setShowNewStoryDialog(false);
                  navigate('/profile?new=true');
                }}
                className="flex-1"
              >
                Start New Adventure
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </main>
    </>
  );
};

export default Index;