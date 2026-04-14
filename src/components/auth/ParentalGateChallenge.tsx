import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ShieldCheck, RefreshCw } from 'lucide-react';
import { generateChallengeNumber, checkAnswer } from '@/lib/numberToWords';

interface ParentalGateChallengeProps {
  onPassed: () => void;
  onBack: () => void;
}

const ParentalGateChallenge = ({ onPassed, onBack }: ParentalGateChallengeProps) => {
  const [challengeNumber, setChallengeNumber] = useState(() => generateChallengeNumber());
  const [answer, setAnswer] = useState('');
  const [error, setError] = useState('');
  const [attempts, setAttempts] = useState(0);

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
      onPassed();
    } else {
      const newAttempts = attempts + 1;
      setAttempts(newAttempts);
      if (newAttempts >= 3) {
        setError('Too many incorrect attempts. Please ask a parent or guardian for help.');
      } else {
        setError('That doesn\'t match. Please try again — remember to write the full number in words.');
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
          To make sure a parent or guardian is here, please type this number in words:
        </p>
      </div>

      <div className="text-center py-4">
        <span className="text-4xl font-bold text-white tracking-wider font-mono">
          {formattedNumber}
        </span>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="number-words" className="text-white">
            Type this number in words
          </Label>
          <Input
            id="number-words"
            type="text"
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            className="bg-black/30 border-white/20 text-white placeholder:text-white/60"
            placeholder='e.g. "one hundred and twenty-three thousand four hundred and fifty-six"'
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
            onClick={handleNewNumber}
            className="w-full border-white/20 text-white hover:bg-white/10"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Try a New Number
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
