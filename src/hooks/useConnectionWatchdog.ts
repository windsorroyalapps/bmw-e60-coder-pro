import { useEffect, useRef, useCallback } from 'react';
import { useStore } from './useStore';
import { obd2Manager } from '@/lib/obd2Connection';

export function useConnectionWatchdog() {
  const {
    watchdogEnabled,
    connectionDead,
    obd2ConnectionPaused,
    setConnectionDead,
    setAutoReconnectAttempts,
    setObd2,
    autoReconnectAttempts,
    maxAutoReconnectAttempts,
    addNotification,
    selectedAdapterId,
  } = useStore();

  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isReconnecting = useRef(false);

  const getAdapterType = useCallback((): 'AUTO' | 'KDCAN' | 'ELM327' => {
    if (!selectedAdapterId) return 'AUTO';
    if (selectedAdapterId.includes('elm327')) return 'ELM327';
    if (selectedAdapterId.includes('kdcan') || selectedAdapterId.includes('ftdi')) return 'KDCAN';
    return 'AUTO';
  }, [selectedAdapterId]);

  const attemptReconnect = useCallback(async () => {
    if (isReconnecting.current) return;
    if (autoReconnectAttempts >= maxAutoReconnectAttempts) {
      addNotification({
        message: `Auto-reconnect failed after ${maxAutoReconnectAttempts} attempts`,
        type: 'error',
      });
      setConnectionDead(true);
      isReconnecting.current = false;
      return;
    }

    isReconnecting.current = true;
    setAutoReconnectAttempts(autoReconnectAttempts + 1);
    addNotification({
      message: `Reconnecting... (${autoReconnectAttempts + 1}/${maxAutoReconnectAttempts})`,
      type: 'info',
    });

    try {
      const adapterType = getAdapterType();
      const success = await obd2Manager.connect(adapterType);
      if (success) {
        setConnectionDead(false);
        setAutoReconnectAttempts(0);
        setObd2(obd2Manager.getState());
        addNotification({ message: 'Connection restored', type: 'success' });
      } else {
        reconnectTimerRef.current = setTimeout(() => {
          isReconnecting.current = false;
          attemptReconnect();
        }, 3000);
      }
    } catch {
      reconnectTimerRef.current = setTimeout(() => {
        isReconnecting.current = false;
        attemptReconnect();
      }, 3000);
    }
  }, [autoReconnectAttempts, maxAutoReconnectAttempts, getAdapterType, setAutoReconnectAttempts, setConnectionDead, setObd2, addNotification]);

  useEffect(() => {
    if (!watchdogEnabled) return;

    const handleDead = () => {
      if (connectionDead || isReconnecting.current) return;
      setConnectionDead(true);
      addNotification({ message: 'Connection lost - starting recovery', type: 'warning' });
      attemptReconnect();
    };

    obd2Manager.enableWatchdog(2000, handleDead);

    return () => {
      obd2Manager.disableWatchdog();
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
      }
    };
  }, [watchdogEnabled, connectionDead, attemptReconnect, setConnectionDead, addNotification]);

  useEffect(() => {
    if (!watchdogEnabled || connectionDead || obd2ConnectionPaused) return;

    const interval = setInterval(() => {
      obd2Manager.heartbeat();
    }, 500);

    return () => clearInterval(interval);
  }, [watchdogEnabled, connectionDead, obd2ConnectionPaused]);
}

export default useConnectionWatchdog;
