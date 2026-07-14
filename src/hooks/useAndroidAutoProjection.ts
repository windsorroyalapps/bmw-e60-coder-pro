import { useEffect } from 'react';
import { useStore } from '@/hooks/useStore';
import { Capacitor } from '@capacitor/core';

/**
 * Hook to enable Android Auto projection of the web UI
 * Handles fullscreen mode and viewport detection for headunit display
 */
export const useAndroidAutoProjection = () => {
  useEffect(() => {
    const initProjection = async () => {
      // Check if running on Android
      if (Capacitor.getPlatform() !== 'android') {
        return;
      }

      // Set fullscreen mode for headunit display
      document.documentElement.style.position = 'fixed';
      document.documentElement.style.top = '0';
      document.documentElement.style.left = '0';
      document.documentElement.style.width = '100%';
      document.documentElement.style.height = '100%';
      document.documentElement.style.margin = '0';
      document.documentElement.style.padding = '0';
      document.documentElement.style.overflow = 'hidden';

      // Hide status bar and navigation bar for immersive mode
      if (window.navigator && (window.navigator as any).presentation) {
        try {
          const request = new (window as any).PresentationRequest(['text/html']);
          (request as any).start().then(() => {
            console.log('Android Auto projection started');
          });
        } catch (e) {
          console.log('Presentation API not available');
        }
      }
    };

    // Listen for visibility changes — pause OBD2 polling when app is backgrounded
    const handleVisibilityChange = () => {
      useStore.getState().setObd2ConnectionPaused(document.hidden);
    };

    initProjection();
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);
};
