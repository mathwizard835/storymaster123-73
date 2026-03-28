import { ArrowLeft, Mail, MessageCircle, Book } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Seo } from "@/components/Seo";

const Support = () => {
  const navigate = useNavigate();

  return (
    <>
      <Seo 
        title="Support & Help - StoryMaster Kids"
        description="Get help with StoryMaster Kids. Contact support, view FAQs, and find answers to common questions."
        canonical="/support"
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

          <h1 className="text-4xl font-bold mb-8 text-foreground">Support & Help</h1>
          
          <div className="grid gap-6 mb-12">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="h-5 w-5" />
                  Contact Support
                </CardTitle>
                <CardDescription>
                  Need help? Have a question? We're here for you!
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4">
                  Email us at: <a href="mailto:ordinaryheroesentertainment@gmail.com" className="text-primary hover:underline">ordinaryheroesentertainment@gmail.com</a>
                </p>
                <p className="text-sm text-muted-foreground">
                  We typically respond within 24-48 hours during business days.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageCircle className="h-5 w-5" />
                  Frequently Asked Questions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h3 className="font-semibold mb-2 text-foreground">How do I start a new story?</h3>
                  <p className="text-muted-foreground text-sm">
                    Click "Start New Adventure" from the home page or dashboard. Create your character profile, choose your interests, and begin your quest!
                  </p>
                </div>

                <div>
                  <h3 className="font-semibold mb-2 text-foreground">What are Ultra Abilities?</h3>
                  <p className="text-muted-foreground text-sm">
                    Ultra Abilities are special powers you earn by making excellent choices, solving mysteries, and completing achievements. Use them to unlock secret story paths and exclusive content!
                  </p>
                </div>

                <div>
                  <h3 className="font-semibold mb-2 text-foreground">How do I save my progress?</h3>
                  <p className="text-muted-foreground text-sm">
                    Your progress is automatically saved as you play. Make sure you're signed in to sync your progress across devices.
                  </p>
                </div>

                <div>
                  <h3 className="font-semibold mb-2 text-foreground">Is my child's data safe?</h3>
                  <p className="text-muted-foreground text-sm">
                    Yes! We're COPPA compliant and take privacy seriously. We don't share data with third parties, and parents can delete their child's data anytime. See our <a href="/privacy" className="text-primary hover:underline">Privacy Policy</a> for details.
                  </p>
                </div>

                <div>
                  <h3 className="font-semibold mb-2 text-foreground">Can I play offline?</h3>
                  <p className="text-muted-foreground text-sm">
                    Once you've started a story, you can continue reading it offline. However, generating new stories requires an internet connection.
                  </p>
                </div>

                <div>
                  <h3 className="font-semibold mb-2 text-foreground">What ages is this app for?</h3>
                  <p className="text-muted-foreground text-sm">
                    StoryMaster Kids is designed for children ages 6-12. Our AI adapts stories to your child's age and reading level automatically.
                  </p>
                </div>

                <div>
                  <h3 className="font-semibold mb-2 text-foreground">How do achievements work?</h3>
                  <p className="text-muted-foreground text-sm">
                    Complete stories, make strategic choices, and reach milestones to unlock 50+ achievements. View your progress on the Achievements page!
                  </p>
                </div>

                <div>
                  <h3 className="font-semibold mb-2 text-foreground">Can I delete my account?</h3>
                  <p className="text-muted-foreground text-sm">
                    Yes. Contact support at ordinaryheroesentertainment@gmail.com and we'll help you delete your account and all associated data.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Book className="h-5 w-5" />
                  Resources
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <a href="/privacy" className="block text-primary hover:underline">
                  Privacy Policy
                </a>
                <a href="/terms" className="block text-primary hover:underline">
                  Terms of Service
                </a>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-r from-primary/5 to-accent/5 border-primary/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span className="text-xl">💡</span>
                  Our Story
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-sm">
                  StoryMaster Kids was created by a 13-year-old who wanted to build something that makes reading as exciting as gaming. 
                  Because kids deserve screen time that actually helps them grow.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </>
  );
};

export default Support;
