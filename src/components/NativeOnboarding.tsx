import { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, Volume2, VolumeX, Crosshair, Zap, Timer, Star, Heart, Target, Sparkles } from 'lucide-react';
import { addHapticFeedback } from '@/lib/mobileFeatures';
import { Preferences } from '@capacitor/preferences';
import { Capacitor } from '@capacitor/core';
import { useNavigate } from 'react-router-dom';
import actionHeroBg from '@/assets/action-hero-bg.jpg';

const ONBOARDING_KEY = 'hasSeenOnboarding';

type Choice = { label: string; next: SceneId };
type Scene = {
  id: SceneId;
  text: string;
  audio: string;
  choices: Choice[];
  isFinal?: boolean;
};
type SceneId =
  | 'scene1'
  | 'scene2'
  | 'scene3_pickup'
  | 'scene3_stepback'
  | 'scene4'
  | 'scene5_open'
  | 'scene5_hold'
  | 'scene6'
  | 'scene7';

const SCENES: Record<SceneId, Scene> = {
  scene1: {
    id: 'scene1',
    text: 'Your backpack is already open when you look at it.',
    audio: '/onboarding-story/scene1.mp3',
    choices: [{ label: 'Continue', next: 'scene2' }],
  },
  scene2: {
    id: 'scene2',
    text: 'You did not open it. The zipper is slightly undone.\n\nSomething inside taps twice.',
    audio: '/onboarding-story/scene2.mp3',
    choices: [
      { label: 'Pick it up', next: 'scene3_pickup' },
      { label: 'Step back', next: 'scene3_stepback' },
    ],
  },
  scene3_pickup: {
    id: 'scene3_pickup',
    text: 'It feels warm in your hands.',
    audio: '/onboarding-story/scene3_pickup.mp3',
    choices: [{ label: 'Continue', next: 'scene4' }],
  },
  scene3_stepback: {
    id: 'scene3_stepback',
    text: 'It shifts a little on its own.',
    audio: '/onboarding-story/scene3_stepback.mp3',
    choices: [{ label: 'Continue', next: 'scene4' }],
  },
  scene4: {
    id: 'scene4',
    text: 'The zipper moves again.',
    audio: '/onboarding-story/scene4.mp3',
    choices: [
      { label: 'Open it', next: 'scene5_open' },
      { label: 'Hold it closed', next: 'scene5_hold' },
    ],
  },
  scene5_open: {
    id: 'scene5_open',
    text: 'It is empty. The tapping continues.',
    audio: '/onboarding-story/scene5_open.mp3',
    choices: [{ label: 'Continue', next: 'scene6' }],
  },
  scene5_hold: {
    id: 'scene5_hold',
    text: 'The tapping slows… then starts again.',
    audio: '/onboarding-story/scene5_hold.mp3',
    choices: [{ label: 'Continue', next: 'scene6' }],
  },
  scene6: {
    id: 'scene6',
    text: 'Everything you do changes what happens next.',
    audio: '/onboarding-story/scene6.mp3',
    choices: [{ label: 'Continue', next: 'scene7' }],
  },
  scene7: {
    id: 'scene7',
    text: 'There is more to discover.',
    audio: '/onboarding-story/scene7.mp3',
    choices: [],
    isFinal: true,
  },
};

const ALL_AUDIO = Object.values(SCENES).map((s) => s.audio);
const STORY_TITLE = 'The Backpack';

export function NativeOnboarding({ onComplete }: { onComplete: () => void }) {
  const [started, setStarted] = useState(false);
  const [sceneId, setSceneId] = useState<SceneId>('scene1');
  const [muted, setMuted] = useState(false);
  const [choicePoints, setChoicePoints] = useState(0);
  const [sceneNumber, setSceneNumber] = useState(1);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const navigate = useNavigate();

  const scene = SCENES[sceneId];

  // Preload all audio for instant playback
  useEffect(() => {
    ALL_AUDIO.forEach((src) => {
      const a = new Audio();
      a.preload = 'auto';
      a.src = src;
    });
  }, []);

  // Play audio when scene changes (only after Start)
  useEffect(() => {
    if (!started || muted) return;
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    const a = new Audio(scene.audio);
    a.preload = 'auto';
    audioRef.current = a;
    a.play().catch(() => {
      /* autoplay blocked: silent */
    });
    return () => {
      a.pause();
    };
  }, [sceneId, muted, started, scene.audio]);

  const markComplete = useCallback(async () => {
    if (Capacitor.isNativePlatform()) {
      await Preferences.set({ key: ONBOARDING_KEY, value: 'true' });
    } else {
      localStorage.setItem(ONBOARDING_KEY, 'true');
    }
  }, []);

  const handleStart = () => {
    addHapticFeedback('medium');
    setStarted(true);
  };

  const handleChoice = (next: SceneId) => {
    addHapticFeedback('light');
    setChoicePoints((p) => p + 1);
    setSceneNumber((n) => n + 1);
    setSceneId(next);
  };

  const handleCTA = async () => {
    addHapticFeedback('medium');
    if (audioRef.current) audioRef.current.pause();
    await markComplete();
    onComplete();
    navigate('/auth?mode=signup');
  };

  const handleSkip = async () => {
    addHapticFeedback('light');
    if (audioRef.current) audioRef.current.pause();
    await markComplete();
    onComplete();
  };

  const toggleMute = () => {
    addHapticFeedback('light');
    setMuted((m) => {
      const next = !m;
      if (next && audioRef.current) audioRef.current.pause();
      return next;
    });
  };

  // Shared Action Mode shell
  const Shell = ({ children }: { children: React.ReactNode }) => (
    <div
      className="min-h-[100dvh] bg-cover bg-center bg-no-repeat relative"
      style={{
        backgroundImage: `url(${actionHeroBg})`,
        paddingTop: 'max(env(safe-area-inset-top, 0px), 0px)',
        paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 0px)',
      }}
    >
      <div className="absolute inset-0 bg-black/40" />
      <div className="relative z-10 min-h-[100dvh] flex flex-col">{children}</div>
    </div>
  );

  const Header = ({ showCounter }: { showCounter: boolean }) => (
    <div className="bg-black/30 backdrop-blur-sm border-b border-white/20 p-3 md:p-4">
      <div className="max-w-6xl mx-auto flex justify-between items-center gap-2">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/[0.08] border border-white/15 flex-shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-[hsl(0,85%,60%)] animate-pulse" />
            <span className="text-[10px] font-bold tracking-[0.15em] text-white/80">ACTION MODE</span>
          </div>
          <h1 className="font-bold text-white flex items-center gap-2 text-sm md:text-lg min-w-0">
            <Crosshair className="h-4 w-4 flex-shrink-0" />
            <span className="truncate">{STORY_TITLE}</span>
          </h1>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {showCounter && (
            <div className="text-white font-medium bg-white/10 px-2 py-1 rounded text-xs">
              Scene {sceneNumber}
            </div>
          )}
          <button
            onClick={toggleMute}
            className="w-8 h-8 rounded-full bg-white/[0.08] border border-white/15 flex items-center justify-center active:bg-white/[0.16]"
            aria-label={muted ? 'Unmute narration' : 'Mute narration'}
          >
            {muted ? (
              <VolumeX className="w-4 h-4 text-white/80" />
            ) : (
              <Volume2 className="w-4 h-4 text-white/80" />
            )}
          </button>
          <button
            onClick={handleSkip}
            className="text-white/60 text-xs font-medium px-2.5 py-1.5 rounded-full active:bg-white/10"
          >
            Skip
          </button>
        </div>
      </div>
    </div>
  );

  // ---------- Intro screen ----------
  if (!started) {
    return (
      <Shell>
        <Header showCounter={false} />
        <div className="flex-1 flex flex-col items-center justify-center px-6 py-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="w-full max-w-md bg-black/50 backdrop-blur-md rounded-2xl border border-white/20 p-7 text-center"
          >
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center">
                <Crosshair className="h-8 w-8 text-white" />
              </div>
            </div>
            <p className="text-white/60 text-[11px] font-bold tracking-[0.2em] mb-2">
              ACTION MODE · MINI STORY
            </p>
            <h2 className="text-white text-3xl font-bold mb-3">{STORY_TITLE}</h2>
            <p className="text-white/75 text-[15px] leading-relaxed mb-7">
              A 20‑second taste of how every choice changes your story.
            </p>
            <motion.button
              onClick={handleStart}
              whileTap={{ scale: 0.97 }}
              className="w-full py-4 rounded-xl bg-gradient-to-r from-[hsl(0,85%,55%)] to-[hsl(20,90%,55%)] text-white font-bold text-[17px] shadow-[0_12px_36px_-10px_hsl(10,90%,55%,0.7)] flex items-center justify-center gap-2"
            >
              <Sparkles className="w-5 h-5" />
              Start My Adventure
            </motion.button>
            <p className="text-white/40 text-xs mt-4">Tap choices to shape what happens next</p>
          </motion.div>
        </div>
      </Shell>
    );
  }

  // ---------- Story (Action Mode structure) ----------
  return (
    <Shell>
      <Header showCounter={true} />

      <div className="flex-1 p-3 md:p-4 overflow-y-auto">
        <div className="max-w-3xl mx-auto space-y-4 md:space-y-5">
          {/* HUD */}
          <div className="bg-black/50 backdrop-blur-sm rounded-lg p-4 border border-white/20">
            <div className="grid grid-cols-4 gap-3 text-center">
              <div className="flex items-center justify-center space-x-2">
                <Zap className="h-5 w-5 text-yellow-400" />
                <span className="text-white font-semibold text-sm">10</span>
              </div>
              <div className="flex items-center justify-center space-x-2">
                <Timer className="h-5 w-5 text-blue-400" />
                <span className="text-white font-semibold text-sm">20s</span>
              </div>
              <div className="flex items-center justify-center space-x-2">
                <Star className="h-5 w-5 text-purple-400" />
                <span className="text-white font-semibold text-sm">{choicePoints}</span>
              </div>
              <div className="flex items-center justify-center space-x-2">
                <Heart className="h-5 w-5 text-red-400 opacity-80" />
                <span className="text-white font-semibold text-sm opacity-80">Curious</span>
              </div>
            </div>
          </div>

          {/* Narrative */}
          <div className="bg-white/10 backdrop-blur-md rounded-lg p-6 border border-white/20">
            <AnimatePresence mode="wait">
              <motion.div
                key={sceneId}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                className="prose prose-invert max-w-none"
              >
                {scene.text.split('\n\n').map((paragraph, index) => (
                  <motion.p
                    key={`${sceneId}-${index}`}
                    className="text-white mb-4 last:mb-0 leading-relaxed text-lg whitespace-pre-line"
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.2, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                  >
                    {paragraph}
                  </motion.p>
                ))}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Choices / CTA */}
          <div className="bg-black/50 backdrop-blur-sm rounded-lg p-6 border border-white/20">
            {scene.isFinal ? (
              <>
                <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-[hsl(45,95%,65%)]" />
                  Your story is just beginning
                </h3>
                <motion.button
                  onClick={handleCTA}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  whileTap={{ scale: 0.97 }}
                  className="w-full py-4 rounded-xl bg-gradient-to-r from-[hsl(280,90%,60%)] via-[hsl(310,85%,58%)] to-[hsl(20,90%,58%)] text-white font-bold text-[17px] shadow-[0_12px_36px_-10px_hsl(290,90%,55%,0.7)] flex items-center justify-center gap-2"
                >
                  Keep the Adventure Going
                  <ChevronRight className="w-5 h-5" />
                </motion.button>
                <p className="text-white/50 text-xs text-center pt-3">
                  Unlimited interactive stories · $4.99/mo
                </p>
              </>
            ) : (
              <>
                <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  What do you choose?
                </h3>
                <div className="grid gap-3">
                  {scene.choices.map((c, i) => (
                    <motion.button
                      key={`${sceneId}-${c.label}`}
                      onClick={() => handleChoice(c.next)}
                      initial={{ opacity: 0, y: 16, scale: 0.97 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      transition={{ delay: 0.2 + i * 0.08, duration: 0.35 }}
                      whileTap={{ scale: 0.97 }}
                      className="w-full p-4 rounded-lg bg-white/10 hover:bg-white/15 border-2 border-white/20 hover:border-white/30 text-white font-semibold text-left transition-all flex items-center justify-between gap-3"
                    >
                      <span>{c.label}</span>
                      <ChevronRight className="w-5 h-5 text-white/60 flex-shrink-0" />
                    </motion.button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </Shell>
  );
}

export async function hasSeenOnboarding(): Promise<boolean> {
  if (Capacitor.isNativePlatform()) {
    const { value } = await Preferences.get({ key: ONBOARDING_KEY });
    return value === 'true';
  }
  return localStorage.getItem(ONBOARDING_KEY) === 'true';
}
