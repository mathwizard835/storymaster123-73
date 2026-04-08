import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen, Sparkles, Shield, ChevronRight } from 'lucide-react';
import { addHapticFeedback } from '@/lib/mobileFeatures';
import { Preferences } from '@capacitor/preferences';
import { Capacitor } from '@capacitor/core';

const ONBOARDING_KEY = 'hasSeenOnboarding';

interface OnboardingSlide {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  color: string;
}

const slides: OnboardingSlide[] = [
  {
    icon: BookOpen,
    title: 'Interactive Stories',
    description: 'Your child makes choices that shape each adventure — building reading skills along the way.',
    color: 'from-[hsl(265,85%,55%)] to-[hsl(285,75%,50%)]',
  },
  {
    icon: Sparkles,
    title: 'AI-Powered Magic',
    description: 'Every story is unique. Our AI creates personalized tales based on your child\'s interests and reading level.',
    color: 'from-[hsl(195,85%,50%)] to-[hsl(220,80%,55%)]',
  },
  {
    icon: Shield,
    title: 'Safe & Kid-Friendly',
    description: 'All content is moderated and age-appropriate. Parents can track progress from their own dashboard.',
    color: 'from-[hsl(145,70%,45%)] to-[hsl(170,65%,40%)]',
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
      {/* Skip button */}
      <div className="flex justify-end p-6 pt-safe-top z-20" style={{ paddingTop: 'max(env(safe-area-inset-top, 16px), 16px)' }}>
        <button
          onClick={markComplete}
          className="text-white/40 text-sm font-medium px-3 py-1.5 rounded-full active:bg-white/10 transition-colors"
        >
          Skip
        </button>
      </div>

      {/* Slide content */}
      <div className="flex-1 flex flex-col items-center justify-center px-10">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={currentSlide}
            custom={direction}
            initial={{ opacity: 0, x: direction * 80 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: direction * -80 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="flex flex-col items-center text-center gap-8"
          >
            <motion.div
              className={`w-24 h-24 rounded-3xl bg-gradient-to-br ${slide.color} flex items-center justify-center shadow-2xl`}
              initial={{ scale: 0.7 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.1, type: 'spring', stiffness: 300, damping: 20 }}
            >
              <Icon className="w-12 h-12 text-white" />
            </motion.div>
            <div className="space-y-3 max-w-[300px]">
              <h2 className="text-3xl font-extrabold text-white tracking-tight">{slide.title}</h2>
              <p className="text-white/50 text-base leading-relaxed">{slide.description}</p>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Bottom controls */}
      <div className="px-8 pb-safe-bottom z-20" style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 24px), 24px)' }}>
        {/* Dot indicators */}
        <div className="flex justify-center gap-2 mb-8">
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
          {isLast ? 'Get Started' : 'Continue'}
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
