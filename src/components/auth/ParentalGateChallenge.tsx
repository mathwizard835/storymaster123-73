import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ShieldCheck, RefreshCw } from 'lucide-react';
import { generateSimpleChallenge, checkSimpleAnswer, type SimpleChallenge } from '@/lib/numberToWords';

interface ParentalGateChallengeProps {
  onPassed: () => void;
  onBack: () => void;
}

const ParentalGateChallenge = ({ onPassed, onBack }: ParentalGateChallengeProps) => {
  const [challenge, setChallenge] = useState<SimpleChallenge>(() => generateSimpleChallenge());
  const [answer, setAnswer] = useState('');
  const [error, setError] = useState('');
  const [attempts, setAttempts] = useState(0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!answer.trim()) {
      setError('Please type your answer.');
      return;
    }

    if (checkSimpleAnswer(challenge, answer)) {
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
    <div className="space-y-4">
      <Button
        variant="ghost"
        onClick={onBack}
        className="text-purple-200 hover:text-white mb-2"
      >
        ← Back
      </Button>

      <div className="text-center mb-4">
        <ShieldCheck className="h-10 w-10 text-amber-400 mx-auto mb-2" />
        <h3 className="text-xl font-semibold text-white">Grown-Up Check</h3>
        <p className="text-purple-200 text-sm mt-2">
          To make sure a parent or guardian is here, please solve this:
        </p>
      </div>

      <div className="text-center py-6">
        <span className="text-5xl font-bold text-white tracking-wider">
          {challenge.a} + {challenge.b} = ?
        </span>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="gate-answer" className="text-white">
            Answer
          </Label>
          <Input
            id="gate-answer"
            type="number"
            inputMode="numeric"
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            className="bg-black/30 border-white/20 text-white placeholder:text-white/60"
            placeholder="Type the answer"
            disabled={attempts >= 3}
            autoComplete="off"
          />
        </div>

        {error && (
          <Alert className="bg-red-900/50 border-red-500/50 text-red-200">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Button
          type="submit"
          className="w-full bg-purple-600 hover:bg-purple-700"
          disabled={attempts >= 3 || !answer.trim()}
        >
          Verify
        </Button>

        {attempts >= 3 && (
          <Button
            type="button"
            variant="outline"
            onClick={handleNewQuestion}
            className="w-full border-white/20 text-white hover:bg-white/10"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Try a New Question
          </Button>
        )}
      </form>

      <p className="text-purple-300 text-xs text-center">
        This step helps us make sure a grown-up is setting up this account.
      </p>
    </div>
  );
};

export default ParentalGateChallenge;
