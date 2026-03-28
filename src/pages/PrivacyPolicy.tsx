import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Seo } from "@/components/Seo";

const PrivacyPolicy = () => {
  const navigate = useNavigate();

  return (
    <>
      <Seo 
        title="Privacy Policy - StoryMaster Kids"
        description="Privacy policy for StoryMaster Kids interactive reading app"
        canonical="/privacy"
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

          <h1 className="text-4xl font-bold mb-8 text-foreground">Privacy Policy</h1>
          
          <div className="space-y-6 text-muted-foreground">
            <section>
              <h2 className="text-2xl font-semibold mb-3 text-foreground">Last Updated</h2>
              <p>January 2025</p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-3 text-foreground">Introduction</h2>
              <p>
                StoryMaster ("we," "our," or "us") is committed to protecting your privacy. 
                This Privacy Policy explains how we collect, use, and safeguard information when you 
                use our interactive storytelling application designed for children.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-3 text-foreground">Information We Collect</h2>
              <h3 className="text-xl font-semibold mb-2 text-foreground">Account Information</h3>
              <ul className="list-disc pl-6 space-y-2">
                <li>Character name and profile information (age-appropriate)</li>
                <li>Email address (for account management)</li>
                <li>Progress data (stories completed, achievements earned)</li>
              </ul>

              <h3 className="text-xl font-semibold mb-2 mt-4 text-foreground">Usage Information</h3>
              <ul className="list-disc pl-6 space-y-2">
                <li>Story choices and preferences</li>
                <li>Game progress and achievements</li>
                <li>Device information and app performance data</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-3 text-foreground">How We Use Your Information</h2>
              <ul className="list-disc pl-6 space-y-2">
                <li>To provide and personalize your storytelling experience</li>
                <li>To save your progress and achievements</li>
                <li>To improve our app and create better content</li>
                <li>To communicate important updates about the service</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-3 text-foreground">Children's Privacy</h2>
              <p>
                StoryMaster Kids is designed for children. We are committed to COPPA (Children's Online 
                Privacy Protection Act) compliance. We do not knowingly collect personal information from 
                children without parental consent. Parents have the right to:
              </p>
              <ul className="list-disc pl-6 space-y-2 mt-2">
                <li>Review their child's personal information</li>
                <li>Request deletion of their child's information</li>
                <li>Refuse further collection of their child's information</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-3 text-foreground">Data Security</h2>
              <p>
                We implement industry-standard security measures to protect your information. All data 
                is encrypted in transit and at rest. However, no method of transmission over the internet 
                is 100% secure.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-3 text-foreground">Third-Party Services</h2>
              <p>
                We use Supabase for secure data storage and authentication. We do not sell or share 
                personal information with third parties for marketing purposes.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-3 text-foreground">Your Rights</h2>
              <ul className="list-disc pl-6 space-y-2">
                <li>Access your personal information</li>
                <li>Request correction of inaccurate data</li>
                <li>Request deletion of your account and data</li>
                <li>Export your data</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-3 text-foreground">Contact Us</h2>
              <p>
                If you have questions about this Privacy Policy or wish to exercise your rights:
              </p>
              <ul className="list-disc pl-6 space-y-2 mt-2">
                <li>Email: support@storymasterkids.com</li>
                <li>Visit our <a href="/support" className="text-primary hover:underline">Support page</a></li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-3 text-foreground">Changes to This Policy</h2>
              <p>
                We may update this Privacy Policy from time to time. We will notify users of any 
                material changes through the app or via email.
              </p>
            </section>
          </div>
        </div>
      </div>
    </>
  );
};

export default PrivacyPolicy;
