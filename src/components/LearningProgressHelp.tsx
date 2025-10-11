import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { HelpCircle, BookOpen, Target, TrendingUp, Award } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export const LearningProgressHelp = () => {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
          <HelpCircle className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            What is Learning Progress?
          </DialogTitle>
          <DialogDescription>
            Track your educational journey through interactive stories
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Overview */}
          <div className="space-y-2">
            <h3 className="font-semibold flex items-center gap-2">
              <Target className="h-4 w-4" />
              Overview
            </h3>
            <p className="text-sm text-muted-foreground">
              Learning Progress tracks educational concepts you encounter during your adventures
              in <Badge variant="secondary">Learning Mode</Badge>. As you make choices and solve
              challenges, your mastery of different subjects improves.
            </p>
          </div>

          {/* How It Works */}
          <div className="space-y-2">
            <h3 className="font-semibold flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              How Mastery Works
            </h3>
            <div className="space-y-3 text-sm text-muted-foreground">
              <div className="flex items-start gap-2">
                <div className="bg-primary/10 rounded-full p-1 mt-0.5">
                  <div className="h-2 w-2 rounded-full bg-primary" />
                </div>
                <div>
                  <p className="font-medium text-foreground">Correct Answers</p>
                  <p>Increase mastery by 5-20% depending on your current level</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <div className="bg-primary/10 rounded-full p-1 mt-0.5">
                  <div className="h-2 w-2 rounded-full bg-primary" />
                </div>
                <div>
                  <p className="font-medium text-foreground">Practice Makes Perfect</p>
                  <p>Each attempt helps you learn, even if you make mistakes</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <div className="bg-primary/10 rounded-full p-1 mt-0.5">
                  <div className="h-2 w-2 rounded-full bg-primary" />
                </div>
                <div>
                  <p className="font-medium text-foreground">Track Your Journey</p>
                  <p>See exactly when you last practiced each concept</p>
                </div>
              </div>
            </div>
          </div>

          {/* Mastery Levels */}
          <div className="space-y-2">
            <h3 className="font-semibold flex items-center gap-2">
              <Award className="h-4 w-4" />
              Mastery Levels
            </h3>
            <div className="grid grid-cols-2 gap-2">
              <div className="border rounded-lg p-3">
                <Badge variant="secondary" className="mb-1">Beginner</Badge>
                <p className="text-xs text-muted-foreground">0-49% mastery</p>
              </div>
              <div className="border rounded-lg p-3">
                <Badge variant="secondary" className="mb-1">Learning</Badge>
                <p className="text-xs text-muted-foreground">50-74% mastery</p>
              </div>
              <div className="border rounded-lg p-3">
                <Badge className="mb-1">Expert</Badge>
                <p className="text-xs text-muted-foreground">75-89% mastery</p>
              </div>
              <div className="border rounded-lg p-3">
                <Badge className="mb-1">Master</Badge>
                <p className="text-xs text-muted-foreground">90-100% mastery</p>
              </div>
            </div>
          </div>

          {/* Tips */}
          <div className="bg-primary/5 rounded-lg p-4 space-y-2">
            <h3 className="font-semibold text-sm">💡 Tips for Improvement</h3>
            <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
              <li>Focus on concepts with lower mastery first</li>
              <li>Review the explanations when you get answers wrong</li>
              <li>Practice regularly to maintain and improve mastery</li>
              <li>Try different topics to broaden your knowledge</li>
            </ul>
          </div>

          {/* Only in Learning Mode */}
          <div className="border-l-4 border-primary pl-4 py-2">
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">Note:</span> Learning Progress is only
              visible when you select <Badge variant="secondary">Learning Mode</Badge> in your
              profile settings.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
