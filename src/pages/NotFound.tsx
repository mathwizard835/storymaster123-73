import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Home, Search } from "lucide-react";
import { Seo } from "@/components/Seo";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  return (
    <>
      <Seo 
        title="Page Not Found - StoryMaster Kids"
        description="The page you're looking for doesn't exist"
        canonical="/404"
      />
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-purple-900 via-blue-900 to-indigo-900 p-4">
        <div className="text-center max-w-md">
          <div className="mb-8">
            <Search className="h-24 w-24 mx-auto text-purple-300 opacity-50" />
          </div>
          <h1 className="text-6xl font-bold mb-4 text-white">404</h1>
          <h2 className="text-2xl font-semibold mb-4 text-purple-200">
            Quest Not Found
          </h2>
          <p className="text-lg text-purple-300 mb-8">
            Oops! This page has vanished into the story realm. Let's get you back on track!
          </p>
          <Link to="/">
            <Button size="lg" variant="hero" className="flex items-center gap-2 mx-auto">
              <Home className="h-5 w-5" />
              Return to Home
            </Button>
          </Link>
        </div>
      </div>
    </>
  );
};

export default NotFound;
