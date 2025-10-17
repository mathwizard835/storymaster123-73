import { useEffect, useState } from "react";
import { Sparkles, Zap, Crown, Target } from "lucide-react";

interface PortalAnimationProps {
  characterName?: string;
  characterType?: string;
  onComplete: () => void;
}

export const PortalAnimation = ({ characterName, characterType, onComplete }: PortalAnimationProps) => {
  const [stage, setStage] = useState<'portal' | 'reveal' | 'ready'>('portal');
  
  useEffect(() => {
    // Portal opens (3s)
    const portalTimer = setTimeout(() => setStage('reveal'), 3000);
    
    // Character reveal (2s)
    const revealTimer = setTimeout(() => setStage('ready'), 5000);
    
    // Auto-complete after ready (1.5s)
    const completeTimer = setTimeout(() => onComplete(), 6500);
    
    return () => {
      clearTimeout(portalTimer);
      clearTimeout(revealTimer);
      clearTimeout(completeTimer);
    };
  }, [onComplete]);

  return (
    <div className="fixed inset-0 z-50 bg-gradient-to-b from-purple-950 via-blue-950 to-indigo-950 overflow-hidden">
      {/* Animated stars background */}
      <div className="absolute inset-0">
        {Array.from({ length: 50 }).map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-white rounded-full animate-pulse"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 3}s`,
              animationDuration: `${2 + Math.random() * 3}s`,
            }}
          />
        ))}
      </div>

      {/* Main Portal */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="relative">
          {/* Portal rings */}
          <div className={`transition-all duration-1000 ${stage === 'portal' ? 'scale-50 opacity-0' : 'scale-100 opacity-100'}`}>
            {/* Outer ring */}
            <div className="absolute inset-0 w-96 h-96 -translate-x-1/2 -translate-y-1/2 left-1/2 top-1/2">
              <div className="absolute inset-0 rounded-full border-4 border-purple-400/50 animate-[spin_6s_linear_infinite]">
                <Sparkles className="absolute -top-2 left-1/2 -translate-x-1/2 h-6 w-6 text-purple-400" />
              </div>
            </div>
            
            {/* Middle ring */}
            <div className="absolute inset-0 w-80 h-80 -translate-x-1/2 -translate-y-1/2 left-1/2 top-1/2">
              <div className="absolute inset-0 rounded-full border-4 border-blue-400/60 animate-[spin_4s_linear_infinite_reverse]">
                <Zap className="absolute top-0 left-1/2 -translate-x-1/2 h-6 w-6 text-blue-400" />
              </div>
            </div>
            
            {/* Inner ring */}
            <div className="absolute inset-0 w-64 h-64 -translate-x-1/2 -translate-y-1/2 left-1/2 top-1/2">
              <div className="absolute inset-0 rounded-full border-4 border-purple-500 animate-spin">
                <Target className="absolute right-0 top-1/2 -translate-y-1/2 h-6 w-6 text-purple-400" />
              </div>
            </div>

            {/* Portal center glow */}
            <div className="absolute inset-0 w-48 h-48 -translate-x-1/2 -translate-y-1/2 left-1/2 top-1/2">
              <div className="absolute inset-0 rounded-full bg-gradient-radial from-purple-500/80 via-blue-500/40 to-transparent animate-pulse"></div>
            </div>
          </div>

          {/* Character reveal */}
          <div className={`absolute inset-0 flex items-center justify-center transition-all duration-1000 ${
            stage === 'reveal' || stage === 'ready' ? 'scale-100 opacity-100' : 'scale-0 opacity-0'
          }`}>
            <div className="text-center space-y-6 max-w-lg px-8">
              <div className="relative">
                <Crown className="h-24 w-24 text-yellow-400 mx-auto animate-[bounce_2s_ease-in-out_infinite]" />
                <div className="absolute inset-0 bg-yellow-400/30 blur-3xl rounded-full animate-pulse"></div>
              </div>
              
              <div className="space-y-3">
                <h1 className="text-5xl font-bold text-white animate-[scale-in_0.5s_ease-out]">
                  {characterName ? `Welcome, ${characterName}!` : 'Welcome, Hero!'}
                </h1>
                
                <p className="text-2xl text-purple-300 animate-[fade-in_1s_ease-out_0.3s_both]">
                  Your {characterType || 'adventure'} begins now...
                </p>
                
                <div className="flex justify-center gap-3 pt-4 animate-[fade-in_1s_ease-out_0.6s_both]">
                  <Sparkles className="h-6 w-6 text-yellow-400 animate-[spin_3s_linear_infinite]" />
                  <Sparkles className="h-6 w-6 text-blue-400 animate-[spin_3s_linear_infinite_reverse]" />
                  <Sparkles className="h-6 w-6 text-purple-400 animate-[spin_3s_linear_infinite]" />
                </div>
              </div>

              {stage === 'ready' && (
                <button
                  onClick={onComplete}
                  className="mt-8 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white px-8 py-4 rounded-lg font-bold text-lg transition-all transform hover:scale-105 animate-[scale-in_0.3s_ease-out]"
                >
                  Enter Your Story ✨
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Energy waves */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-radial from-transparent via-purple-500/5 to-transparent animate-pulse"></div>
      </div>
    </div>
  );
};
