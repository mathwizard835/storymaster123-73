import { useNavigate } from "react-router-dom";
import { Seo } from "@/components/Seo";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { loadCompletedStoriesFromDatabase, type DatabaseStory } from "@/lib/databaseStory";
import { cacheStoriesOffline, loadOfflineStories, isOnline } from "@/lib/offlineStories";
import { Clock, Star, ArrowLeft, BookOpen, Play, Loader2, WifiOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useDevice } from "@/contexts/DeviceContext";
import { useAuth } from "@/hooks/useAuth";
import { addHapticFeedback } from "@/lib/mobileFeatures";
import { useSwipeBack } from "@/hooks/useSwipeBack";
import { SwipeBackIndicator } from "@/components/SwipeBackIndicator";
import { useState, useEffect } from "react";

const StoryGallery = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isPhone, isNative } = useDevice();
  const backPath = isNative ? '/dashboard' : '/';
  const { user } = useAuth();
  const [stories, setStories] = useState<DatabaseStory[]>([]);
  const [loading, setLoading] = useState(true);
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    const loadStories = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      // Try online first, fall back to offline cache
      if (isOnline()) {
        try {
          const completed = await loadCompletedStoriesFromDatabase();
          setStories(completed);
          // Cache for offline use
          await cacheStoriesOffline(completed);
        } catch (e) {
          console.error('Failed to load gallery stories:', e);
          // Fall back to offline cache
          const cached = await loadOfflineStories();
          if (cached.length > 0) {
            setStories(cached);
            setOffline(true);
          } else {
            toast({
              title: "Error",
              description: "Failed to load your stories. Please try again.",
              variant: "destructive",
            });
          }
        }
      } else {
        // Offline mode
        const cached = await loadOfflineStories();
        setStories(cached);
        setOffline(true);
      }

      setLoading(false);
    };
    loadStories();
  }, [user, toast]);

  const formatDate = (dateString: string) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(new Date(dateString));
  };

  const getBadgeColor = (badge: string) => {
    const colors: Record<string, string> = {
      mystic: 'bg-purple-100 text-purple-800',
      beast: 'bg-green-100 text-green-800',
      detective: 'bg-blue-100 text-blue-800',
      action: 'bg-red-100 text-red-800',
      social: 'bg-amber-100 text-amber-800',
      creative: 'bg-pink-100 text-pink-800',
      space: 'bg-cyan-100 text-cyan-800',
    };
    return colors[badge] || 'bg-gray-100 text-gray-800';
  };

  return (
    <>
      <Seo
        title="StoryMaster Kids – Story Gallery"
        description="View your completed adventures and story achievements."
        canonical="/gallery"
      />
      
      <main className="min-h-screen bg-background">
        <div className="container py-8 pb-24 md:pb-8">
          {/* Mobile Header */}
          {isPhone ? (
            <div className="flex items-center gap-3 mb-6">
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => { addHapticFeedback('light'); navigate(backPath); }}
                className="h-10 w-10"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <h1 className="font-heading text-2xl font-extrabold">
                📚 Story Gallery ({stories.length})
              </h1>
            </div>
          ) : (
            <div className="flex items-center gap-4 mb-8">
            <Button 
              variant="ghost" 
              onClick={() => navigate(backPath)}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
          </div>
          )}

          {!isPhone && (
            <div className="mb-8">
            <h1 className="font-heading text-3xl md:text-4xl font-extrabold">
              📚 Story Gallery ({stories.length})
            </h1>
            <p className="text-muted-foreground mt-2">
              Your completed adventures and achievements
            </p>
          </div>
          )}

          {loading ? (
            <div className="text-center py-12">
              <Loader2 className="h-12 w-12 mx-auto text-muted-foreground mb-4 animate-spin" />
              <p className="text-muted-foreground">Loading your stories...</p>
            </div>
          ) : stories.length === 0 ? (
            <div className="text-center py-12">
              <div className="glass-panel rounded-xl p-8 max-w-md mx-auto">
                <BookOpen className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                <h2 className="text-xl font-semibold mb-2">No Stories Yet</h2>
                <p className="text-muted-foreground mb-6">
                  Complete your first adventure to see it here!
                </p>
                <Button 
                  onClick={() => navigate("/profile")}
                  variant="hero"
                >
                  Start Your First Story
                </Button>
              </div>
            </div>
          ) : (
            <div className="grid gap-6 tablet:grid-cols-2 lg:grid-cols-3 auto-rows-fr">
              {stories.map((story) => {
                const profile = story.profile as any;
                return (
                  <Card key={story.id} className="glass-panel border-0">
                    <CardHeader>
                      <CardTitle className="text-lg">{story.title || 'Untitled Adventure'}</CardTitle>
                      <CardDescription className="flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        {formatDate(story.completed_at || story.last_played_at)}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="flex flex-wrap gap-2">
                          {(profile?.selectedBadges || []).slice(0, 3).map((badge: string) => (
                            <Badge 
                              key={badge} 
                              className={getBadgeColor(badge)}
                              variant="secondary"
                            >
                              {badge}
                            </Badge>
                          ))}
                          {(profile?.selectedBadges || []).length > 3 && (
                            <Badge variant="secondary">
                              +{profile.selectedBadges.length - 3} more
                            </Badge>
                          )}
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-muted-foreground">Scenes:</span>
                            <div className="font-semibold">{story.scene_count || 0}</div>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Status:</span>
                            <div className="font-semibold capitalize">{story.status}</div>
                          </div>
                        </div>

                        <div className="pt-2 border-t">
                          <div className="text-sm text-muted-foreground">
                            Age: {profile?.age || '?'} • {profile?.lexileScore ?? 500}L • {profile?.mode || 'thrill'} mode
                          </div>
                          {profile?.topic && (
                            <div className="text-sm text-muted-foreground mt-1">
                              Topic: {profile.topic}
                            </div>
                          )}
                        </div>

                        <Button
                          onClick={() => {
                            const storyText = `${story.title || 'Untitled Adventure'}\n\nCompleted: ${formatDate(story.completed_at || story.last_played_at)}\nScenes: ${story.scene_count}\n\nThis adventure was generated by StoryMaster Kids!`;
                            navigator.clipboard.writeText(storyText);
                            toast({
                              title: "Story copied!",
                              description: "Story details copied to clipboard",
                            });
                          }}
                          variant="outline"
                          size="sm"
                          className="w-full"
                        >
                          📤 Share Story
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </>
  );
};

export default StoryGallery;
