import { useNavigate } from "react-router-dom";
import { Seo } from "@/components/Seo";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { loadAllUserStoriesFromDatabase, markStoryCompletedInDatabase, type DatabaseStory } from "@/lib/databaseStory";
import { cacheStoriesOffline, loadOfflineStories, isOnline } from "@/lib/offlineStories";
import { Clock, Star, ArrowLeft, BookOpen, Play, Loader2, WifiOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useDevice } from "@/contexts/DeviceContext";
import { useAuth } from "@/hooks/useAuth";
import { addHapticFeedback } from "@/lib/mobileFeatures";
import { useSwipeBack } from "@/hooks/useSwipeBack";
import { SwipeBackIndicator } from "@/components/SwipeBackIndicator";
import { NativeNavigationHeader } from "@/components/NativeNavigationHeader";
import { SkeletonCard } from "@/components/SkeletonCard";
import { useState, useEffect, useRef } from "react";

const StoryGallery = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isPhone, isNative } = useDevice();
  const backPath = isNative ? '/dashboard' : '/';
  const { user } = useAuth();
  const [stories, setStories] = useState<DatabaseStory[]>([]);
  const [loading, setLoading] = useState(true);
  const [offline, setOffline] = useState(false);
  const mainRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const loadStories = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      // Try online first, fall back to offline cache
      if (isOnline()) {
        try {
          const allStories = await loadAllUserStoriesFromDatabase();

          // Self-heal: any story that has reached the last scene or has completed_at
          // but is not yet flagged completed should be marked completed in DB.
          // Self-heal: only stories explicitly stamped with completed_at but missing
          // 'completed' status. The scene-count heuristic was too eager and would
          // auto-complete stories the user had reached the end of but hadn't clicked
          // Finish Adventure on yet (losing their quiz/XP opportunity).
          const toHeal = allStories.filter((s) => s.status !== 'completed' && !!s.completed_at);
          if (toHeal.length > 0) {
            await Promise.all(
              toHeal.map((s) =>
                markStoryCompletedInDatabase(s.id).catch((err) =>
                  console.warn('Failed to self-heal story status:', s.id, err)
                )
              )
            );
            for (const s of allStories) {
              if (toHeal.find((h) => h.id === s.id)) {
                (s as DatabaseStory).status = 'completed';
                if (!s.completed_at) (s as DatabaseStory).completed_at = new Date().toISOString();
              }
            }
          }

          setStories(allStories);
          // Cache completed stories for offline use
          const completed = allStories.filter(s => s.status === 'completed');
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

  const { swipeProgress } = useSwipeBack();

  return (
    <>
      <SwipeBackIndicator progress={swipeProgress} />
      <Seo
        title="StoryMaster Kids – Story Gallery"
        description="View your completed adventures and story achievements."
        canonical="/gallery"
      />
      
      <main ref={mainRef} className="min-h-screen bg-background overflow-x-hidden">
        {/* Native iOS-style header */}
        {isPhone && isNative && (
          <NativeNavigationHeader
            title="Story Gallery"
            subtitle={`${stories.length} completed adventures`}
            scrollRef={mainRef as React.RefObject<HTMLDivElement>}
            leftAction={
              <button onClick={() => { addHapticFeedback('light'); navigate(backPath); }} className="p-1">
                <ArrowLeft className="h-5 w-5 text-primary" />
              </button>
            }
          />
        )}
        <div className="container py-8 pb-24 md:pb-8">
          {/* Mobile Header (web only) */}
          {isPhone && !isNative ? (
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
          ) : !isPhone ? (
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
          ) : null}

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

          {offline && (
            <div className="flex items-center gap-2 mb-4 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-200">
              <WifiOff className="h-4 w-4 flex-shrink-0" />
              <span className="text-sm">You're offline — showing cached stories</span>
            </div>
          )}

          {loading ? (
            <div className="grid gap-4 tablet:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3, 4].map(i => <SkeletonCard key={i} />)}
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
                const isCompleted =
                  story.status === 'completed' || !!story.completed_at;
                return (
                  <Card key={story.id} className={`glass-panel border-0 min-w-0 ${!isCompleted ? 'ring-1 ring-primary/30' : ''}`}>
                    <CardHeader className="min-w-0">
                      <CardTitle className="text-lg flex items-center gap-2 min-w-0 break-words">
                        <span className="break-words min-w-0 flex-1">{story.title || 'Untitled Adventure'}</span>
                        {!isCompleted && (
                          <Badge variant="secondary" className="bg-primary/20 text-primary text-xs shrink-0">In Progress</Badge>
                        )}
                      </CardTitle>
                      <CardDescription className="flex items-center gap-2">
                        <Clock className="h-4 w-4 shrink-0" />
                        {formatDate(story.completed_at || story.last_played_at)}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="min-w-0">
                      <div className="space-y-4 min-w-0">
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
                          <div className="min-w-0">
                            <span className="text-muted-foreground">Scenes:</span>
                            <div className="font-semibold">{story.scene_count || 0}</div>
                          </div>
                          <div className="min-w-0">
                            <span className="text-muted-foreground">Status:</span>
                            <div className="font-semibold capitalize">{isCompleted ? 'completed' : story.status}</div>
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

                        {!isCompleted ? (
                          <Button
                            onClick={() => {
                              addHapticFeedback('light');
                              navigate(`/mission?resume=${story.id}`);
                            }}
                            variant="hero"
                            size="sm"
                            className="w-full"
                          >
                            <Play className="h-4 w-4 mr-1" /> Continue Story
                          </Button>
                        ) : null}
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
