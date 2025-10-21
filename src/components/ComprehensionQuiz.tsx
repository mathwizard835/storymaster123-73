import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { QuizQuestion, calculateQuizScore, getQuizXPReward, saveQuizResult } from "@/lib/quizSystem";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { CheckCircle2, XCircle, Trophy, Sparkles } from "lucide-react";
import { Progress } from "@/components/ui/progress";

type ComprehensionQuizProps = {
  open: boolean;
  onClose: () => void;
  questions: QuizQuestion[];
  storyId: string;
  storyTitle: string;
  onComplete: (xpEarned: number) => void;
};

export const ComprehensionQuiz = ({
  open,
  onClose,
  questions,
  storyId,
  storyTitle,
  onComplete,
}: ComprehensionQuizProps) => {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [showResults, setShowResults] = useState(false);
  const [score, setScore] = useState(0);
  const [totalPoints, setTotalPoints] = useState(0);

  const currentQuestion = questions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / questions.length) * 100;

  const handleAnswer = (answer: string) => {
    setAnswers(prev => ({ ...prev, [currentQuestion.id]: answer }));
  };

  const handleNext = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    } else {
      // Calculate and show results
      const result = calculateQuizScore(questions, answers);
      setScore(result.score);
      setTotalPoints(result.totalPoints);
      setShowResults(true);

      // Save quiz result
      saveQuizResult({
        storyId,
        storyTitle,
        questions,
        answers,
        score: result.score,
        totalPoints: result.totalPoints,
        completedAt: new Date().toISOString(),
      });
    }
  };

  const handleFinish = () => {
    const xpReward = getQuizXPReward(score, totalPoints);
    onComplete(xpReward);
    onClose();
    // Reset state
    setCurrentQuestionIndex(0);
    setAnswers({});
    setShowResults(false);
  };

  const percentage = totalPoints > 0 ? Math.round((score / totalPoints) * 100) : 0;
  const isPerfect = score === totalPoints;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <Trophy className="h-6 w-6 text-yellow-500" />
            Comprehension Quiz
          </DialogTitle>
          <DialogDescription>
            Test your understanding of the story and earn bonus XP!
          </DialogDescription>
        </DialogHeader>

        {!showResults ? (
          <div className="space-y-6">
            {/* Progress Bar */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Question {currentQuestionIndex + 1} of {questions.length}</span>
                <span>{Math.round(progress)}% Complete</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>

            {/* Question */}
            <div className="bg-muted/50 rounded-lg p-6 space-y-4">
              <h3 className="text-lg font-semibold">{currentQuestion.question}</h3>

              {currentQuestion.type === 'multiple-choice' && currentQuestion.options && (
                <RadioGroup
                  value={answers[currentQuestion.id] || ""}
                  onValueChange={handleAnswer}
                  className="space-y-3"
                >
                  {currentQuestion.options.map((option, idx) => (
                    <div key={idx} className="flex items-center space-x-3 bg-background rounded-lg p-3 border border-border hover:border-primary transition-colors">
                      <RadioGroupItem value={option} id={`option-${idx}`} />
                      <Label htmlFor={`option-${idx}`} className="flex-1 cursor-pointer">
                        {option}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              )}

              {currentQuestion.type === 'true-false' && (
                <RadioGroup
                  value={answers[currentQuestion.id] || ""}
                  onValueChange={handleAnswer}
                  className="space-y-3"
                >
                  <div className="flex items-center space-x-3 bg-background rounded-lg p-3 border border-border hover:border-primary transition-colors">
                    <RadioGroupItem value="true" id="true-option" />
                    <Label htmlFor="true-option" className="flex-1 cursor-pointer">
                      True
                    </Label>
                  </div>
                  <div className="flex items-center space-x-3 bg-background rounded-lg p-3 border border-border hover:border-primary transition-colors">
                    <RadioGroupItem value="false" id="false-option" />
                    <Label htmlFor="false-option" className="flex-1 cursor-pointer">
                      False
                    </Label>
                  </div>
                </RadioGroup>
              )}
            </div>

            {/* Navigation */}
            <div className="flex justify-between">
              <Button
                variant="outline"
                onClick={() => setCurrentQuestionIndex(prev => Math.max(0, prev - 1))}
                disabled={currentQuestionIndex === 0}
              >
                Previous
              </Button>
              <Button
                onClick={handleNext}
                disabled={!answers[currentQuestion.id]}
              >
                {currentQuestionIndex === questions.length - 1 ? "Finish Quiz" : "Next Question"}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Results Header */}
            <div className={`text-center p-8 rounded-lg ${isPerfect ? 'bg-gradient-to-r from-yellow-500/20 to-orange-500/20' : 'bg-muted/50'}`}>
              {isPerfect && (
                <div className="flex justify-center mb-4">
                  <Sparkles className="h-16 w-16 text-yellow-500 animate-pulse" />
                </div>
              )}
              <h2 className="text-3xl font-bold mb-2">
                {isPerfect ? "Perfect Score! 🎉" : `${percentage}% Correct`}
              </h2>
              <p className="text-lg text-muted-foreground mb-4">
                You scored {score} out of {totalPoints} points
              </p>
              <div className="text-2xl font-bold text-primary">
                +{getQuizXPReward(score, totalPoints)} XP Earned!
              </div>
            </div>

            {/* Answer Review */}
            <div className="space-y-4">
              <h3 className="font-semibold text-lg">Review Your Answers</h3>
              {questions.map((question, idx) => {
                const userAnswer = answers[question.id];
                const isCorrect = userAnswer?.toLowerCase().trim() === question.correctAnswer.toLowerCase().trim();
                
                return (
                  <div key={question.id} className="bg-muted/50 rounded-lg p-4 space-y-2">
                    <div className="flex items-start gap-3">
                      {isCorrect ? (
                        <CheckCircle2 className="h-5 w-5 text-green-500 mt-1 flex-shrink-0" />
                      ) : (
                        <XCircle className="h-5 w-5 text-red-500 mt-1 flex-shrink-0" />
                      )}
                      <div className="flex-1">
                        <p className="font-medium mb-1">Q{idx + 1}. {question.question}</p>
                        <p className={isCorrect ? "text-green-600" : "text-red-600"}>
                          Your answer: {userAnswer || "No answer"}
                        </p>
                        {!isCorrect && (
                          <p className="text-green-600">
                            Correct answer: {question.correctAnswer}
                          </p>
                        )}
                        {question.explanation && (
                          <p className="text-sm text-muted-foreground mt-2">
                            {question.explanation}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Finish Button */}
            <Button onClick={handleFinish} className="w-full" size="lg">
              Collect XP & Continue
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
