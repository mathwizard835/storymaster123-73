import { Share } from '@capacitor/share';
import { Capacitor } from '@capacitor/core';

export const useShare = () => {
  const shareStory = async (title: string, text: string, url?: string) => {
    try {
      if (Capacitor.isNativePlatform()) {
        await Share.share({
          title,
          text,
          url,
        });
      } else {
        // Fallback for web
        if (navigator.share) {
          await navigator.share({
            title,
            text,
            url,
          });
        } else {
          // Copy to clipboard fallback
          await navigator.clipboard.writeText(`${title}\n\n${text}\n\n${url}`);
          console.log('Story copied to clipboard!');
        }
      }
    } catch (error) {
      console.error('Error sharing story:', error);
    }
  };

  return { shareStory };
};