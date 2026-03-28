import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Sparkles, BookOpen, Wand2 } from 'lucide-react';
import { addHapticFeedback } from '@/lib/mobileFeatures';

const NativeWelcome = () => {
  const navigate = useNavigate();

  const handleGetStarted = () => {
    addHapticFeedback('medium');
    navigate('/auth');
  };

  return (
    <div className="min-h-[100dvh] flex flex-col items-center justify-between bg-gradient-to-b from-[hsl(250,50%,12%)] via-[hsl(265,55%,15%)] to-[hsl(230,50%,8%)] overflow-hidden relative">
      {/* Ambient glow circles */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[500px] h-[500px] rounded-full bg-[hsl(265,85%,60%)] opacity-[0.08] blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-0 w-[300px] h-[300px] rounded-full bg-[hsl(195,85%,55%)] opacity-[0.06] blur-[100px] pointer-events-none" />

      {/* Top spacer for safe area */}
      <div className="flex-shrink-0 h-8" />

      {/* Hero content */}
      <motion.div
        className="flex flex-col items-center text-center px-8 gap-6 z-10"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      >
        {/* Animated icon cluster */}
        <motion.div
          className="relative w-28 h-28 mb-2"
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.6, ease: 'easeOut' }}
        >
          <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-[hsl(265,85%,60%)] to-[hsl(195,85%,55%)] opacity-20 blur-xl" />
          <div className="relative w-full h-full rounded-3xl bg-gradient-to-br from-[hsl(265,85%,55%)] to-[hsl(195,85%,50%)] flex items-center justify-center shadow-2xl">
            <BookOpen className="w-14 h-14 text-white" strokeWidth={1.5} />
          </div>
          <motion.div
            className="absolute -top-2 -right-2"
            animate={{ rotate: [0, 15, -15, 0], scale: [1, 1.2, 1] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          >
            <Sparkles className="w-7 h-7 text-[hsl(45,90%,65%)]" />
          </motion.div>
        </motion.div>

        <div className="space-y-3">
          <h1 className="text-4xl font-heading font-extrabold text-white tracking-tight leading-tight">
            StoryMaster Kids
          </h1>
          <p className="text-white/50 text-base font-medium max-w-[280px] leading-relaxed">
            Interactive stories that build reading skills — powered by your imagination
          </p>
        </div>

        {/* Feature pills */}
        <motion.div
          className="flex flex-wrap justify-center gap-2 mt-2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.5 }}
        >
          {[
            { icon: Wand2, label: 'AI-Powered' },
            { icon: BookOpen, label: '2,500+ Words' },
            { icon: Sparkles, label: 'Choose Your Path' },
          ].map((item, i) => (
            <span
              key={i}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/[0.07] border border-white/[0.08] text-white/60 text-xs font-medium backdrop-blur-sm"
            >
              <item.icon className="w-3.5 h-3.5" />
              {item.label}
            </span>
          ))}
        </motion.div>
      </motion.div>

      {/* Bottom CTA area */}
      <motion.div
        className="w-full px-8 pb-safe-bottom z-10"
        style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 24px), 24px)' }}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6, duration: 0.5 }}
      >
        <button
          onClick={handleGetStarted}
          className="w-full py-4 rounded-2xl bg-gradient-to-r from-[hsl(265,85%,60%)] to-[hsl(195,85%,55%)] text-white font-bold text-lg shadow-[0_8px_32px_-8px_hsl(265,85%,60%,0.5)] active:scale-[0.97] transition-transform duration-100"
        >
          Get Started
        </button>
        <p className="text-center text-white/30 text-xs mt-4 mb-2">
          3 free stories • No credit card required
        </p>
      </motion.div>
    </div>
  );
};

export default NativeWelcome;
