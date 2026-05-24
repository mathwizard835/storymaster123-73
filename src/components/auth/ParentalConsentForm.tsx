import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, ShieldCheck } from 'lucide-react';

interface ParentalConsentFormProps {
  childAge: number;
  accountEmail: string;
  onConsent: () => void;
  onBack: () => void;
  loading: boolean;
  externalError?: string;
}

const ParentalConsentForm = ({ childAge, accountEmail, onConsent, onBack, loading, externalError }: ParentalConsentFormProps) => {
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [acceptedPrivacy, setAcceptedPrivacy] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!acceptedTerms || !acceptedPrivacy) {
      setError('You must accept both the Terms of Service and Privacy Policy to continue.');
      return;
    }

    onConsent();
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
          <strong>For parents:</strong> StoryMaster Kids collects your child's first name, age, and reading preferences to personalize stories. We never share children's data with third parties. You can review or delete your child's data at any time from the Parent Dashboard.
        </AlertDescription>
      </Alert>

      <Alert className="bg-purple-900/40 border-purple-500/40 text-purple-100">
        <AlertDescription className="text-sm">
          We'll send <strong>one verification email</strong> to <strong>{accountEmail}</strong> — the parent/guardian email for this account. Click the link in that email to activate the account. Your child does <strong>not</strong> receive a separate email, and there's just <strong>one login</strong> (this email + password) that you and your child share.
        </AlertDescription>
      </Alert>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-3">
          <div className="flex items-start space-x-2">
            <Checkbox
              id="accept-terms"
              checked={acceptedTerms}
              onCheckedChange={(checked) => setAcceptedTerms(checked === true)}
              className="mt-1 border-white/40 data-[state=checked]:bg-purple-600"
            />
            <label htmlFor="accept-terms" className="text-sm text-purple-200 cursor-pointer">
              I am the parent/guardian and I consent to my child (age {childAge}) using StoryMaster Kids under the{' '}
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
