import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Crown, Zap, Heart, Lightbulb, Palette, Users, Swords, TrendingUp } from "lucide-react";
import { CharacterStats } from "@/lib/character";

interface CharacterSheetProps {
  character: CharacterStats;
}

export const CharacterSheet = ({ character }: CharacterSheetProps) => {
  const getAttributeIcon = (attribute: string) => {
    switch (attribute) {
      case 'courage': return <Swords className="h-4 w-4" />;
      case 'wisdom': return <Lightbulb className="h-4 w-4" />;
      case 'creativity': return <Palette className="h-4 w-4" />;
      case 'leadership': return <Crown className="h-4 w-4" />;
      case 'empathy': return <Heart className="h-4 w-4" />;
      default: return <TrendingUp className="h-4 w-4" />;
    }
  };

  const getAttributeColor = (attribute: string) => {
    switch (attribute) {
      case 'courage': return 'text-red-500';
      case 'wisdom': return 'text-blue-500';
      case 'creativity': return 'text-purple-500';
      case 'leadership': return 'text-amber-500';
      case 'empathy': return 'text-pink-500';
      default: return 'text-gray-500';
    }
  };

  const getAttributeLabel = (key: string) => {
    return key.charAt(0).toUpperCase() + key.slice(1);
  };

  return (
    <Card className="glass-panel border-0">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Crown className="h-5 w-5 text-amber-500" />
          Character Sheet
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Level & XP */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Crown className="h-5 w-5 text-amber-500" />
              <span className="font-semibold">Level {character.level}</span>
            </div>
            {character.skillPoints > 0 && (
              <Badge variant="secondary" className="bg-green-100 text-green-800">
                <Zap className="h-3 w-3 mr-1" />
                {character.skillPoints} Skill Points
              </Badge>
            )}
          </div>
          <div className="space-y-1">
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>XP to Level {character.level + 1}</span>
              <span>{character.experience} / {character.experienceToNext}</span>
            </div>
            <Progress 
              value={(character.experience / character.experienceToNext) * 100} 
              className="h-2"
            />
          </div>
        </div>

        {/* Titles */}
        {character.titles.length > 0 && (
          <div className="space-y-2">
            <div className="text-sm font-semibold text-muted-foreground">Titles Earned</div>
            <div className="flex flex-wrap gap-2">
              {character.titles.map((title) => (
                <Badge 
                  key={title} 
                  variant="outline"
                  className="bg-gradient-to-r from-amber-50 to-amber-100 dark:from-amber-950 dark:to-amber-900 border-amber-300 text-amber-900 dark:text-amber-100"
                >
                  ✨ {title}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Attributes */}
        <div className="space-y-3">
          <div className="text-sm font-semibold text-muted-foreground">Attributes</div>
          {Object.entries(character.attributes).map(([key, value]) => (
            <div key={key} className="space-y-1">
              <div className="flex justify-between items-center text-sm">
                <div className="flex items-center gap-2">
                  <span className={getAttributeColor(key)}>
                    {getAttributeIcon(key)}
                  </span>
                  <span className="font-medium">{getAttributeLabel(key)}</span>
                </div>
                <span className="font-bold">{value}</span>
              </div>
              <Progress 
                value={Math.min((value / 20) * 100, 100)} 
                className="h-1.5"
              />
            </div>
          ))}
        </div>

        {/* Favorite Themes */}
        {character.favoriteThemes.length > 0 && (
          <div className="space-y-2">
            <div className="text-sm font-semibold text-muted-foreground">Favorite Themes</div>
            <div className="flex flex-wrap gap-2">
              {character.favoriteThemes.map((theme) => (
                <Badge key={theme} variant="secondary">
                  {theme}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
