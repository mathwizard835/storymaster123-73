import { Button } from "@/components/ui/button";
import { Seo } from "@/components/Seo";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Dialog as NewStoryDialog,
  DialogContent as NewDialogContent,
  DialogHeader as NewDialogHeader,
  DialogTitle as NewDialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import heroLanding from "@/assets/hero-landing.jpg";
import familyReading from "@/assets/family-reading.jpg";
import storyGenres from "@/assets/story-genres.jpg";
import heroPortal from "@/assets/hero-portal.jpg";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { getCompletedStories } from "@/lib/story";
import { loadCurrentStoryFromDatabase } from "@/lib/databaseStory";
import { isMobilePlatform } from "@/lib/mobileFeatures";
import {
  BookOpen,
  Star,
  Shield,
  Zap,
  Heart,
  Brain,
  Gamepad2,
  Users,
  Sparkles,
  ChevronDown,
  Rocket,
  Crown,
  GraduationCap,
  LogOut,
  Play,
} from "lucide-react";
import { useState, useEffect } from "react";

const Index = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const completedStories = getCompletedStories();
  const [showPitch, setShowPitch] = useState(true);
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
    <Button variant="ghost" size="sm" onClick={signOut} className="text-white/70 hover:text-white hover:bg-white/10">
      <LogOut className="h-4 w-4 mr-2" />
      Sign Out
    </Button>
  );

  // If user wants to skip to the original experience
  if (!showPitch) {
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
              <h2 className="font-heading text-4xl md:text-6xl font-extrabold tracking-tight drop-shadow-xl text-foreground">
                Welcome to StoryMaster Quest! 🎮✨
              </h2>
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
                      onClick={() => navigate("/dashboard")}
                      aria-label="Go to dashboard"
                    >
                      Go to Dashboard
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
                    onClick={() => {
                      if (user) {
                        navigate("/profile?new=true");
                      } else if (isMobilePlatform()) {
                        navigate("/profile?trial=true");
                      } else {
                        navigate("/auth");
                      }
                    }}
                    aria-label="Create my hero"
                  >
                    {user ? "Start New Adventure" : "Play - Join Your Quest"}
                  </Button>
                )}
              </div>

              {/* Big Access Buttons for Logged In Users */}
              {user && (
                <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 tablet-lg:grid-cols-3 gap-4 max-w-4xl mx-auto">
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
        </main>
      </>
    );
  }

  const content = {
    title: "🌟 Become the Hero of Your Own Epic Adventure!",
    subtitle:
      "Create amazing stories where YOU are the main character! Fight dragons, explore space, solve mysteries, and save the day!",
    heroText: "Every Story is YOUR Adventure!",
    ctaButton: "🚀 Start My Epic Quest!",
    benefits: [
      { icon: <Shield className="h-5 w-5 text-green-400" />, text: "100% Safe Content" },
      { icon: <Brain className="h-5 w-5 text-blue-400" />, text: "Educational & Engaging" },
      { icon: <Sparkles className="h-5 w-5 text-purple-400" />, text: "Personalized Adventures" },
    ],
  };

  return (
    <>
      <Seo
        title="Stop Reading Battles - StoryMaster Quest Turns Reluctant Readers Into Story Lovers"
        description="Your child will ASK to read! AI-powered interactive adventures that make reading irresistible. Track real progress. No more bedtime battles."
        canonical="/"
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "VideoGame",
          name: "StoryMaster Quest",
          applicationCategory: "Educational Game",
          genre: ["Interactive Fiction", "Adventure", "Educational"],
          audience: "Childrem age 5+, Parents",
        }}
      />

      {/* New Story Confirmation Dialog */}
      <NewStoryDialog open={showNewStoryDialog} onOpenChange={setShowNewStoryDialog}>
        <NewDialogContent className="max-w-md">
          <NewDialogHeader>
            <NewDialogTitle>Start New Adventure?</NewDialogTitle>
            <DialogDescription>
              You have an adventure in progress. Starting a new one will save your current progress and begin a fresh
              story.
            </DialogDescription>
          </NewDialogHeader>
          <div className="flex gap-3 mt-6">
            <Button variant="outline" onClick={() => setShowNewStoryDialog(false)} className="flex-1">
              Cancel
            </Button>
            <Button
              onClick={() => {
                setShowNewStoryDialog(false);
                navigate("/profile?new=true");
              }}
              className="flex-1"
            >
              Start New Adventure
            </Button>
          </div>
        </NewDialogContent>
      </NewStoryDialog>

      {/* Hero Section - The Big Pitch */}
      <section className="relative min-h-screen w-full overflow-hidden">
        <img
          src={heroLanding}
          alt="Children engaged with magical interactive stories"
          className="absolute inset-0 h-full w-full object-cover"
          loading="eager"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background/30 via-background/50 to-background/70" />

        <div className="relative z-10 flex min-h-screen items-center justify-center px-6">
          <div className="max-w-4xl text-center animate-enter">
            {user && (
              <div className="mb-8 flex items-center justify-end">
                <SignOutButton />
              </div>
            )}
            <h1 className="font-heading text-5xl md:text-7xl font-extrabold tracking-tight drop-shadow-2xl mb-6">
              <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                Stop Fighting About Reading.
              </span>
              <br />
              <span className="text-foreground">Start Celebrating It.</span>
            </h1>
            <p className="text-xl md:text-2xl text-muted-foreground mb-8 leading-relaxed">
              <strong className="text-foreground text-2xl">
                Your child who <span className="text-destructive line-through">refuses to read</span> will{" "}
                <span className="text-primary">beg for "just one more story!"</span>
              </strong>
              <br />
              <span className="text-lg">
                📚 Track Real Progress • ⏱️ See Time & Words Read • 🔥 Build Reading Streaks
              </span>
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
              {/* Continue or Start New Button */}
              {hasActiveStory ? (
                <div className="flex flex-col sm:flex-row gap-4">
                  <Button size="xl" variant="hero" onClick={() => navigate("/dashboard")} className="text-lg px-8 py-4">
                    Go to Dashboard
                  </Button>
                  <Button
                    size="xl"
                    variant="outline"
                    onClick={() => setShowNewStoryDialog(true)}
                    className="text-lg px-8 py-4 flex items-center gap-2"
                  >
                    <Play className="h-4 w-4" />
                    Start New Story
                  </Button>
                </div>
              ) : (
                <Button
                  size="xl"
                  variant="hero"
                  onClick={() => {
                    if (user) {
                      navigate("/dashboard");
                    } else if (isMobilePlatform()) {
                      navigate("/profile?trial=true");
                    } else {
                      navigate("/auth");
                    }
                  }}
                  className="text-lg px-8 py-4 animate-pulse"
                >
                  {user ? "Go to Dashboard" : "Play - Join Your Quest"}
                </Button>
              )}
              <Button
                size="xl"
                variant="game"
                onClick={() => {
                  // Clear any previous trial flags to allow fresh trial
                  localStorage.removeItem("trial_story_used");
                  localStorage.removeItem("trial_story_started");
                  navigate("/profile?trial=true");
                }}
                className="text-lg px-8 py-4"
              >
                🎮 Try 1 Story Free
              </Button>
              <Button
                size="xl"
                variant="outline"
                onClick={() => document.getElementById("learn-more")?.scrollIntoView({ behavior: "smooth" })}
                className="text-lg px-8 py-4"
              >
                See How It Works
              </Button>
            </div>

            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 mb-8 border border-white/20">
              <p className="text-lg font-semibold text-center mb-3">✨ For Parents of Reluctant Readers</p>
              <div className="flex flex-col sm:flex-row justify-center items-center gap-4 text-sm">
                <span className="flex items-center gap-2 text-center">
                  <span className="text-lg">📖</span>
                  <strong>"My 7-year-old HATED reading. Now he asks for StoryMaster every night!"</strong>
                </span>
              </div>
              <p className="text-center text-xs text-muted-foreground mt-3">— Parent testimonial</p>
            </div>

            <div className="flex justify-center items-center gap-8 text-sm text-muted-foreground flex-wrap">
              {content.benefits.map((benefit, index) => (
                <div key={index} className="flex items-center gap-2">
                  {benefit.icon}
                  <span>
                    <strong>{benefit.text}</strong>
                  </span>
                </div>
              ))}
              <div className="flex items-center gap-2 bg-primary/20 px-3 py-1.5 rounded-full">
                <Rocket className="h-4 w-4 text-primary" />
                <span className="text-primary">
                  <strong>Updated Weekly</strong>
                </span>
              </div>
            </div>

            <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce">
              <ChevronDown className="h-8 w-8 text-muted-foreground" />
            </div>
          </div>
        </div>
      </section>

      {/* What Makes Us Special */}
      <section id="learn-more" className="py-20 px-6 bg-gradient-to-b from-background to-muted/20">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-6">The Screen Time Revolution Is Here</h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              <strong className="text-foreground">Stop the bedtime battles.</strong> StoryMaster turns reluctant readers
              into book lovers.{" "}
              <span className="text-primary font-semibold">Track real progress parents can celebrate.</span>
            </p>
          </div>

          <div className="grid grid-cols-1 tablet:grid-cols-2 lg:grid-cols-3 gap-8 mb-20">
            <div className="glass-panel p-8 text-center hover-scale">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <BookOpen className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-2xl font-bold mb-4">📊 Track Real Reading Progress</h3>
              <p className="text-muted-foreground">
                <strong>See measurable growth:</strong> Words read, reading time, speed, and daily streaks. Finally,
                proof that screen time is actually helping!
              </p>
            </div>

            <div className="glass-panel p-8 text-center hover-scale">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Heart className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-2xl font-bold mb-4">💖 They'll Actually Ask to Read</h3>
              <p className="text-muted-foreground">
                <strong>No more battles:</strong> Interactive stories so engaging, kids beg for "just one more." Turn
                reading from a chore into their favorite activity.
              </p>
            </div>

            <div className="glass-panel p-8 text-center hover-scale">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Brain className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-2xl font-bold mb-4">🎯 Perfect For Every Child</h3>
              <p className="text-muted-foreground">
                <strong>Automatic personalization:</strong> AI adapts to your child's reading level and interests.
                Whether they're 6 or 16, stories that match their abilities.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* For Parents Section */}
      <section className="py-20 px-6 bg-gradient-to-r from-background to-muted/30">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <img
                src={familyReading}
                alt="Parents and children enjoying safe educational entertainment together"
                className="rounded-xl shadow-2xl"
                loading="lazy"
              />
            </div>
            <div>
              <h2 className="text-4xl md:text-5xl font-bold mb-6">For Parents Who Care</h2>
              <p className="text-xl text-muted-foreground mb-8">
                Finally, screen time that makes you feel good about what your kids are doing.
              </p>

              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <Heart className="h-4 w-4 text-green-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg mb-2">Educational Value</h3>
                    <p className="text-muted-foreground">
                      Builds vocabulary, critical thinking, and creativity while having fun.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <Shield className="h-4 w-4 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg mb-2">Complete Safety</h3>
                    <p className="text-muted-foreground">
                      Zero inappropriate content, no ads. Safe storytelling with parental progress insights.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <Star className="h-4 w-4 text-purple-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg mb-2">Progress Tracking</h3>
                    <p className="text-muted-foreground">
                      Watch your child's reading confidence and decision-making skills grow.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <Rocket className="h-4 w-4 text-orange-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg mb-2">Always Improving</h3>
                    <p className="text-muted-foreground">
                      Updated weekly with new features, stories, and improvements based on parent & kid feedback.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* For Kids/Teens Section */}
      <section className="py-20 px-6 bg-gradient-to-l from-background to-accent/10">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="order-2 md:order-1">
              <h2 className="text-4xl md:text-5xl font-bold mb-6">Your Story, Your Rules</h2>
              <p className="text-xl text-muted-foreground mb-8">
                Every adventure is different. Every choice matters. Every story is uniquely yours.
              </p>

              <div className="grid grid-cols-1 tablet:grid-cols-2 gap-6">
                <div className="glass-panel p-6">
                  <Zap className="h-8 w-8 text-primary mb-3" />
                  <h3 className="font-bold mb-2">Action-Packed</h3>
                  <p className="text-sm text-muted-foreground">
                    Thrilling adventures that keep you on the edge of your seat!
                  </p>
                </div>

                <div className="glass-panel p-6">
                  <Users className="h-8 w-8 text-primary mb-3" />
                  <h3 className="font-bold mb-2">Be The Hero</h3>
                  <p className="text-sm text-muted-foreground">You're not just reading – you're the main character!</p>
                </div>

                <div className="glass-panel p-6">
                  <Sparkles className="h-8 w-8 text-primary mb-3" />
                  <h3 className="font-bold mb-2">Endless Worlds</h3>
                  <p className="text-sm text-muted-foreground">
                    Space, fantasy, mystery, adventure – pick your favorite!
                  </p>
                </div>

                <div className="glass-panel p-6">
                  <Star className="h-8 w-8 text-primary mb-3" />
                  <h3 className="font-bold mb-2">Level Up</h3>
                  <p className="text-sm text-muted-foreground">Earn achievements and unlock new story possibilities!</p>
                </div>
              </div>
            </div>

            <div className="order-1 md:order-2">
              <img
                src={storyGenres}
                alt="Exciting story genres including space, fantasy, mystery and action adventures"
                className="rounded-xl shadow-2xl"
                loading="lazy"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="py-20 px-6 bg-gradient-to-b from-primary/5 to-background">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">Your Child's Brain Will Thank You</h2>
          <p className="text-xl text-muted-foreground mb-8">
            <strong className="text-foreground">Don't let them fall behind.</strong> While other kids waste time on
            mindless content, yours will be building critical thinking, vocabulary, and creativity.
          </p>

          <div className="bg-primary/10 border border-primary/30 rounded-2xl p-8 mb-8 text-center">
            <p className="text-2xl font-bold text-primary mb-2">⚡ Limited Time: FREE Trial</p>
            <p className="text-lg">No credit card required • Cancel anytime • Instant access</p>
            <div className="mt-3 inline-flex items-center gap-2 bg-background/50 px-4 py-2 rounded-full text-sm">
              <Rocket className="h-4 w-4 text-primary" />
              <span className="font-semibold">Updated weekly</span> with new features & improvements
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-6 justify-center mb-8">
            {/* Same button logic as the main CTA */}
            {hasActiveStory ? (
              <div className="flex flex-col sm:flex-row gap-4">
                <Button size="xl" variant="hero" onClick={() => navigate("/mission")} className="text-xl px-12 py-6">
                  Continue Your Quest
                </Button>
                <Button
                  size="xl"
                  variant="outline"
                  onClick={() => setShowNewStoryDialog(true)}
                  className="text-xl px-12 py-6 flex items-center gap-2"
                >
                  <Play className="h-5 w-5" />
                  Start New Story
                </Button>
              </div>
            ) : (
              <Button
                size="xl"
                variant="hero"
                onClick={() => navigate(user ? "/profile?new=true" : "/auth")}
                className="text-xl px-12 py-6 animate-pulse"
              >
                {user ? "Start New Adventure" : "Play - Join Your Quest"}
              </Button>
            )}
          </div>

          <div className="bg-muted/30 rounded-2xl p-8 max-w-4xl mx-auto">
            <h3 className="text-2xl font-bold mb-6 text-center">🎯 Core Features Kids & Parents Love</h3>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-primary/20 rounded-full flex items-center justify-center">
                    <Users className="h-4 w-4 text-primary" />
                  </div>
                  <span>
                    <strong>Be The Hero:</strong> Your child stars in every adventure
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-primary/20 rounded-full flex items-center justify-center">
                    <Gamepad2 className="h-4 w-4 text-primary" />
                  </div>
                  <span>
                    <strong>Choose Your Path:</strong> Every decision shapes the story
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-primary/20 rounded-full flex items-center justify-center">
                    <Star className="h-4 w-4 text-primary" />
                  </div>
                  <span>
                    <strong>Unlock Achievements:</strong> Rewards for reading milestones
                  </span>
                </div>
              </div>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-primary/20 rounded-full flex items-center justify-center">
                    <Brain className="h-4 w-4 text-primary" />
                  </div>
                  <span>
                    <strong>Builds Vocabulary:</strong> Age-perfect word learning
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-primary/20 rounded-full flex items-center justify-center">
                    <Sparkles className="h-4 w-4 text-primary" />
                  </div>
                  <span>
                    <strong>Endless Genres:</strong> Space, fantasy, mystery & more
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-primary/20 rounded-full flex items-center justify-center">
                    <Shield className="h-4 w-4 text-primary" />
                  </div>
                  <span>
                    <strong>Progress Tracking:</strong> Watch skills develop daily
                  </span>
                </div>
              </div>
            </div>
          </div>

          <p className="text-sm text-muted-foreground mt-8">
            ✅ Instant access • ✅ No payment required • ✅ Cancel anytime
          </p>

          <footer className="mt-12 pt-6 border-t border-border/50">
            <div className="flex flex-wrap justify-center gap-6 text-sm text-muted-foreground">
              <a href="/privacy" className="hover:text-foreground transition-colors">
                Privacy Policy
              </a>
              <span>•</span>
              <a href="/terms" className="hover:text-foreground transition-colors">
                Terms of Service
              </a>
              <span>•</span>
              <a href="/support" className="hover:text-foreground transition-colors">
                Support
              </a>
              <span>•</span>
              <span>© 2025 StoryMaster Quest</span>
            </div>
          </footer>
        </div>
      </section>
    </>
  );
};

export default Index;
