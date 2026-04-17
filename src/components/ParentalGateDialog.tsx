import { useState, useMemo, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ShieldCheck, RefreshCw } from 'lucide-react';
import { generateChallengeNumber, checkAnswer } from '@/lib/numberToWords';

interface ParentalGateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPassed: () => void;
  title?: string;
  description?: string;
}

/**
 * Parental gate required by Apple's Kids Category guidelines.
 * Blocks access to: external links/sharing, contacting the developer,
 * and In-App Purchases. Cannot be disabled.
 */
const ParentalGateDialog = ({
  open,
  onOpenChange,
  onPassed,
  title = 'Grown-Up Check',
  description = "Please ask a parent or guardian to type this number in words to continue.",
}: ParentalGateDialogProps) => {
  const [challengeNumber, setChallengeNumber] = useState(() => generateChallengeNumber());
  const [answer, setAnswer] = useState('');
  const [error, setError] = useState('');
  const [attempts, setAttempts] = useState(0);

  // Reset on open
  useEffect(() => {
    if (open) {
      setChallengeNumber(generateChallengeNumber());
      setAnswer('');
      setError('');
      setAttempts(0);
    }
  }, [open]);

  const formattedNumber = useMemo(
    () => challengeNumber.toLocaleString(),
    [challengeNumber]
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!answer.trim()) {
      setError('Please type the number in words.');
      return;
    }

    if (checkAnswer(challengeNumber, answer)) {
      onOpenChange(false);
      onPassed();
    } else {
      const newAttempts = attempts + 1;
      setAttempts(newAttempts);
      if (newAttempts >= 3) {
        setError('Too many incorrect attempts. Please ask a parent or guardian for help.');
      } else {
        setError("That doesn't match. Please try again — write the full number in words.");
      }
    }
  };

  const handleNewNumber = () => {
    setChallengeNumber(generateChallengeNumber());
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

        <div className="text-center py-4">
          <span className="text-4xl font-bold tracking-wider font-mono">
            {formattedNumber}
          </span>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="parental-gate-answer">
              Type this number in words
            </Label>
            <Input
              id="parental-gate-answer"
              type="text"
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              placeholder='e.g. "one hundred twenty-three thousand four hundred fifty-six"'
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
                onClick={handleNewNumber}
                className="w-full"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Try a New Number
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
