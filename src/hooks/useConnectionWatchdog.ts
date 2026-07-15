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
  } = useStore();

  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const attemptReconnect = useCallback(async () => {
    if (autoReconnectAttempts >= maxAutoReconnectAttempts) {
      addNotification({
        message: `Auto-reconnect failed after ${maxAutoReconnectAttempts} attempts`,
        type: 'error',
      });
      setConnectionDead(true);
      return;
    }

    setAutoReconnectAttempts(autoReconnectAttempts + 1);
    addNotification({
      message: `Reconnecting... (${autoReconnectAttempts + 1}/${maxAutoReconnectAttempts})`,
      type: 'info',
    });

    try {
      const success = await obd2Manager.connect();
      if (success) {
        setConnectionDead(false);
        setAutoReconnectAttempts(0);
        setObd2(obd2Manager.getState());
        addNotification({ message: 'Connection restored', type: 'success' });
      } else {
        reconnectTimerRef.current = setTimeout(attemptReconnect, 2000);
      }
    } catch {
      reconnectTimerRef.current = setTimeout(attemptReconnect, 2000);
    }
  }, [autoReconnectAttempts, maxAutoReconnectAttempts]);

  useEffect(() => {
    if (!watchdogEnabled) return;

    const handleDead = () => {
      if (connectionDead) return;
      setConnectionDead(true);
      addNotification({ message: 'Connection lost - starting recovery', type: 'warning' });
      attemptReconnect();
    };

    obd2Manager.enableWatchdog(500, handleDead);

    return () => {
      obd2Manager.disableWatchdog();
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
      }
    };
  }, [watchdogEnabled, connectionDead, attemptReconnect]);

  useEffect(() => {
    if (!watchdogEnabled || connectionDead || obd2ConnectionPaused) return;

    const interval = setInterval(() => {
      obd2Manager.heartbeat();
    }, 100);

    return () => clearInterval(interval);
  }, [watchdogEnabled, connectionDead, obd2ConnectionPaused]);
}

export default useConnectionWatchdog;
