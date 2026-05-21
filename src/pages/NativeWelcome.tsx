import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Sparkles, BookOpen, Volume2, Gauge, ShieldCheck, Check } from 'lucide-react';
import { addHapticFeedback } from '@/lib/mobileFeatures';
import { useAuth } from '@/hooks/useAuth';
import { NativeLoadingScreen } from '@/components/NativeLoadingScreen';

const NativeWelcome = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  const handleStart = () => {
    addHapticFeedback('medium');
    navigate('/auth?mode=signup');
  };

  const handleLogIn = () => {
    addHapticFeedback('light');
    navigate('/auth?mode=login');
  };

  const handleDashboard = () => {
    addHapticFeedback('medium');
    navigate('/dashboard');
  };

  if (loading) return <NativeLoadingScreen />;

  const benefits = [
    { icon: BookOpen, label: 'Unlimited interactive adventures' },
    { icon: Volume2, label: 'Pro Read-to-Me narration' },
    { icon: Gauge, label: 'Adapts to your reader (200L–1200L)' },
    { icon: ShieldCheck, label: 'Kid-safe · parent dashboard' },
  ];

  return (
    <div className="min-h-[100dvh] flex flex-col bg-gradient-to-b from-[hsl(250,50%,12%)] via-[hsl(265,55%,15%)] to-[hsl(230,50%,8%)] overflow-hidden relative">
      {/* Ambient glow circles */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[500px] h-[500px] rounded-full bg-[hsl(265,85%,60%)] opacity-[0.08] blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-0 w-[300px] h-[300px] rounded-full bg-[hsl(195,85%,55%)] opacity-[0.06] blur-[100px] pointer-events-none" />

      {/* Top spacer for safe area */}
      <div
        className="flex-shrink-0"
        style={{ height: 'max(env(safe-area-inset-top, 16px), 16px)' }}
      />

      {/* Hero content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-6 z-10 overflow-y-auto">
        <motion.div
          className="flex flex-col items-center text-center gap-5 w-full max-w-[360px]"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        >
          {/* Icon */}
          <motion.div
            className="relative w-20 h-20"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1, duration: 0.5, ease: 'easeOut' }}
          >
            <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-[hsl(265,85%,60%)] to-[hsl(195,85%,55%)] opacity-20 blur-xl" />
            <div className="relative w-full h-full rounded-3xl bg-gradient-to-br from-[hsl(265,85%,55%)] to-[hsl(195,85%,50%)] flex items-center justify-center shadow-2xl">
              <BookOpen className="w-10 h-10 text-white" strokeWidth={1.5} />
            </div>
            <motion.div
              className="absolute -top-1.5 -right-1.5"
              animate={{ rotate: [0, 15, -15, 0], scale: [1, 1.2, 1] }}
              transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
            >
              <Sparkles className="w-6 h-6 text-[hsl(45,90%,65%)]" />
            </motion.div>
          </motion.div>

          {/* Badge */}
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/[0.08] border border-white/[0.12] text-white/70 text-[11px] font-bold tracking-wider uppercase">
            <Sparkles className="w-3 h-3" />
            Adventure Pass
          </span>

          <div className="space-y-2">
            <h1 className="text-[28px] leading-[1.1] font-heading font-extrabold text-white tracking-tight">
              Unlock unlimited story adventures
            </h1>
            <p className="text-white/55 text-sm leading-relaxed">
              Everything your reader needs to fall in love with reading.
            </p>
          </div>

          {/* Benefits list */}
          <motion.ul
            className="w-full space-y-2.5 mt-1"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.5 }}
          >
            {benefits.map((b, i) => (
              <motion.li
                key={i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.35 + i * 0.07 }}
                className="flex items-center gap-3 px-4 py-2.5 rounded-2xl bg-white/[0.05] border border-white/[0.08] backdrop-blur-sm"
              >
                <div className="w-7 h-7 rounded-full bg-[hsl(145,70%,45%)]/15 border border-[hsl(145,70%,45%)]/30 flex items-center justify-center flex-shrink-0">
                  <Check className="w-3.5 h-3.5 text-[hsl(145,70%,55%)]" strokeWidth={3} />
                </div>
                <span className="text-white/85 text-sm font-medium text-left">{b.label}</span>
              </motion.li>
            ))}
          </motion.ul>

          {/* Price */}
          <motion.div
            className="flex items-baseline gap-1.5 pt-1"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7 }}
          >
            <span className="text-4xl font-extrabold text-white">$4.99</span>
            <span className="text-white/50 text-sm font-medium">/ month</span>
          </motion.div>
          <p className="text-white/40 text-xs -mt-3">Cancel anytime</p>
        </motion.div>
      </div>

      {/* Bottom CTA */}
      <motion.div
        className="w-full px-6 z-10"
        style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 20px), 20px)' }}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.5 }}
      >
        {user ? (
          <button
            onClick={handleDashboard}
            className="w-full py-4 rounded-2xl bg-gradient-to-r from-[hsl(265,85%,60%)] to-[hsl(195,85%,55%)] text-white font-bold text-lg shadow-[0_8px_32px_-8px_hsl(265,85%,60%,0.5)] active:scale-[0.97] transition-transform duration-100"
          >
            Access Dashboard
          </button>
        ) : (
          <>
            <button
              onClick={handleStart}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-[hsl(265,85%,60%)] to-[hsl(195,85%,55%)] text-white font-bold text-lg shadow-[0_8px_32px_-8px_hsl(265,85%,60%,0.5)] active:scale-[0.97] transition-transform duration-100"
            >
              Start Your Adventure
            </button>
            <button
              onClick={handleLogIn}
              className="w-full py-3 mt-2 text-white/70 font-semibold text-sm active:scale-[0.97] transition-transform duration-100"
            >
              I already have an account
            </button>
          </>
        )}
      </motion.div>
    </div>
  );
};

export default NativeWelcome;
