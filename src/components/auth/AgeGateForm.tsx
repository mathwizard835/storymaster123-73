import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface AgeGateFormProps {
  onAgeConfirmed: (age: number) => void;
  onBack: () => void;
}

const AgeGateForm = ({ onAgeConfirmed, onBack }: AgeGateFormProps) => {
  const [selectedAge, setSelectedAge] = useState<string>('');
  const [error, setError] = useState('');

  const handleContinue = () => {
    setError('');
    if (!selectedAge) {
      setError('Please select your age to continue.');
      return;
    }
    const age = parseInt(selectedAge, 10);
    if (age < 5 || age > 17) {
      setError('This app is designed for children ages 5–12. A parent can create an account for a younger child.');
      return;
    }
    onAgeConfirmed(age);
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
        <h3 className="text-xl font-semibold text-white">How old are you?</h3>
        <p className="text-purple-200 text-sm mt-2">
          We need to know your age so we can keep you safe online.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="age-select" className="text-white">Your Age</Label>
        <Select value={selectedAge} onValueChange={setSelectedAge}>
          <SelectTrigger className="bg-black/30 border-white/20 text-white">
            <SelectValue placeholder="Select your age" />
          </SelectTrigger>
          <SelectContent>
            {Array.from({ length: 14 }, (_, i) => i + 5).map((age) => (
              <SelectItem key={age} value={age.toString()}>
                {age} years old
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {error && (
        <Alert className="bg-red-900/50 border-red-500/50 text-red-200">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Button
        onClick={handleContinue}
        className="w-full bg-purple-600 hover:bg-purple-700"
        disabled={!selectedAge}
      >
        Continue
      </Button>
    </div>
  );
};

export default AgeGateForm;
