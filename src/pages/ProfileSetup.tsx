import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Seo } from "@/components/Seo";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Toggle } from "@/components/ui/toggle";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  Rocket,
  Sparkles,
  PawPrint,
  Search,
  Target,
  Users,
  Paintbrush,
  Zap,
  Smile,
  Eye,
  Compass,
} from "lucide-react";
import { saveProfileToLocal } from "@/lib/story";

const badges = [
  { id: "beast", label: "Beast Master", icon: PawPrint },
  { id: "space", label: "Space Explorer", icon: Rocket },
  { id: "mystic", label: "Mystic Mage", icon: Sparkles },
  { id: "detective", label: "Detective", icon: Search },
  { id: "action", label: "Action Hero", icon: Target },
  { id: "social", label: "Social Champion", icon: Users },
  { id: "creative", label: "Creative Genius", icon: Paintbrush },
];

const modes = [
  { id: "thrill", label: "Thrill Mode", icon: Zap },
  { id: "fun", label: "Fun Mode", icon: Smile },
  { id: "mystery", label: "Mystery Mode", icon: Eye },
  { id: "explore", label: "Explore Mode", icon: Compass },
];

const ProfileSetup = () => {
  const navigate = useNavigate();
  const [age, setAge] = useState<number>(8);
  const [reading, setReading] = useState<string>("adventurer");
  const [selectedBadges, setSelectedBadges] = useState<string[]>([]);
  const [mode, setMode] = useState<string>("thrill");
  const [storyLength, setStoryLength] = useState<string>("medium");
  const [topic, setTopic] = useState<string>("");
  const [interests, setInterests] = useState<string>("");

  const toggleBadge = (id: string) => {
    setSelectedBadges((prev) =>
      prev.includes(id) ? prev.filter((b) => b !== id) : [...prev, id]
    );
  };

  const handleStart = () => {
    const profile = { age, reading, selectedBadges, mode, storyLength: storyLength as 'short' | 'medium' | 'epic', topic, interests };
    saveProfileToLocal(profile);
    navigate("/mission");
  };

  return (
    <>
      <Seo
        title="StoryMaster Quest – Create Your Hero"
        description="Set your age, reading skill, badges, and quest mode to begin your StoryMaster Quest."
        canonical="/profile"
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "WebPage",
          name: "Create Your Hero Profile",
        }}
      />

      <main className="min-h-screen w-full bg-background">
        <section className="container py-10 md:py-16">
          <h1 className="font-heading text-3xl md:text-5xl font-extrabold text-center">
            Create Your Hero Profile
          </h1>
          <p className="mt-2 text-center text-muted-foreground">
            Configure your powers and style. You can always change them later.
          </p>

          <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2">
            {/* Age */}
            <article className="glass-panel rounded-xl p-6">
              <h2 className="font-heading text-xl md:text-2xl font-bold">Age</h2>
              <div className="mt-4">
                <Label htmlFor="age">Select your age: {age}</Label>
                <div className="mt-3 px-1">
                  <Slider
                    id="age"
                    defaultValue={[age]}
                    min={6}
                    max={11}
                    step={1}
                    onValueChange={(v) => setAge(v[0] ?? 8)}
                  />
                </div>
              </div>
            </article>

            {/* Reading Skill */}
            <article className="glass-panel rounded-xl p-6">
              <h2 className="font-heading text-xl md:text-2xl font-bold">Reading Skill</h2>
              <RadioGroup
                className="mt-4 grid gap-3"
                value={reading}
                onValueChange={setReading}
              >
                <div className="flex items-center gap-3 rounded-lg border p-3">
                  <RadioGroupItem id="apprentice" value="apprentice" />
                  <Label htmlFor="apprentice">🌱 Apprentice</Label>
                </div>
                <div className="flex items-center gap-3 rounded-lg border p-3">
                  <RadioGroupItem id="adventurer" value="adventurer" />
                  <Label htmlFor="adventurer">⚔️ Adventurer</Label>
                </div>
                <div className="flex items-center gap-3 rounded-lg border p-3">
                  <RadioGroupItem id="hero" value="hero" />
                  <Label htmlFor="hero">🏆 Hero</Label>
                </div>
              </RadioGroup>
            </article>

            {/* Interest Badges */}
            <article className="glass-panel rounded-xl p-6 md:col-span-2">
              <h2 className="font-heading text-xl md:text-2xl font-bold">Interest Badges</h2>
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                {badges.map((b) => (
                  <Toggle
                    key={b.id}
                    pressed={selectedBadges.includes(b.id)}
                    onPressedChange={() => toggleBadge(b.id)}
                    className="justify-start rounded-lg border px-3 py-3 data-[state=on]:bg-primary/10 data-[state=on]:border-primary hover:bg-accent hover:text-foreground"
                    aria-label={b.label}
                  >
                    <b.icon className="mr-2 h-5 w-5" />
                    <span className="text-sm font-semibold">{b.label}</span>
                  </Toggle>
                ))}
              </div>
            </article>

            {/* Story Length */}
            <article className="glass-panel rounded-xl p-6">
              <h2 className="font-heading text-xl md:text-2xl font-bold">Story Length</h2>
              <RadioGroup
                className="mt-4 grid gap-3"
                value={storyLength}
                onValueChange={setStoryLength}
              >
                <div className="flex items-center gap-3 rounded-lg border p-3">
                  <RadioGroupItem id="short" value="short" />
                  <Label htmlFor="short">⚡ Short (3-5 scenes)</Label>
                </div>
                <div className="flex items-center gap-3 rounded-lg border p-3">
                  <RadioGroupItem id="medium" value="medium" />
                  <Label htmlFor="medium">⚔️ Medium (5-8 scenes)</Label>
                </div>
                <div className="flex items-center gap-3 rounded-lg border p-3">
                  <RadioGroupItem id="epic" value="epic" />
                  <Label htmlFor="epic">🏆 Epic (8-12 scenes)</Label>
                </div>
              </RadioGroup>
            </article>
            {/* Quest Mode */}
            <article className="glass-panel rounded-xl p-6 md:col-span-2">
              <h2 className="font-heading text-xl md:text-2xl font-bold">Quest Mode</h2>
              <ToggleGroup
                type="single"
                className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4"
                value={mode}
                onValueChange={(v) => v && setMode(v)}
              >
                {modes.map((m) => (
                  <ToggleGroupItem
                    key={m.id}
                    value={m.id}
                    aria-label={m.label}
                    className="rounded-lg border px-4 py-3 data-[state=on]:bg-primary/10 data-[state=on]:border-primary"
                  >
                    <m.icon className="mr-2 h-5 w-5" />
                    {m.label}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
            </article>

            {/* Personal Interests */}
            <article className="glass-panel rounded-xl p-6 md:col-span-2">
              <h2 className="font-heading text-xl md:text-2xl font-bold">Things You Love (optional)</h2>
              <p className="mt-1 text-sm text-muted-foreground">Tell us about your hobbies, interests, or favorite things you'd like to see in your stories</p>
              <div className="mt-3">
                <Textarea
                  placeholder="e.g., soccer, video games, cats, pizza, Marvel superheroes, skateboarding..."
                  value={interests}
                  onChange={(e) => setInterests(e.target.value)}
                  className="min-h-[80px]"
                />
              </div>
            </article>

            {/* Topic */}
            <article className="glass-panel rounded-xl p-6 md:col-span-2">
              <h2 className="font-heading text-xl md:text-2xl font-bold">Learning Topic (optional)</h2>
              <div className="mt-3 flex items-center gap-3">
                <Input
                  placeholder="e.g., Ancient Rome, Ecosystems"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                />
                <Button
                  variant="game"
                  onClick={() => setTopic("")}
                  aria-label="Clear topic"
                >
                  Clear
                </Button>
              </div>
            </article>
          </div>

          <div className="mt-8 flex justify-center">
            <Button size="xl" variant="hero" onClick={handleStart}>
              Start My Quest
            </Button>
          </div>
        </section>
      </main>
    </>
  );
};

export default ProfileSetup;
