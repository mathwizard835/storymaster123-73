import { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen, Volume2, Gauge, ShieldCheck, Trophy, ChevronRight, Sparkles, Loader2, Play } from 'lucide-react';
import { addHapticFeedback } from '@/lib/mobileFeatures';
import { Preferences } from '@capacitor/preferences';
import { Capacitor } from '@capacitor/core';
import { supabase } from '@/integrations/supabase/client';

const ONBOARDING_KEY = 'hasSeenOnboarding';

// Mystery mode voice ID (matches in-game Read-to-Me for Mystery mode)
const MYSTERY_VOICE_ID = '1UllZlmEKI6fNlrEtCx7';
const MYSTERY_NARRATION_TEXT =
  'The clock struck midnight as the detective slipped through the shadowed hall, every footstep a whispered clue.';

interface OnboardingSlide {
  icon: React.ComponentType<any>;
  eyebrow: string;
  title: string;
  description: string;
  color: string;
  demo: React.ReactNode;
}

/* ---------- Inline animated demos ---------- */

const ChoicesDemo = () => {
  const [picked, setPicked] = useState<number | null>(null);
  const choices = ['Sneak past the dragon', 'Offer it a snack', 'Cast a glitter spell'];
  return (
    <div className="w-full max-w-[280px] rounded-2xl bg-white/[0.06] border border-white/10 p-4 backdrop-blur-sm space-y-2">
      <p className="text-white/70 text-xs leading-snug italic">
        "A sleepy dragon blocks your path. What do you do?"
      </p>
      <div className="space-y-1.5">
        {choices.map((c, i) => (
          <motion.button
            key={i}
            onClick={() => { addHapticFeedback('light'); setPicked(i); }}
            className={`w-full text-left px-3 py-2 rounded-xl text-xs font-medium border transition-all ${
              picked === i
                ? 'bg-gradient-to-r from-[hsl(265,85%,55%)] to-[hsl(195,85%,50%)] border-transparent text-white'
                : 'bg-white/[0.04] border-white/10 text-white/80 active:scale-[0.98]'
            }`}
            animate={picked === i ? { scale: [1, 1.04, 1] } : {}}
            transition={{ duration: 0.3 }}
          >
            {c}
          </motion.button>
        ))}
      </div>
    </div>
  );
};

const NarrationDemo = () => {
  const words = MYSTERY_NARRATION_TEXT.split(' ');
  const [isLoading, setIsLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const cachedSrcRef = useRef<string | null>(null);

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const playFromSrc = async (src: string) => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
    const audio = new Audio(src);
    audioRef.current = audio;
    audio.onended = () => setIsPlaying(false);
    audio.onpause = () => setIsPlaying(false);
    await audio.play();
    setIsPlaying(true);
  };

  const handlePlay = async () => {
    addHapticFeedback('light');
    if (isPlaying && audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
      return;
    }
    if (isLoading) return;

    // Replay from cache — no extra ElevenLabs cost
    if (cachedSrcRef.current) {
      try {
        await playFromSrc(cachedSrcRef.current);
      } catch (err) {
        console.error('Onboarding narration replay error:', err);
      }
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('text-to-speech', {
        body: { text: MYSTERY_NARRATION_TEXT, voiceId: MYSTERY_VOICE_ID },
      });
      if (error) throw error;
      if (!data?.audioContent) throw new Error('No audio returned');

      const src = `data:audio/mpeg;base64,${data.audioContent}`;
      cachedSrcRef.current = src;
      await playFromSrc(src);
    } catch (err) {
      console.error('Onboarding narration error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-[280px] rounded-2xl bg-white/[0.06] border border-white/10 p-4 backdrop-blur-sm">
      <div className="flex items-center gap-3 mb-3">
        <motion.button
          onClick={handlePlay}
          aria-label={isPlaying ? 'Pause narration' : 'Play narration'}
          animate={isPlaying ? { scale: [1, 1.15, 1] } : { scale: 1 }}
          transition={isPlaying ? { duration: 1.2, repeat: Infinity } : { duration: 0.2 }}
          className="w-10 h-10 rounded-full bg-gradient-to-br from-[hsl(310,80%,60%)] to-[hsl(265,85%,55%)] flex items-center justify-center active:scale-95"
        >
          {isLoading ? (
            <Loader2 className="w-5 h-5 text-white animate-spin" />
          ) : isPlaying ? (
            <Volume2 className="w-5 h-5 text-white" />
          ) : (
            <Play className="w-5 h-5 text-white ml-0.5" fill="currentColor" />
          )}
        </motion.button>
        <div className="flex-1 flex items-end gap-0.5 h-6">
          {[...Array(14)].map((_, i) => (
            <motion.div
              key={i}
              className="flex-1 bg-gradient-to-t from-[hsl(310,80%,60%)] to-[hsl(195,85%,55%)] rounded-full"
              animate={isPlaying ? { height: ['20%', '90%', '40%', '70%', '20%'] } : { height: '20%' }}
              transition={isPlaying ? { duration: 1.2, repeat: Infinity, delay: i * 0.08 } : { duration: 0.3 }}
            />
          ))}
        </div>
      </div>
      <p className="text-sm leading-relaxed">
        {words.map((w, i) => (
          <motion.span
            key={i}
            className="inline-block mr-1 text-white/40"
            animate={isPlaying ? { color: ['hsl(0,0%,100%,0.4)', 'hsl(45,90%,65%)', 'hsl(0,0%,100%,0.4)'] } : { color: 'hsl(0,0%,100%,0.4)' }}
            transition={isPlaying ? { duration: words.length * 0.4, repeat: Infinity, delay: i * 0.4, times: [0, 0.1, 1] } : { duration: 0.2 }}
          >
            {w}
          </motion.span>
        ))}
      </p>
    </div>
  );
};

const LevelDemo = () => {
  const levels = ['200L', '500L', '800L', '1200L'];
  return (
    <div className="w-full max-w-[280px] rounded-2xl bg-white/[0.06] border border-white/10 p-4 backdrop-blur-sm space-y-3">
      <div className="flex justify-between text-[10px] font-semibold text-white/40 px-1">
        {levels.map(l => <span key={l}>{l}</span>)}
      </div>
      <div className="relative h-2 bg-white/10 rounded-full overflow-hidden">
        <motion.div
          className="absolute inset-y-0 left-0 bg-gradient-to-r from-[hsl(145,70%,45%)] to-[hsl(195,85%,55%)] rounded-full"
          animate={{ width: ['15%', '85%', '50%', '15%'] }}
          transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-white shadow-lg"
          animate={{ left: ['12%', '82%', '47%', '12%'] }}
          transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
        />
      </div>
      <AnimatePresence mode="wait">
        <motion.p
          key="sample"
          className="text-xs text-white/60 italic leading-relaxed text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4 }}
        >
          Tailored reading levels, controlled by parents.
        </motion.p>
      </AnimatePresence>
    </div>
  );
};

const SafetyDemo = () => (
  <div className="w-full max-w-[280px] rounded-2xl bg-white/[0.06] border border-white/10 p-4 backdrop-blur-sm space-y-2.5">
    {[
      { label: 'No scary content', ok: true },
      { label: 'No ads, no chats', ok: true },
      { label: 'Parent dashboard', ok: true },
      { label: 'COPPA compliant', ok: true },
    ].map((row, i) => (
      <motion.div
        key={row.label}
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.15 + i * 0.12 }}
        className="flex items-center gap-2.5"
      >
        <div className="w-5 h-5 rounded-full bg-[hsl(145,70%,45%)]/20 border border-[hsl(145,70%,45%)]/40 flex items-center justify-center">
          <ShieldCheck className="w-3 h-3 text-[hsl(145,70%,55%)]" />
        </div>
        <span className="text-xs text-white/75 font-medium">{row.label}</span>
      </motion.div>
    ))}
  </div>
);

const ProgressDemo = () => (
  <div className="w-full max-w-[280px] rounded-2xl bg-white/[0.06] border border-white/10 p-4 backdrop-blur-sm space-y-3">
    <div>
      <div className="flex justify-between text-[10px] font-bold text-white/60 mb-1.5">
        <span>LEVEL 4</span>
        <span>320 / 500 XP</span>
      </div>
      <div className="h-2.5 bg-white/10 rounded-full overflow-hidden">
        <motion.div
          className="h-full bg-gradient-to-r from-[hsl(45,95%,55%)] to-[hsl(20,90%,55%)]"
          initial={{ width: '20%' }}
          animate={{ width: '64%' }}
          transition={{ duration: 1.4, delay: 0.2, ease: 'easeOut' }}
        />
      </div>
    </div>
    <div className="flex justify-around pt-1">
      {['🔥', '⭐', '🏆'].map((emoji, i) => (
        <motion.div
          key={i}
          initial={{ scale: 0, rotate: -45 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ delay: 0.6 + i * 0.18, type: 'spring', stiffness: 300 }}
          className="w-11 h-11 rounded-xl bg-gradient-to-br from-white/10 to-white/[0.03] border border-white/15 flex items-center justify-center text-xl"
        >
          {emoji}
        </motion.div>
      ))}
    </div>
    <div className="text-[10px] text-center text-white/50 font-medium">
      7-day streak · 12 stories read
    </div>
  </div>
);

const slides: OnboardingSlide[] = [
  {
    icon: BookOpen,
    eyebrow: 'CHOOSE YOUR PATH',
    title: 'Stories that listen to your child',
    description: 'Every tap shapes the adventure. Kids drive the plot — they aren\'t just watching.',
    color: 'from-[hsl(265,85%,55%)] to-[hsl(285,75%,50%)]',
    demo: <ChoicesDemo />,
  },
  {
    icon: Volume2,
    eyebrow: 'READ-TO-ME',
    title: 'Pro narration brings every scene to life',
    description: 'Reluctant readers stay engaged with cinematic voices that follow along word by word.',
    color: 'from-[hsl(310,80%,60%)] to-[hsl(265,85%,55%)]',
    demo: <NarrationDemo />,
  },
  {
    icon: Gauge,
    eyebrow: 'GROWS WITH YOUR READER',
    title: 'Always the right challenge',
    description: "Easily adjust story difficulty to match your child's exact reading level — customizable reading designed to grow with them.",
    color: 'from-[hsl(195,85%,50%)] to-[hsl(220,80%,55%)]',
    demo: <LevelDemo />,
  },
  {
    icon: ShieldCheck,
    eyebrow: 'BUILT FOR PARENTS',
    title: 'Zero scary content. Full visibility.',
    description: 'No ads, no chats, no surprises. Track every story from the parent dashboard.',
    color: 'from-[hsl(145,70%,45%)] to-[hsl(170,65%,40%)]',
    demo: <SafetyDemo />,
  },
  {
    icon: Trophy,
    eyebrow: 'SCREEN TIME, EARNED',
    title: 'Real reading progress, real rewards',
    description: 'Streaks, levels, and badges that turn screen time into time well spent.',
    color: 'from-[hsl(45,95%,55%)] to-[hsl(20,90%,55%)]',
    demo: <ProgressDemo />,
  },
];

export function NativeOnboarding({ onComplete }: { onComplete: () => void }) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [direction, setDirection] = useState(0);

  const markComplete = useCallback(async () => {
    addHapticFeedback('medium');
    if (Capacitor.isNativePlatform()) {
      await Preferences.set({ key: ONBOARDING_KEY, value: 'true' });
    } else {
      localStorage.setItem(ONBOARDING_KEY, 'true');
    }
    onComplete();
  }, [onComplete]);

  const goNext = () => {
    addHapticFeedback('light');
    if (currentSlide === slides.length - 1) {
      markComplete();
    } else {
      setDirection(1);
      setCurrentSlide(prev => prev + 1);
    }
  };

  const goTo = (index: number) => {
    addHapticFeedback('light');
    setDirection(index > currentSlide ? 1 : -1);
    setCurrentSlide(index);
  };

  const slide = slides[currentSlide];
  const Icon = slide.icon;
  const isLast = currentSlide === slides.length - 1;

  return (
    <div className="min-h-[100dvh] flex flex-col bg-gradient-to-b from-[hsl(250,50%,12%)] via-[hsl(265,55%,15%)] to-[hsl(230,50%,8%)] overflow-hidden relative">
      {/* Ambient glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[500px] h-[500px] rounded-full bg-[hsl(265,85%,60%)] opacity-[0.07] blur-[120px] pointer-events-none" />

      {/* Skip button */}
      <div
        className="flex justify-end p-6 z-20"
        style={{ paddingTop: 'max(env(safe-area-inset-top, 16px), 16px)' }}
      >
        <button
          onClick={markComplete}
          className="text-white/40 text-sm font-medium px-3 py-1.5 rounded-full active:bg-white/10 transition-colors"
        >
          Skip
        </button>
      </div>

      {/* Slide content */}
      <div className="flex-1 flex flex-col items-center justify-center px-8 z-10">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={currentSlide}
            custom={direction}
            initial={{ opacity: 0, x: direction * 60 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: direction * -60 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="flex flex-col items-center text-center gap-6 w-full"
          >
            <motion.div
              className={`relative w-20 h-20 rounded-3xl bg-gradient-to-br ${slide.color} flex items-center justify-center shadow-2xl`}
              initial={{ scale: 0.7 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.1, type: 'spring', stiffness: 300, damping: 20 }}
            >
              <Icon className="w-10 h-10 text-white" strokeWidth={1.8} />
              <motion.div
                className="absolute -top-1.5 -right-1.5"
                animate={{ rotate: [0, 20, -20, 0], scale: [1, 1.2, 1] }}
                transition={{ duration: 3, repeat: Infinity }}
              >
                <Sparkles className="w-5 h-5 text-[hsl(45,90%,65%)]" />
              </motion.div>
            </motion.div>

            <div className="space-y-2.5 max-w-[320px]">
              <p className="text-[10px] font-bold tracking-[0.18em] text-white/40">
                {slide.eyebrow}
              </p>
              <h2 className="text-[26px] leading-[1.15] font-extrabold text-white tracking-tight">
                {slide.title}
              </h2>
              <p className="text-white/55 text-sm leading-relaxed">
                {slide.description}
              </p>
            </div>

            <div className="pt-2">{slide.demo}</div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Bottom controls */}
      <div
        className="px-8 z-20"
        style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 24px), 24px)' }}
      >
        <div className="flex justify-center gap-2 mb-6">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => goTo(i)}
              className={`h-2 rounded-full transition-all duration-300 ${
                i === currentSlide ? 'w-6 bg-white' : 'w-2 bg-white/25'
              }`}
            />
          ))}
        </div>

        <button
          onClick={goNext}
          className="w-full py-4 rounded-2xl bg-gradient-to-r from-[hsl(265,85%,60%)] to-[hsl(195,85%,55%)] text-white font-bold text-lg shadow-[0_8px_32px_-8px_hsl(265,85%,60%,0.5)] active:scale-[0.97] transition-transform duration-100 flex items-center justify-center gap-2"
        >
          {isLast ? 'Create Account' : 'Continue'}
          <ChevronRight className="w-5 h-5" />
        </button>
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
