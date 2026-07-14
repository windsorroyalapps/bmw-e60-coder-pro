// BMW E60 Coder Pro - Connection Watchdog + Auto-Recovery
// Detects USB disconnect within 500ms and triggers auto-reconnect.
// Aborts any active flash session immediately on connection loss.

import { useEffect, useRef, useCallback } from 'react';
import { useStore } from '@/hooks/useStore';
import { obd2Manager } from '@/lib/obd2Connection';

/**
 * Hook that monitors the OBD2 connection health and auto-recovers from disconnects.
 *
 * Features:
 * - 500ms heartbeat timeout detection via OBD2ConnectionManager watchdog
 * - Auto-reconnect with exponential backoff (max 5 attempts)
 * - Immediate flash abort on connection loss (safety critical)
 * - Visual notifications for connection events
 */
export const useConnectionWatchdog = () => {
  const {
    obd2, setObd2, setObd2Cable, watchdogEnabled,
    setConnectionDead, setLastHeartbeat, autoReconnectAttempts,
    maxAutoReconnectAttempts, incrementAutoReconnectAttempts,
    resetAutoReconnectAttempts, addNotification,
  } = useStore();

  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isReconnectingRef = useRef(false);

  /**
   * Perform auto-reconnect with exponential backoff.
   * Delays: 500ms, 1000ms, 2000ms, 4000ms, 8000ms
   */
  const attemptReconnect = useCallback(async () => {
    if (isReconnectingRef.current) return;
    if (autoReconnectAttempts >= maxAutoReconnectAttempts) {
      addNotification({
        message: `Auto-reconnect failed after ${maxAutoReconnectAttempts} attempts. Please reconnect manually.`,
        type: 'error',
      });
      resetAutoReconnectAttempts();
      return;
    }

    isReconnectingRef.current = true;
    incrementAutoReconnectAttempts();

    const attemptNum = autoReconnectAttempts + 1;
    const delayMs = Math.min(500 * Math.pow(2, attemptNum - 1), 8000);

    addNotification({
      message: `Connection lost. Auto-reconnect attempt ${attemptNum}/${maxAutoReconnectAttempts} in ${delayMs}ms...`,
      type: 'warning',
    });

    // Exponential backoff delay
    await new Promise(r => setTimeout(r, delayMs));

    const recovered = await obd2Manager.attemptRecovery();

    if (recovered) {
      setConnectionDead(false);
      setLastHeartbeat(Date.now());
      resetAutoReconnectAttempts();
      const state = obd2Manager.getState();
      setObd2(state);
      if (state.cable) setObd2Cable(state.cable);
      addNotification({
        message: 'Connection recovered successfully!',
        type: 'success',
      });
      // Re-enable watchdog after recovery
      obd2Manager.enableWatchdog(() => {
        setConnectionDead(true);
        setLastHeartbeat(obd2Manager.getLastHeartbeat());
        attemptReconnect();
      });
    } else {
      addNotification({
        message: `Reconnect attempt ${attemptNum} failed.`,
        type: 'warning',
      });
      // Schedule next attempt
      if (attemptNum < maxAutoReconnectAttempts) {
        reconnectTimerRef.current = setTimeout(() => {
          isReconnectingRef.current = false;
          attemptReconnect();
        }, 100);
      } else {
        addNotification({
          message: 'All auto-reconnect attempts exhausted. Please check cable and reconnect manually.',
          type: 'error',
        });
        resetAutoReconnectAttempts();
      }
    }

    isReconnectingRef.current = false;
  }, [autoReconnectAttempts, maxAutoReconnectAttempts, incrementAutoReconnectAttempts,
      resetAutoReconnectAttempts, setConnectionDead, setLastHeartbeat, setObd2,
      setObd2Cable, addNotification]);

  // Enable/disable watchdog based on connection state and setting
  useEffect(() => {
    if (obd2.connectionState === 'connected' && watchdogEnabled) {
      obd2Manager.enableWatchdog(() => {
        setConnectionDead(true);
        setLastHeartbeat(obd2Manager.getLastHeartbeat());
        attemptReconnect();
      });
      setLastHeartbeat(Date.now());
      setConnectionDead(false);
      resetAutoReconnectAttempts();
    } else if (obd2.connectionState === 'disconnected') {
      obd2Manager.disableWatchdog();
      setConnectionDead(false);
      resetAutoReconnectAttempts();
      isReconnectingRef.current = false;
    }

    return () => {
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
      }
    };
  }, [obd2.connectionState, watchdogEnabled, setConnectionDead, setLastHeartbeat,
      resetAutoReconnectAttempts, attemptReconnect]);

  return {
    isWatchdogEnabled: obd2Manager.isWatchdogEnabled(),
    isConnectionAlive: obd2Manager.isConnectionAlive(),
  };
};
