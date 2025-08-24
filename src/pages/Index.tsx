import { Button } from "@/components/ui/button";
import { Seo } from "@/components/Seo";
import heroLanding from "@/assets/hero-landing.jpg";
import familyReading from "@/assets/family-reading.jpg";
import storyGenres from "@/assets/story-genres.jpg";
import heroPortal from "@/assets/hero-portal.jpg";
import { useNavigate } from "react-router-dom";
import { getCompletedStories } from "@/lib/story";
import { BookOpen, Star, Shield, Zap, Heart, Brain, Gamepad2, Users, Sparkles, ChevronDown } from "lucide-react";
import { useState } from "react";

const Index = () => {
  const navigate = useNavigate();
  const completedStories = getCompletedStories();
  const [showPitch, setShowPitch] = useState(true);

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
                  <>
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
                    <Button
                      onClick={() => navigate("/achievements")}
                      variant="outline"
                      size="xl"
                    >
                      🏆 Achievements
                    </Button>
                  </>
                )}
              </div>
            </div>
          </section>
        </main>
      </>
    );
  }

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
              Where Every Story<br />
              <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                Becomes Your Adventure
              </span>
            </h1>
            <p className="text-xl md:text-2xl text-muted-foreground mb-8 leading-relaxed">
              Revolutionary AI storytelling that adapts to your child's age, interests, and reading level.<br />
              <strong className="text-foreground">Safe. Educational. Endlessly Engaging.</strong>
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
              <Button
                size="xl"
                variant="hero"
                onClick={() => setShowPitch(false)}
                className="text-lg px-8 py-4"
              >
                🎮 Start Your Adventure
              </Button>
              <Button
                size="xl"
                variant="outline"
                onClick={() => document.getElementById('learn-more')?.scrollIntoView({ behavior: 'smooth' })}
                className="text-lg px-8 py-4"
              >
                Learn More
              </Button>
            </div>
            
            <div className="flex justify-center items-center gap-8 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-green-400" />
                <span>100% Safe Content</span>
              </div>
              <div className="flex items-center gap-2">
                <Brain className="h-5 w-5 text-blue-400" />
                <span>Educational & Fun</span>
              </div>
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-purple-400" />
                <span>Personalized Stories</span>
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
            <h2 className="text-4xl md:text-5xl font-bold mb-6">Why Parents & Kids Love StoryMaster</h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              More than entertainment – we're building tomorrow's creative thinkers, one story at a time.
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8 mb-20">
            <div className="glass-panel p-8 text-center hover-scale">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Brain className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-2xl font-bold mb-4">Adaptive Learning</h3>
              <p className="text-muted-foreground">
                Our AI adjusts complexity, vocabulary, and themes to perfectly match your child's reading level and interests.
              </p>
            </div>
            
            <div className="glass-panel p-8 text-center hover-scale">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Shield className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-2xl font-bold mb-4">Parent-Safe Content</h3>
              <p className="text-muted-foreground">
                Every story is carefully crafted to be age-appropriate, educational, and free from inappropriate content.
              </p>
            </div>
            
            <div className="glass-panel p-8 text-center hover-scale">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Gamepad2 className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-2xl font-bold mb-4">Interactive Choices</h3>
              <p className="text-muted-foreground">
                Every decision matters! Kids develop critical thinking by shaping their own unique adventure paths.
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
                    <p className="text-muted-foreground">No inappropriate content, no ads, no social features. Just pure storytelling.</p>
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
          <h2 className="text-4xl md:text-5xl font-bold mb-6">Ready to Begin Your Adventure?</h2>
          <p className="text-xl text-muted-foreground mb-12">
            Join thousands of young adventurers already exploring their personalized story worlds.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-6 justify-center mb-8">
            <Button
              size="xl"
              variant="hero"
              onClick={() => setShowPitch(false)}
              className="text-xl px-12 py-6"
            >
              🎮 Start My First Story
            </Button>
          </div>
          
          <p className="text-sm text-muted-foreground">
            Free to try • Safe for all ages • Educational & fun
          </p>
        </div>
      </section>
    </>
  );
};

export default Index;
