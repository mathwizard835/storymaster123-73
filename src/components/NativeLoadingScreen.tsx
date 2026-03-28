import { Loader2 } from 'lucide-react';

export function NativeLoadingScreen() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-900 via-blue-900 to-indigo-900 flex flex-col items-center justify-center gap-6">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-heading font-extrabold text-white tracking-tight">
          StoryMaster Kids
        </h1>
        <p className="text-white/60 text-sm">Your adventure awaits...</p>
      </div>
      <Loader2 className="h-8 w-8 text-white/80 animate-spin" />
    </div>
  );
}
