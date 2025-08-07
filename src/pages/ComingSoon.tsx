import { Seo } from "@/components/Seo";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const ComingSoon = () => {
  const navigate = useNavigate();
  return (
    <>
      <Seo
        title="StoryMaster Quest – Coming Soon"
        description="Dynamic outcomes are on the way!"
        canonical="/coming-soon"
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "WebPage",
          name: "Coming Soon",
        }}
      />
      <main className="min-h-screen flex items-center justify-center">
        <section className="text-center animate-enter">
          <h1 className="font-heading text-4xl md:text-5xl font-extrabold">Coming Soon</h1>
          <p className="mt-2 text-muted-foreground">AI-powered story branches are almost ready.</p>
          <div className="mt-6 flex gap-3 justify-center">
            <Button variant="game" size="lg" onClick={() => navigate(-1)}>Back</Button>
            <Button variant="hero" size="lg" onClick={() => navigate("/")}>Home</Button>
          </div>
        </section>
      </main>
    </>
  );
};

export default ComingSoon;
