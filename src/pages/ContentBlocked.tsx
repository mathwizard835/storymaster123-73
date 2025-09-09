import { Button } from "@/components/ui/button";
import { Seo } from "@/components/Seo";
import { Shield, RotateCcw, Home } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";

const ContentBlocked = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Get the reason from navigation state or use default
  const reason = location.state?.reason || "We can't create that content to keep everyone safe and happy!";
  const blockedTerms = location.state?.blockedTerms || [];

  return (
    <>
      <Seo
        title="Content Blocked – StoryMaster Quest"
        description="Content safety notification"
        canonical="/blocked"
      />

      <main className="min-h-screen w-full bg-gradient-to-b from-red-50 to-orange-50 dark:from-red-950/20 dark:to-orange-950/20">
        <div className="container py-16 flex items-center justify-center min-h-screen">
          <div className="max-w-2xl text-center space-y-8">
            {/* Shield Icon */}
            <div className="relative">
              <div className="w-32 h-32 mx-auto bg-gradient-to-br from-red-100 to-orange-100 dark:from-red-900/30 dark:to-orange-900/30 rounded-full flex items-center justify-center shadow-lg">
                <Shield className="h-16 w-16 text-red-500 dark:text-red-400" />
              </div>
              <div className="absolute inset-0 rounded-full bg-gradient-to-br from-red-400/20 to-orange-400/20 animate-pulse"></div>
            </div>

            {/* Main Message */}
            <div className="space-y-4">
              <h1 className="font-heading text-4xl md:text-5xl font-extrabold text-red-600 dark:text-red-400">
                Oops! We Can't Create That Story
              </h1>
              
              <div className="glass-panel rounded-xl p-6 bg-white/80 dark:bg-gray-900/80 border border-red-200 dark:border-red-800">
                <p className="text-lg text-gray-700 dark:text-gray-300 leading-relaxed">
                  {reason}
                </p>
                
                {blockedTerms.length > 0 && (
                  <div className="mt-4 p-4 bg-red-50 dark:bg-red-950/30 rounded-lg border border-red-200 dark:border-red-800">
                    <p className="text-sm font-semibold text-red-700 dark:text-red-300 mb-2">
                      These words or topics aren't allowed:
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {blockedTerms.map((term, index) => (
                        <span 
                          key={index}
                          className="px-2 py-1 bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 text-xs rounded-md font-medium"
                        >
                          {term}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Safety Message */}
              <div className="glass-panel rounded-xl p-6 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800">
                <h2 className="text-xl font-bold text-blue-700 dark:text-blue-300 mb-3 flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Why We Keep Stories Safe
                </h2>
                <div className="text-left space-y-2 text-sm text-blue-600 dark:text-blue-300">
                  <p>• StoryMaster Quest is designed to be 100% safe for kids and teens</p>
                  <p>• We automatically filter out content that might be scary, violent, or inappropriate</p>
                  <p>• This helps create positive, educational, and fun adventures for everyone!</p>
                  <p>• You can always try different topics, interests, or story themes</p>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                size="xl"
                variant="outline"
                onClick={() => navigate("/profile")}
                className="flex items-center gap-2 border-orange-300 hover:bg-orange-50 dark:border-orange-700 dark:hover:bg-orange-950/30"
              >
                <RotateCcw className="h-5 w-5" />
                Try Different Settings
              </Button>
              
              <Button
                size="xl"
                variant="hero"
                onClick={() => navigate("/")}
                className="flex items-center gap-2"
              >
                <Home className="h-5 w-5" />
                Go Home
              </Button>
            </div>

            {/* Tips Section */}
            <div className="glass-panel rounded-xl p-6 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800">
              <h2 className="text-lg font-bold text-green-700 dark:text-green-300 mb-3">
                ✨ Try These Safe & Fun Ideas Instead:
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                <div className="space-y-1">
                  <p className="font-semibold text-green-600 dark:text-green-300">Topics:</p>
                  <ul className="text-green-600 dark:text-green-300 space-y-1">
                    <li>• Space exploration</li>
                    <li>• Friendly animals</li>
                    <li>• Science discoveries</li>
                    <li>• Art and creativity</li>
                  </ul>
                </div>
                <div className="space-y-1">
                  <p className="font-semibold text-green-600 dark:text-green-300">Interests:</p>
                  <ul className="text-green-600 dark:text-green-300 space-y-1">
                    <li>• Building things</li>
                    <li>• Solving puzzles</li>
                    <li>• Making friends</li>
                    <li>• Learning new skills</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  );
};

export default ContentBlocked;