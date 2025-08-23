import { useNavigate } from "react-router-dom";
import { Seo } from "@/components/Seo";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getCompletedStories, type CompletedStory } from "@/lib/story";
import { Clock, Star, ArrowLeft, BookOpen } from "lucide-react";

const StoryGallery = () => {
  const navigate = useNavigate();
  const completedStories = getCompletedStories();

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
        title="StoryMaster Quest – Story Gallery"
        description="View your completed adventures and story achievements."
        canonical="/gallery"
      />
      
      <main className="min-h-screen bg-background">
        <div className="container py-8">
          <div className="flex items-center gap-4 mb-8">
            <Button 
              variant="ghost" 
              onClick={() => navigate("/")}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Home
            </Button>
          </div>

          <div className="mb-8">
            <h1 className="font-heading text-3xl md:text-4xl font-extrabold">
              📚 Story Gallery
            </h1>
            <p className="text-muted-foreground mt-2">
              Your completed adventures and achievements
            </p>
          </div>

          {completedStories.length === 0 ? (
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
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {completedStories.map((story) => (
                <Card key={story.id} className="glass-panel border-0">
                  <CardHeader>
                    <CardTitle className="text-lg">{story.title}</CardTitle>
                    <CardDescription className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      {formatDate(story.completedAt)}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex flex-wrap gap-2">
                        {story.profile.selectedBadges.slice(0, 3).map((badge) => (
                          <Badge 
                            key={badge} 
                            className={getBadgeColor(badge)}
                            variant="secondary"
                          >
                            {badge}
                          </Badge>
                        ))}
                        {story.profile.selectedBadges.length > 3 && (
                          <Badge variant="secondary">
                            +{story.profile.selectedBadges.length - 3} more
                          </Badge>
                        )}
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">Scenes:</span>
                          <div className="font-semibold">{story.sceneCount}</div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Choices:</span>
                          <div className="font-semibold">{story.choicesMade.length}</div>
                        </div>
                      </div>

                      <div className="pt-2 border-t">
                        <div className="text-sm text-muted-foreground">
                          Age: {story.profile.age} • {story.profile.reading} level • {story.profile.mode} mode
                        </div>
                        {story.profile.topic && (
                          <div className="text-sm text-muted-foreground mt-1">
                            Topic: {story.profile.topic}
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>
    </>
  );
};

export default StoryGallery;