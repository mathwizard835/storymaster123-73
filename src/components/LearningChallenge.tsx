import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, HelpCircle, Lightbulb, Trophy } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

export interface LearningChallenge {
  id: string;
  type: 'multiple-choice' | 'input' | 'drag-drop' | 'sequence';
  concept: string;
  difficulty: 1 | 2 | 3 | 4 | 5;
  question: string;
  explanation?: string;
  hint?: string;
  options?: string[];
  correctAnswer: string | string[];
  points: number;
}

interface LearningChallengeProps {
  challenge: LearningChallenge;
  onComplete: (correct: boolean, answer: string) => void;
  onSkip?: () => void;
}

export const LearningChallengeComponent = ({ 
  challenge, 
  onComplete, 
  onSkip 
}: LearningChallengeProps) => {
  const [selectedAnswer, setSelectedAnswer] = useState<string>("");
  const [showHint, setShowHint] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [timeLeft, setTimeLeft] = useState(60); // 60 seconds per challenge
  const { toast } = useToast();

  useEffect(() => {
    if (timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [timeLeft]);

  const handleSubmit = () => {
    const isCorrect = Array.isArray(challenge.correctAnswer) 
      ? challenge.correctAnswer.includes(selectedAnswer)
      : challenge.correctAnswer === selectedAnswer;
    
    setAttempts(prev => prev + 1);
    
    if (isCorrect) {
      toast({
        title: "Excellent! 🎉",
        description: `You earned ${challenge.points} knowledge points!`,
        duration: 3000,
      });
      onComplete(true, selectedAnswer);
    } else {
      if (attempts >= 2) {
        toast({
          title: "Keep Learning! 📚",
          description: challenge.explanation || "Don't worry, practice makes perfect!",
          duration: 4000,
        });
        onComplete(false, selectedAnswer);
      } else {
        toast({
          title: "Not quite right",
          description: "Try again! You've got this! 💪",
          variant: "destructive",
          duration: 3000,
        });
      }
    }
  };

  const getDifficultyColor = (difficulty: number) => {
    if (difficulty <= 2) return "bg-green-500";
    if (difficulty <= 3) return "bg-yellow-500";
    return "bg-red-500";
  };

  const renderChallengeContent = () => {
    switch (challenge.type) {
      case 'multiple-choice':
        return (
          <div className="space-y-3">
            {challenge.options?.map((option, index) => (
              <Button
                key={index}
                variant={selectedAnswer === option ? "default" : "outline"}
                className="w-full text-left justify-start"
                onClick={() => setSelectedAnswer(option)}
              >
                {option}
              </Button>
            ))}
          </div>
        );
      
      case 'input':
        return (
          <input
            type="text"
            className="w-full p-3 border rounded-md"
            placeholder="Type your answer here..."
            value={selectedAnswer}
            onChange={(e) => setSelectedAnswer(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSubmit()}
          />
        );
      
      default:
        return <p>Challenge type not implemented yet</p>;
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="flex items-center gap-2">
              <HelpCircle className="h-5 w-5" />
              Learning Challenge
            </CardTitle>
            <div className="flex items-center gap-2 mt-2">
              <Badge variant="secondary">{challenge.concept}</Badge>
              <div className="flex items-center gap-1">
                {[...Array(challenge.difficulty)].map((_, i) => (
                  <div
                    key={i}
                    className={`w-2 h-2 rounded-full ${getDifficultyColor(challenge.difficulty)}`}
                  />
                ))}
              </div>
              <Badge variant="outline">
                <Trophy className="h-3 w-3 mr-1" />
                {challenge.points} pts
              </Badge>
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm text-muted-foreground">Time</div>
            <div className="text-lg font-mono">{timeLeft}s</div>
          </div>
        </div>
        <Progress value={(60 - timeLeft) / 60 * 100} className="mt-2" />
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="p-4 bg-accent/50 rounded-lg">
          <p className="text-lg font-medium">{challenge.question}</p>
        </div>

        {renderChallengeContent()}

        {showHint && challenge.hint && (
          <div className="p-3 bg-blue-50 border-l-4 border-blue-400 rounded">
            <div className="flex items-start gap-2">
              <Lightbulb className="h-4 w-4 text-blue-600 mt-0.5" />
              <p className="text-sm text-blue-800">{challenge.hint}</p>
            </div>
          </div>
        )}

        <div className="flex justify-between gap-2">
          {challenge.hint && !showHint && (
            <Button
              variant="ghost" 
              size="sm"
              onClick={() => setShowHint(true)}
              className="text-muted-foreground"
            >
              <Lightbulb className="h-4 w-4 mr-1" />
              Hint
            </Button>
          )}
          
          <div className="flex gap-2 ml-auto">
            {onSkip && (
              <Button variant="outline" onClick={onSkip}>
                Skip for Now
              </Button>
            )}
            <Button 
              onClick={handleSubmit} 
              disabled={!selectedAnswer.trim() || timeLeft === 0}
            >
              Submit Answer
            </Button>
          </div>
        </div>

        {attempts > 0 && (
          <div className="text-sm text-muted-foreground text-center">
            Attempt {attempts}/3
          </div>
        )}
      </CardContent>
    </Card>
  );
};