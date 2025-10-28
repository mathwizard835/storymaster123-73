import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Seo } from "@/components/Seo";

const TermsOfService = () => {
  const navigate = useNavigate();

  return (
    <>
      <Seo 
        title="Terms of Service - StoryMaster Quest"
        description="Terms of service for StoryMaster Quest app"
        canonical="/terms"
      />
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8 max-w-4xl">
          <Button
            variant="ghost"
            onClick={() => navigate(-1)}
            className="mb-6"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>

          <h1 className="text-4xl font-bold mb-8 text-foreground">Terms of Service</h1>
          
          <div className="space-y-6 text-muted-foreground">
            <section>
              <h2 className="text-2xl font-semibold mb-3 text-foreground">Last Updated</h2>
              <p>January 2025</p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-3 text-foreground">Acceptance of Terms</h2>
              <p>
                By accessing and using StoryMaster Quest ("the App"), you accept and agree to be bound 
                by these Terms of Service. If you do not agree to these terms, please do not use the App.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-3 text-foreground">Use of Service</h2>
              <h3 className="text-xl font-semibold mb-2 text-foreground">Eligibility</h3>
              <p>
                StoryMaster Quest is designed for children under the supervision of parents or guardians. 
                By creating an account, you affirm that you have parental consent if you are under 13 
                years of age.
              </p>

              <h3 className="text-xl font-semibold mb-2 mt-4 text-foreground">Acceptable Use</h3>
              <p>You agree to:</p>
              <ul className="list-disc pl-6 space-y-2 mt-2">
                <li>Use the App for personal, non-commercial purposes</li>
                <li>Provide accurate account information</li>
                <li>Maintain the security of your account</li>
                <li>Not share inappropriate content or engage in harmful behavior</li>
                <li>Not attempt to hack, reverse engineer, or disrupt the service</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-3 text-foreground">Content and Intellectual Property</h2>
              <h3 className="text-xl font-semibold mb-2 text-foreground">Our Content</h3>
              <p>
                All stories, characters, artwork, and other content provided by StoryMaster Quest are 
                protected by copyright and other intellectual property laws. You may not copy, modify, 
                distribute, or create derivative works without permission.
              </p>

              <h3 className="text-xl font-semibold mb-2 mt-4 text-foreground">User Content</h3>
              <p>
                Your character profiles and story choices remain your property. By using the App, you 
                grant us a license to store and display this content as necessary to provide the service.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-3 text-foreground">Subscriptions and Payments</h2>
              <p>
                StoryMaster Quest may offer subscription plans for premium features. Subscriptions:
              </p>
              <ul className="list-disc pl-6 space-y-2 mt-2">
                <li>Auto-renew unless canceled before the renewal date</li>
                <li>Are charged to your payment method on file</li>
                <li>Can be managed through your App Store account settings</li>
                <li>Refunds are handled according to App Store policies</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-3 text-foreground">Termination</h2>
              <p>
                We reserve the right to suspend or terminate your account if you violate these Terms. 
                You may delete your account at any time through the app settings.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-3 text-foreground">Disclaimers</h2>
              <p>
                The App is provided "as is" without warranties of any kind. We do not guarantee 
                uninterrupted or error-free service. We are not liable for any indirect, incidental, 
                or consequential damages.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-3 text-foreground">Limitation of Liability</h2>
              <p>
                To the maximum extent permitted by law, StoryMaster Quest shall not be liable for any 
                damages arising from your use of the App.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-3 text-foreground">Changes to Terms</h2>
              <p>
                We may modify these Terms at any time. Continued use of the App after changes constitutes 
                acceptance of the new Terms. We will notify users of material changes.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-3 text-foreground">Governing Law</h2>
              <p>
                These Terms are governed by the laws of the jurisdiction in which StoryMaster Quest 
                operates, without regard to conflict of law provisions.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-3 text-foreground">Contact Information</h2>
              <p>
                For questions about these Terms, please contact us through the app settings or our 
                support page.
              </p>
            </section>
          </div>
        </div>
      </div>
    </>
  );
};

export default TermsOfService;
