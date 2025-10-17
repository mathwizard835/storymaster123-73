import { Wand2, Sparkles, Stars, BookOpen } from "lucide-react";
import { useEffect, useState } from "react";

interface StoryMagicLoaderProps {
  mode?: string;
}

export const StoryMagicLoader = ({ mode }: StoryMagicLoaderProps) => {
  const [particles, setParticles] = useState<Array<{ id: number; x: number; y: number; delay: number }>>([]);

  useEffect(() => {
    // Generate floating particles
    const newParticles = Array.from({ length: 20 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      delay: Math.random() * 2,
    }));
    setParticles(newParticles);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated Background Particles */}
      <div className="absolute inset-0 overflow-hidden">
        {particles.map((particle) => (
          <div
            key={particle.id}
            className="absolute animate-[float_6s_ease-in-out_infinite]"
            style={{
              left: `${particle.x}%`,
              top: `${particle.y}%`,
              animationDelay: `${particle.delay}s`,
            }}
          >
            <Sparkles className="h-4 w-4 text-purple-300/30" />
          </div>
        ))}
      </div>

      {/* Main Content */}
      <div className="relative z-10 text-center space-y-8 max-w-md">
        {/* Animated Magic Circle */}
        <div className="relative w-32 h-32 mx-auto">
          {/* Outer rotating ring */}
          <div className="absolute inset-0 border-4 border-purple-300/30 rounded-full animate-spin"></div>
          
          {/* Middle ring - counter rotation */}
          <div className="absolute inset-2 border-4 border-blue-300/40 rounded-full animate-[spin_3s_linear_infinite_reverse]"></div>
          
          {/* Inner ring */}
          <div className="absolute inset-4 border-4 border-purple-300 border-t-transparent rounded-full animate-spin"></div>
          
          {/* Center icon */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="relative">
              <Wand2 className="h-12 w-12 text-purple-300 animate-pulse" />
              <Stars className="h-6 w-6 text-yellow-300 absolute -top-1 -right-1 animate-[spin_4s_linear_infinite]" />
            </div>
          </div>

          {/* Orbiting sparkles */}
          <div className="absolute inset-0 animate-[spin_8s_linear_infinite]">
            <Sparkles className="h-5 w-5 text-yellow-300 absolute top-0 left-1/2 -translate-x-1/2" />
          </div>
          <div className="absolute inset-0 animate-[spin_8s_linear_infinite_reverse]">
            <Sparkles className="h-5 w-5 text-blue-300 absolute bottom-0 left-1/2 -translate-x-1/2" />
          </div>
        </div>

        {/* Text Content with typing effect */}
        <div className="space-y-4">
          <h2 className="text-3xl font-bold text-white animate-[fade-in_1s_ease-out]">
            ✨ Preparing Your Adventure
          </h2>
          
          <div className="space-y-2">
            <p className="text-purple-200 text-lg animate-[fade-in_1s_ease-out_0.3s_both]">
              The StoryMaster is weaving your tale...
            </p>
            
            {mode === 'learning' && (
              <p className="text-blue-200 flex items-center justify-center gap-2 animate-[fade-in_1s_ease-out_0.6s_both]">
                <BookOpen className="h-5 w-5" />
                Setting up interactive learning experience
              </p>
            )}
          </div>

          {/* Loading dots */}
          <div className="flex justify-center gap-2 pt-4">
            <div className="w-3 h-3 bg-purple-400 rounded-full animate-[bounce_1s_ease-in-out_infinite]"></div>
            <div className="w-3 h-3 bg-blue-400 rounded-full animate-[bounce_1s_ease-in-out_0.2s_infinite]"></div>
            <div className="w-3 h-3 bg-purple-400 rounded-full animate-[bounce_1s_ease-in-out_0.4s_infinite]"></div>
          </div>
        </div>

        {/* Magic effect at bottom */}
        <div className="absolute -bottom-20 left-1/2 -translate-x-1/2 w-64 h-64 bg-purple-500/20 rounded-full blur-3xl animate-pulse"></div>
      </div>

      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0) rotate(0deg); opacity: 0.3; }
          50% { transform: translateY(-20px) rotate(180deg); opacity: 0.6; }
        }
      `}</style>
    </div>
  );
};
