import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Palette } from "lucide-react";

const themes = [
  { id: "default", name: "Default", colors: ["hsl(265, 85%, 60%)", "hsl(195, 85%, 55%)", "hsl(320, 80%, 60%)"] },
  { id: "ocean", name: "Ocean Wave", colors: ["hsl(160, 75%, 45%)", "hsl(180, 85%, 50%)", "hsl(200, 90%, 55%)"] },
  { id: "purple", name: "Purple Dream", colors: ["hsl(250, 75%, 55%)", "hsl(270, 85%, 60%)", "hsl(290, 80%, 65%)"] },
  { id: "pink", name: "Pink Sunset", colors: ["hsl(310, 75%, 65%)", "hsl(330, 85%, 60%)", "hsl(350, 80%, 55%)"] },
  { id: "deepblue", name: "Deep Blue", colors: ["hsl(200, 75%, 50%)", "hsl(220, 85%, 55%)", "hsl(240, 80%, 60%)"] },
];

export const PremiumThemeSelector = () => {
  const [currentTheme, setCurrentTheme] = useState("default");

  useEffect(() => {
    // Load saved theme
    const savedTheme = localStorage.getItem("premium-theme") || "default";
    setCurrentTheme(savedTheme);
    if (savedTheme !== "default") {
      document.documentElement.setAttribute("data-theme", savedTheme);
    }
  }, []);

  const handleThemeChange = (themeId: string) => {
    setCurrentTheme(themeId);
    localStorage.setItem("premium-theme", themeId);
    
    if (themeId === "default") {
      document.documentElement.removeAttribute("data-theme");
    } else {
      document.documentElement.setAttribute("data-theme", themeId);
    }
  };

  return (
    <Card className="overflow-hidden bg-card/50 backdrop-blur-sm border-border/50">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Palette className="h-5 w-5 text-primary" />
          <CardTitle>Premium Themes</CardTitle>
        </div>
        <CardDescription>
          Customize your dashboard with beautiful themes
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
          {themes.map((theme) => (
            <Button
              key={theme.id}
              variant="outline"
              className={`h-auto flex flex-col items-center gap-2 p-3 transition-all ${
                currentTheme === theme.id ? "ring-2 ring-primary scale-105" : ""
              } hover:scale-105`}
              onClick={() => handleThemeChange(theme.id)}
            >
              <div className="flex gap-1">
                {theme.colors.map((color, i) => (
                  <div
                    key={i}
                    className="w-6 h-6 rounded-full border border-border"
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
              <span className="text-xs font-medium">{theme.name}</span>
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
