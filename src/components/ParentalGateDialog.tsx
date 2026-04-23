import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ShieldCheck, RefreshCw } from 'lucide-react';
import { generateSimpleChallenge, checkSimpleAnswer, type SimpleChallenge } from '@/lib/numberToWords';
import { trackFunnelStep } from '@/lib/analytics';

interface ParentalGateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPassed: () => void;
  title?: string;
  description?: string;
}

/**
 * Parental gate required by Apple's Kids Category guidelines.
 * Uses a simple addition problem — easy for adults, non-trivial for young children.
 */
const ParentalGateDialog = ({
  open,
  onOpenChange,
  onPassed,
  title = 'Grown-Up Check',
  description = 'Please ask a parent or guardian to solve this to continue.',
}: ParentalGateDialogProps) => {
  const [challenge, setChallenge] = useState<SimpleChallenge>(() => generateSimpleChallenge());
  const [answer, setAnswer] = useState('');
  const [error, setError] = useState('');
  const [attempts, setAttempts] = useState(0);

  useEffect(() => {
    if (open) {
      setChallenge(generateSimpleChallenge());
      setAnswer('');
      setError('');
      setAttempts(0);
      // Funnel: parent gate shown — important paywall→purchase step.
      trackFunnelStep('parent_gate_opened');
    }
  }, [open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!answer.trim()) {
      setError('Please type your answer.');
      return;
    }

    if (checkSimpleAnswer(challenge, answer)) {
      onOpenChange(false);
      onPassed();
    } else {
      const newAttempts = attempts + 1;
      setAttempts(newAttempts);
      if (newAttempts >= 3) {
        setError('Too many incorrect attempts. Tap "Try a New Question" to continue.');
      } else {
        setError("That's not quite right. Please try again.");
      }
    }
  };

  const handleNewQuestion = () => {
    setChallenge(generateSimpleChallenge());
    setAnswer('');
    setError('');
    setAttempts(0);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mx-auto mb-2">
            <ShieldCheck className="h-10 w-10 text-amber-500" />
          </div>
          <DialogTitle className="text-center">{title}</DialogTitle>
          <DialogDescription className="text-center">
            {description}
          </DialogDescription>
        </DialogHeader>

        <div className="text-center py-6">
          <span className="text-5xl font-bold tracking-wider">
            {challenge.a} + {challenge.b} = ?
          </span>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="parental-gate-answer">Answer</Label>
            <Input
              id="parental-gate-answer"
              type="number"
              inputMode="numeric"
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              placeholder="Type the answer"
              disabled={attempts >= 3}
              autoComplete="off"
              autoFocus
            />
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="flex flex-col gap-2">
            <Button
              type="submit"
              disabled={attempts >= 3 || !answer.trim()}
              className="w-full"
            >
              Verify
            </Button>

            {attempts >= 3 && (
              <Button
                type="button"
                variant="outline"
                onClick={handleNewQuestion}
                className="w-full"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Try a New Question
              </Button>
            )}

            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              className="w-full"
            >
              Cancel
            </Button>
          </div>
        </form>

        <p className="text-muted-foreground text-xs text-center">
          This step ensures a grown-up approves this action.
        </p>
      </DialogContent>
    </Dialog>
  );
};

export default ParentalGateDialog;
