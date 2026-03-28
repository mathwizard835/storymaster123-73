import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, ShieldCheck } from 'lucide-react';
import { emailSchema } from '@/lib/validationSchemas';

interface ParentalConsentFormProps {
  childAge: number;
  onConsent: (parentEmail: string) => void;
  onBack: () => void;
  loading: boolean;
  externalError?: string;
}

const ParentalConsentForm = ({ childAge, onConsent, onBack, loading, externalError }: ParentalConsentFormProps) => {
  const [parentEmail, setParentEmail] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [acceptedPrivacy, setAcceptedPrivacy] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const emailResult = emailSchema.safeParse(parentEmail);
    if (!emailResult.success) {
      setError('Please enter a valid parent/guardian email address.');
      return;
    }

    if (!acceptedTerms || !acceptedPrivacy) {
      setError('You must accept both the Terms of Service and Privacy Policy to continue.');
      return;
    }

    onConsent(emailResult.data);
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
        <ShieldCheck className="h-10 w-10 text-green-400 mx-auto mb-2" />
        <h3 className="text-xl font-semibold text-white">Parent/Guardian Consent Required</h3>
        <p className="text-purple-200 text-sm mt-2">
          Because this account is for a child under 13, we need a parent or guardian's permission to comply with children's privacy laws (COPPA).
        </p>
      </div>

      <Alert className="bg-blue-900/50 border-blue-500/50 text-blue-200">
        <AlertDescription className="text-sm">
          <strong>For parents:</strong> StoryMaster collects your child's first name, age, and reading preferences to personalize stories. We never share children's data with third parties. You can review or delete your child's data at any time from the Parent Dashboard.
        </AlertDescription>
      </Alert>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="parent-email" className="text-white">
            Parent/Guardian Email Address
          </Label>
          <Input
            id="parent-email"
            type="email"
            value={parentEmail}
            onChange={(e) => setParentEmail(e.target.value)}
            required
            className="bg-black/30 border-white/20 text-white placeholder:text-white/60"
            placeholder="parent@example.com"
          />
          <p className="text-purple-300 text-xs">
            We'll send a verification email to confirm parental consent.
          </p>
        </div>

        <div className="space-y-3">
          <div className="flex items-start space-x-2">
            <Checkbox
              id="accept-terms"
              checked={acceptedTerms}
              onCheckedChange={(checked) => setAcceptedTerms(checked === true)}
              className="mt-1 border-white/40 data-[state=checked]:bg-purple-600"
            />
            <label htmlFor="accept-terms" className="text-sm text-purple-200 cursor-pointer">
              I am the parent/guardian and I consent to my child (age {childAge}) using StoryMaster under the{' '}
              <a href="/terms" target="_blank" className="text-purple-400 hover:text-purple-300 underline">
                Terms of Service
              </a>.
            </label>
          </div>

          <div className="flex items-start space-x-2">
            <Checkbox
              id="accept-privacy"
              checked={acceptedPrivacy}
              onCheckedChange={(checked) => setAcceptedPrivacy(checked === true)}
              className="mt-1 border-white/40 data-[state=checked]:bg-purple-600"
            />
            <label htmlFor="accept-privacy" className="text-sm text-purple-200 cursor-pointer">
              I have read and agree to the{' '}
              <a href="/privacy" target="_blank" className="text-purple-400 hover:text-purple-300 underline">
                Privacy Policy
              </a>{' '}
              and consent to the collection of my child's data as described.
            </label>
          </div>
        </div>

        {(error || externalError) && (
          <Alert className="bg-red-900/50 border-red-500/50 text-red-200">
            <AlertDescription>{error || externalError}</AlertDescription>
          </Alert>
        )}

        <Button
          type="submit"
          className="w-full bg-green-600 hover:bg-green-700"
          disabled={loading || !acceptedTerms || !acceptedPrivacy}
        >
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Give Consent & Create Account
        </Button>
      </form>
    </div>
  );
};

export default ParentalConsentForm;
