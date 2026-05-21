import { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, Volume2, VolumeX, Sparkles, Backpack } from 'lucide-react';
import { addHapticFeedback } from '@/lib/mobileFeatures';
import { Preferences } from '@capacitor/preferences';
import { Capacitor } from '@capacitor/core';
import { useNavigate } from 'react-router-dom';

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
    text: 'You did not open it. The zipper is slightly undone.\nSomething inside taps twice.',
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

const ALL_AUDIO = Object.values(SCENES).map(s => s.audio);

export function NativeOnboarding({ onComplete }: { onComplete: () => void }) {
  const [sceneId, setSceneId] = useState<SceneId>('scene1');
  const [muted, setMuted] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const navigate = useNavigate();

  const scene = SCENES[sceneId];

  // Preload every audio file so playback is instant
  useEffect(() => {
    ALL_AUDIO.forEach(src => {
      const a = new Audio();
      a.preload = 'auto';
      a.src = src;
    });
  }, []);

  // Play audio whenever the scene changes
  useEffect(() => {
    if (muted) return;
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    const a = new Audio(scene.audio);
    a.preload = 'auto';
    audioRef.current = a;
    a.play().catch(() => {/* autoplay blocked: silent */});
    return () => { a.pause(); };
  }, [sceneId, muted, scene.audio]);

  const markComplete = useCallback(async () => {
    if (Capacitor.isNativePlatform()) {
      await Preferences.set({ key: ONBOARDING_KEY, value: 'true' });
    } else {
      localStorage.setItem(ONBOARDING_KEY, 'true');
    }
  }, []);

  const handleChoice = (next: SceneId) => {
    addHapticFeedback('light');
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
    setMuted(m => {
      const next = !m;
      if (next && audioRef.current) audioRef.current.pause();
      return next;
    });
  };

  return (
    <div className="min-h-[100dvh] flex flex-col bg-gradient-to-b from-[hsl(250,55%,8%)] via-[hsl(265,50%,12%)] to-[hsl(230,55%,6%)] overflow-hidden relative">
      {/* Atmospheric glow */}
      <motion.div
        className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[520px] h-[520px] rounded-full bg-[hsl(280,90%,55%)] opacity-[0.10] blur-[120px] pointer-events-none"
        animate={{ scale: [1, 1.15, 1], opacity: [0.08, 0.14, 0.08] }}
        transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* Top bar */}
      <div
        className="flex items-center justify-between px-5 z-20"
        style={{ paddingTop: 'max(env(safe-area-inset-top, 16px), 16px)', paddingBottom: 12 }}
      >
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/[0.06] border border-white/10">
          <span className="w-1.5 h-1.5 rounded-full bg-[hsl(0,85%,60%)] animate-pulse" />
          <span className="text-[10px] font-bold tracking-[0.15em] text-white/70">ACTION MODE</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={toggleMute}
            className="w-9 h-9 rounded-full bg-white/[0.06] border border-white/10 flex items-center justify-center active:bg-white/[0.12]"
            aria-label={muted ? 'Unmute narration' : 'Mute narration'}
          >
            {muted ? <VolumeX className="w-4 h-4 text-white/70" /> : <Volume2 className="w-4 h-4 text-white/70" />}
          </button>
          {!scene.isFinal && (
            <button
              onClick={handleSkip}
              className="text-white/40 text-sm font-medium px-3 py-1.5 rounded-full active:bg-white/10"
            >
              Skip
            </button>
          )}
        </div>
      </div>

      {/* Scene */}
      <div className="flex-1 flex flex-col items-center justify-center px-7 z-10">
        <AnimatePresence mode="wait">
          <motion.div
            key={sceneId}
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            className="flex flex-col items-center text-center gap-7 w-full max-w-[360px]"
          >
            {/* Animated backpack icon */}
            <motion.div
              className="relative w-24 h-24 rounded-[28px] bg-gradient-to-br from-[hsl(280,80%,40%)] to-[hsl(250,75%,30%)] flex items-center justify-center shadow-[0_20px_60px_-15px_hsl(280,90%,50%,0.6)]"
              animate={{ rotate: [0, -2, 2, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
            >
              <Backpack className="w-12 h-12 text-white" strokeWidth={1.6} />
              <motion.div
                className="absolute -top-2 -right-2"
                animate={{ scale: [1, 1.3, 1], rotate: [0, 25, 0] }}
                transition={{ duration: 2.2, repeat: Infinity }}
              >
                <Sparkles className="w-5 h-5 text-[hsl(45,95%,65%)]" />
              </motion.div>
            </motion.div>

            {/* Scene narration */}
            <p className="text-white text-[22px] leading-[1.35] font-semibold tracking-tight whitespace-pre-line">
              {scene.text}
            </p>

            {/* Choices or CTA */}
            <div className="w-full space-y-2.5 pt-2">
              {scene.isFinal ? (
                <>
                  <motion.button
                    onClick={handleCTA}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="w-full py-4 rounded-2xl bg-gradient-to-r from-[hsl(280,90%,60%)] via-[hsl(310,85%,58%)] to-[hsl(20,90%,58%)] text-white font-bold text-[17px] shadow-[0_12px_36px_-10px_hsl(290,90%,55%,0.7)] active:scale-[0.97] transition-transform duration-100 flex items-center justify-center gap-2"
                  >
                    Keep the Adventure Going
                    <ChevronRight className="w-5 h-5" />
                  </motion.button>
                  <p className="text-white/45 text-xs text-center pt-1">
                    Unlimited interactive stories · $4.99/mo
                  </p>
                </>
              ) : (
                scene.choices.map((c, i) => (
                  <motion.button
                    key={`${sceneId}-${c.label}`}
                    onClick={() => handleChoice(c.next)}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.35 + i * 0.08 }}
                    className="w-full py-3.5 rounded-2xl bg-white/[0.07] border border-white/15 text-white font-semibold text-[15px] backdrop-blur-sm active:scale-[0.97] active:bg-white/[0.12] transition-all flex items-center justify-center gap-2"
                  >
                    {c.label}
                    <ChevronRight className="w-4 h-4 text-white/60" />
                  </motion.button>
                ))
              )}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Bottom hint */}
      <div
        className="px-7 z-20 text-center"
        style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 20px), 20px)', paddingTop: 12 }}
      >
        <p className="text-white/30 text-[11px] font-medium tracking-wide">
          {scene.isFinal ? 'Your story · Your choices · Your adventure' : 'Tap a choice to shape the story'}
        </p>
      </div>
    </div>
  );
}

export async function hasSeenOnboarding(): Promise<boolean> {
  if (Capacitor.isNativePlatform()) {
    const { value } = await Preferences.get({ key: ONBOARDING_KEY });
    return value === 'true';
  }
  return localStorage.getItem(ONBOARDING_KEY) === 'true';
}
