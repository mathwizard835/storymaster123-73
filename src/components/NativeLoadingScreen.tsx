import { motion } from 'framer-motion';

export function NativeLoadingScreen() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[hsl(250,50%,12%)] via-[hsl(230,50%,10%)] to-[hsl(260,50%,8%)] flex flex-col items-center justify-center gap-8">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="text-center space-y-3"
      >
        <h1 className="text-4xl font-heading font-extrabold text-white tracking-tight">
          StoryMaster Kids
        </h1>
        <p className="text-white/40 text-sm font-medium">Your adventure awaits...</p>
      </motion.div>
      
      {/* iOS-style activity indicator */}
      <div className="relative w-8 h-8">
        {[...Array(8)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute top-0 left-1/2 -translate-x-1/2 w-[3px] h-[9px] rounded-full bg-white/60"
            style={{
              transformOrigin: '50% 16px',
              transform: `translateX(-50%) rotate(${i * 45}deg)`,
            }}
            animate={{ opacity: [0.2, 0.8, 0.2] }}
            transition={{
              duration: 0.8,
              repeat: Infinity,
              delay: i * 0.1,
              ease: 'easeInOut',
            }}
          />
        ))}
      </div>
    </div>
  );
}
