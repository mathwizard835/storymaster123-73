import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen, Trophy, Zap, Target, Star } from "lucide-react";
import { LearningProgressHelp } from "./LearningProgressHelp";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export interface LearningConcept {
  id: string;
  name: string;
  category: 'math' | 'science' | 'reading' | 'history' | 'critical-thinking';
  mastery: number; // 0-100
  attempts: number;
  lastPracticed: string;
}

interface LearningProgressProps {
  concepts: LearningConcept[];
  currentTopic?: string;
  onConceptClick?: (concept: LearningConcept) => void;
}

export const LearningProgress = ({ concepts, currentTopic, onConceptClick }: LearningProgressProps) => {
  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'math': return <Target className="h-4 w-4" />;
      case 'science': return <Zap className="h-4 w-4" />;
      case 'reading': return <BookOpen className="h-4 w-4" />;
      case 'history': return <Trophy className="h-4 w-4" />;
      default: return <Star className="h-4 w-4" />;
    }
  };

  const getMasteryColor = (mastery: number) => {
    if (mastery >= 80) return "bg-green-500";
    if (mastery >= 60) return "bg-yellow-500";
    if (mastery >= 40) return "bg-orange-500";
    return "bg-red-500";
  };

  const getMasteryLevel = (mastery: number) => {
    if (mastery >= 90) return "Master";
    if (mastery >= 75) return "Expert"; 
    if (mastery >= 50) return "Learning";
    return "Beginner";
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Learning Progress
            {currentTopic && <Badge variant="secondary">{currentTopic}</Badge>}
          </div>
          <TooltipProvider>
            <Tooltip delayDuration={300}>
              <TooltipTrigger asChild>
                <div>
                  <LearningProgressHelp />
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>Learn more about Learning Progress</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {concepts.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            Start your learning adventure to track your progress!
          </p>
        ) : (
          <div className="space-y-3">
            {concepts.map((concept) => (
              <div
                key={concept.id}
                className={`p-3 rounded-lg border cursor-pointer transition-colors hover:bg-accent ${
                  onConceptClick ? 'hover:shadow-sm' : ''
                }`}
                onClick={() => onConceptClick?.(concept)}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {getCategoryIcon(concept.category)}
                    <span className="font-medium text-sm">{concept.name}</span>
                  </div>
                  <Badge variant={concept.mastery >= 75 ? "default" : "secondary"}>
                    {getMasteryLevel(concept.mastery)}
                  </Badge>
                </div>
                
                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Progress</span>
                    <span>{concept.mastery}%</span>
                  </div>
                  <Progress 
                    value={concept.mastery} 
                    className="h-2"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{concept.attempts} attempts</span>
                    <span>Last: {new Date(concept.lastPracticed).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};