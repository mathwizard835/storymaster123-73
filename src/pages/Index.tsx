import { Button } from "@/components/ui/button";
import { Seo } from "@/components/Seo";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import heroLanding from "@/assets/hero-landing.jpg";
import familyReading from "@/assets/family-reading.jpg";
import storyGenres from "@/assets/story-genres.jpg";
import heroPortal from "@/assets/hero-portal.jpg";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { getCompletedStories } from "@/lib/story";
import { BookOpen, Star, Shield, Zap, Heart, Brain, Gamepad2, Users, Sparkles, ChevronDown, Rocket, Crown, GraduationCap, LogOut } from "lucide-react";
import { useState } from "react";

type AudienceType = 'kid' | 'teen' | 'parent' | null;

const Index = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const completedStories = getCompletedStories();
  const [showPitch, setShowPitch] = useState(true);
  const [audience, setAudience] = useState<AudienceType>(null);
  const [showAudienceSelector, setShowAudienceSelector] = useState(true);

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
                <Button
                  size="xl"
                  variant="hero"
                  onClick={() => navigate(user ? "/profile?new=true" : "/auth")}
                  aria-label="Create my hero"
                >
                  {user ? "Start New Adventure" : "Play - Join Your Quest"}
                </Button>
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
        </main>
      </>
    );
  }

  const handleAudienceSelect = (selectedAudience: AudienceType) => {
    setAudience(selectedAudience);
    setShowAudienceSelector(false);
  };

  const getAudienceContent = () => {
    switch (audience) {
      case 'kid':
        return {
          title: "🌟 Become the Hero of Your Own Epic Adventure!",
          subtitle: "Create amazing stories where YOU are the main character! Fight dragons, explore space, solve mysteries, and save the day!",
          heroText: "Every Story is YOUR Adventure!",
          ctaButton: "🚀 Start My Epic Quest!",
          benefits: [
            { icon: <Rocket className="h-5 w-5 text-purple-400" />, text: "You're the HERO of every story!" },
            { icon: <Crown className="h-5 w-5 text-yellow-400" />, text: "Unlock cool achievements & rewards!" },
            { icon: <Zap className="h-5 w-5 text-blue-400" />, text: "Choose your own adventure path!" }
          ]
        };
      case 'teen':
        return {
          title: "🔥 The Most Addictive Storytelling Experience Ever Built",
          subtitle: "Daily story drops, evolving avatars, choice chains, squad missions, and viral story clips. This isn't just reading - it's the future of gaming.",
          heroText: "Your Choices Build Legends",
          ctaButton: "🎮 Join The Story Revolution",
          benefits: [
            { icon: <Zap className="h-5 w-5 text-cyan-400" />, text: "Daily story drops + evolving avatar system" },
            { icon: <Users className="h-5 w-5 text-purple-400" />, text: "Squad missions + spectator mode with friends" },
            { icon: <Crown className="h-5 w-5 text-yellow-400" />, text: "Choice chains + Hall of Legends ranking" }
          ]
        };
      case 'parent':
        return {
          title: "🎯 Screen Time That Actually Makes Your Child Smarter",
          subtitle: "While other kids waste hours on mindless content, yours will be building critical thinking, vocabulary, and decision-making skills. Finally - guilt-free screen time!",
          heroText: "Transform Screen Time Into Brain Time",
          ctaButton: "✅ Give My Child This Advantage",
          benefits: [
            { icon: <GraduationCap className="h-5 w-5 text-green-400" />, text: "Proven to improve reading & critical thinking" },
            { icon: <Shield className="h-5 w-5 text-blue-400" />, text: "100% safe - no ads, no inappropriate content" },
            { icon: <Star className="h-5 w-5 text-yellow-400" />, text: "Track your child's progress & growth" }
          ]
        };
      default:
        return {
          title: "Finally! Screen Time That Actually Makes Kids Smarter",
          subtitle: "Your child becomes the hero in personalized AI adventures that adapt to their age, interests, and reading level.",
          heroText: "Transform Screen Time Into Brain Time",
          ctaButton: "🚀 Start FREE Adventure Now",
          benefits: [
            { icon: <Shield className="h-5 w-5 text-green-400" />, text: "Zero Risk - 100% Safe" },
            { icon: <Brain className="h-5 w-5 text-blue-400" />, text: "Proven Results - Builds IQ" },
            { icon: <Sparkles className="h-5 w-5 text-purple-400" />, text: "Instant Magic - Perfect Fit" }
          ]
        };
    }
  };

  const content = getAudienceContent();

  return (
    <>
      <Seo
        title="StoryMaster Quest – AI-Powered Interactive Stories for Kids & Teens"
        description="Revolutionary AI storytelling that adapts to your child's age, interests, and reading level. Safe, educational, and endlessly engaging adventures await!"
        canonical="/"
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "VideoGame",
          name: "StoryMaster Quest",
          applicationCategory: "Educational Game",
          genre: ["Interactive Fiction", "Adventure", "Educational"],
          audience: "Children, Teens, Parents",
        }}
      />

      {/* Audience Selector Modal */}
      <Dialog open={showAudienceSelector} onOpenChange={setShowAudienceSelector}>
        <DialogContent className="max-w-2xl bg-gradient-to-br from-primary/10 via-background to-accent/10 border-primary/20">
          <DialogHeader>
            <DialogTitle className="text-3xl font-bold text-center mb-4">
              Welcome to StoryMaster Quest! 🎮✨
            </DialogTitle>
          </DialogHeader>
          <div className="text-center mb-8">
            <p className="text-xl text-muted-foreground mb-8">
              Let's create the perfect experience for you!
            </p>
            <div className="grid gap-4">
              <Button
                size="xl"
                variant="outline"
                onClick={() => handleAudienceSelect('kid')}
                className="h-20 text-lg font-semibold bg-gradient-to-r from-purple-100 to-pink-100 hover:from-purple-200 hover:to-pink-200 border-purple-200 text-purple-800 dark:from-purple-900/30 dark:to-pink-900/30 dark:text-purple-200"
              >
                <div className="flex items-center gap-3">
                  <Crown className="h-8 w-8" />
                  <div>
                    <div>I'm a Kid (Ages 6-11)</div>
                    <div className="text-sm opacity-75">I want epic adventures!</div>
                  </div>
                </div>
              </Button>
              
              <Button
                size="xl"
                variant="outline"
                onClick={() => handleAudienceSelect('teen')}
                className="h-20 text-lg font-semibold bg-gradient-to-r from-blue-100 to-cyan-100 hover:from-blue-200 hover:to-cyan-200 border-blue-200 text-blue-800 dark:from-blue-900/30 dark:to-cyan-900/30 dark:text-blue-200"
              >
                <div className="flex items-center gap-3">
                  <Zap className="h-8 w-8" />
                  <div>
                    <div>I'm a Teen (Ages 12-17)</div>
                    <div className="text-sm opacity-75">I want addictive gameplay!</div>
                  </div>
                </div>
              </Button>
              
              <Button
                size="xl"
                variant="outline"
                onClick={() => handleAudienceSelect('parent')}
                className="h-20 text-lg font-semibold bg-gradient-to-r from-green-100 to-emerald-100 hover:from-green-200 hover:to-emerald-200 border-green-200 text-green-800 dark:from-green-900/30 dark:to-emerald-900/30 dark:text-green-200"
              >
                <div className="flex items-center gap-3">
                  <Heart className="h-8 w-8" />
                  <div>
                    <div>I'm a Parent</div>
                    <div className="text-sm opacity-75">Show me the benefits!</div>
                  </div>
                </div>
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Hero Section - The Big Pitch */}
      <section className="relative min-h-screen w-full overflow-hidden">
        <img
          src={heroLanding}
          alt="Diverse children and teens engaged with magical interactive stories"
          className="absolute inset-0 h-full w-full object-cover"
          loading="eager"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background/30 via-background/50 to-background/70" />
        
        <div className="relative z-10 flex min-h-screen items-center justify-center px-6">
          <div className="max-w-4xl text-center animate-enter">
            <h1 className="font-heading text-5xl md:text-7xl font-extrabold tracking-tight drop-shadow-2xl mb-6">
              {content.title.split('!')[0]}!<br />
              <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                {content.heroText}
              </span>
            </h1>
            <p className="text-xl md:text-2xl text-muted-foreground mb-8 leading-relaxed">
              <strong className="text-foreground text-2xl">{content.subtitle}</strong><br />
              {audience === 'parent' && <span className="text-lg">🛡️ 100% Safe • 🧠 Builds Critical Thinking • ⚡ Instant Results</span>}
              {audience === 'kid' && <span className="text-lg">🌟 Be The Hero • 🏆 Earn Rewards • 🎮 Choose Your Path</span>}
              {audience === 'teen' && <span className="text-lg">⚡ Daily Drops • 🎮 Squad Missions • 👑 Hall of Legends</span>}
              {!audience && <span className="text-lg">🛡️ 100% Safe • 🧠 Builds Critical Thinking • ⚡ Instant Engagement</span>}
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
              <Button
                size="xl"
                variant="hero"
                onClick={() => navigate(user ? "/mission" : "/auth")}
                className="text-lg px-8 py-4 animate-pulse"
              >
                {user ? "Continue Your Quest" : "Play - Join Your Quest"}
              </Button>
              <Button
                size="xl"
                variant="game"
                onClick={() => navigate("/profile?trial=true")}
                className="text-lg px-8 py-4"
              >
                🎮 Try 1 Story Free
              </Button>
              <Button
                size="xl"
                variant="outline"
                onClick={() => document.getElementById('learn-more')?.scrollIntoView({ behavior: 'smooth' })}
                className="text-lg px-8 py-4"
              >
                See How It Works
              </Button>
            </div>
            
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 mb-8 border border-white/20">
              <p className="text-lg font-semibold text-center mb-3">👨‍👩‍👧‍👦 Join 10,000+ Happy Families</p>
              <div className="flex justify-center items-center gap-6 text-sm">
                <span className="flex items-center gap-2">⭐⭐⭐⭐⭐ <strong>4.9/5 Parent Rating</strong></span>
                <span className="flex items-center gap-2">📚 <strong>50,000+ Stories Created</strong></span>
              </div>
            </div>
            
            <div className="flex justify-center items-center gap-8 text-sm text-muted-foreground">
              {content.benefits.map((benefit, index) => (
                <div key={index} className="flex items-center gap-2">
                  {benefit.icon}
                  <span><strong>{benefit.text}</strong></span>
                </div>
              ))}
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
            <h2 className="text-4xl md:text-5xl font-bold mb-6">The Screen Time Revolution Parents Have Been Waiting For</h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              <strong className="text-foreground">Finally!</strong> Technology that makes kids smarter, more creative, and better decision-makers. 
              <span className="text-primary font-semibold">Zero guilt. Maximum growth.</span>
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8 mb-20">
            <div className="glass-panel p-8 text-center hover-scale">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Brain className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-2xl font-bold mb-4">🎯 Perfect For Every Child</h3>
              <p className="text-muted-foreground">
                <strong>Automatic personalization:</strong> Our AI instantly adapts difficulty, vocabulary, and themes to your child's exact level and interests. No setup required.
              </p>
            </div>
            
            <div className="glass-panel p-8 text-center hover-scale">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Shield className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-2xl font-bold mb-4">🛡️ 100% Parent-Approved</h3>
              <p className="text-muted-foreground">
                <strong>Guaranteed safe:</strong> Zero inappropriate content, no ads. Pure educational storytelling with progress tracking, vocabulary building, and character development.
              </p>
            </div>
            
            <div className="glass-panel p-8 text-center hover-scale">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Gamepad2 className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-2xl font-bold mb-4">🧠 Builds Real Skills</h3>
              <p className="text-muted-foreground">
                <strong>Critical thinking in action:</strong> Every choice develops problem-solving, decision-making, and creative thinking. Your child becomes smarter with every story.
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
                    <p className="text-muted-foreground">Builds vocabulary, critical thinking, and creativity while having fun.</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <Shield className="h-4 w-4 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg mb-2">Complete Safety</h3>
                    <p className="text-muted-foreground">Zero inappropriate content, no ads. Safe storytelling with parental progress insights.</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <Star className="h-4 w-4 text-purple-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg mb-2">Progress Tracking</h3>
                    <p className="text-muted-foreground">Watch your child's reading confidence and decision-making skills grow.</p>
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
              
              <div className="grid sm:grid-cols-2 gap-6">
                <div className="glass-panel p-6">
                  <Zap className="h-8 w-8 text-primary mb-3" />
                  <h3 className="font-bold mb-2">Action-Packed</h3>
                  <p className="text-sm text-muted-foreground">Thrilling adventures that keep you on the edge of your seat!</p>
                </div>
                
                <div className="glass-panel p-6">
                  <Users className="h-8 w-8 text-primary mb-3" />
                  <h3 className="font-bold mb-2">Be The Hero</h3>
                  <p className="text-sm text-muted-foreground">You're not just reading – you're the main character!</p>
                </div>
                
                <div className="glass-panel p-6">
                  <Sparkles className="h-8 w-8 text-primary mb-3" />
                  <h3 className="font-bold mb-2">Endless Worlds</h3>
                  <p className="text-sm text-muted-foreground">Space, fantasy, mystery, adventure – pick your favorite!</p>
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
            <strong className="text-foreground">Don't let them fall behind.</strong> While other kids waste time on mindless content, 
            yours will be building critical thinking, vocabulary, and creativity.
          </p>
          
          <div className="bg-primary/10 border border-primary/30 rounded-2xl p-8 mb-8 text-center">
            <p className="text-2xl font-bold text-primary mb-2">⚡ Limited Time: FREE Trial</p>
            <p className="text-lg">No credit card required • Cancel anytime • Instant access</p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-6 justify-center mb-8">
            <Button
              size="xl"
              variant="hero"
              onClick={() => setShowPitch(false)}
              className="text-xl px-12 py-6 animate-pulse"
            >
              🚀 Start FREE Now - Risk Nothing!
            </Button>
          </div>
          
          <div className="bg-muted/30 rounded-2xl p-8 max-w-4xl mx-auto">
            <h3 className="text-2xl font-bold mb-6 text-center">🎯 Core Features Kids & Parents Love</h3>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-primary/20 rounded-full flex items-center justify-center">
                    <Users className="h-4 w-4 text-primary" />
                  </div>
                  <span><strong>Be The Hero:</strong> Your child stars in every adventure</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-primary/20 rounded-full flex items-center justify-center">
                    <Gamepad2 className="h-4 w-4 text-primary" />
                  </div>
                  <span><strong>Choose Your Path:</strong> Every decision shapes the story</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-primary/20 rounded-full flex items-center justify-center">
                    <Star className="h-4 w-4 text-primary" />
                  </div>
                  <span><strong>Unlock Achievements:</strong> Rewards for reading milestones</span>
                </div>
              </div>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-primary/20 rounded-full flex items-center justify-center">
                    <Brain className="h-4 w-4 text-primary" />
                  </div>
                  <span><strong>Builds Vocabulary:</strong> Age-perfect word learning</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-primary/20 rounded-full flex items-center justify-center">
                    <Sparkles className="h-4 w-4 text-primary" />
                  </div>
                  <span><strong>Endless Genres:</strong> Space, fantasy, mystery & more</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-primary/20 rounded-full flex items-center justify-center">
                    <Shield className="h-4 w-4 text-primary" />
                  </div>
                  <span><strong>Progress Tracking:</strong> Watch skills develop daily</span>
                </div>
              </div>
            </div>
          </div>
          
          <p className="text-sm text-muted-foreground mt-8">
            ✅ Instant access • ✅ No payment required • ✅ Cancel anytime
          </p>
        </div>
      </section>
    </>
  );
};

export default Index;
