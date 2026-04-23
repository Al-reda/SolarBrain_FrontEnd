/**
 * useSimPolling.ts — polls GET /api/Simulation/next on an interval and
 * dispatches SIM_TICK for each frame. Automatically stops when the
 * component unmounts or `running` / `paused` flip.
 *
 * The backend advances by its own speed multiplier, so the frontend
 * polls at a steady 1 Hz — simpler, and it means 10× speed produces
 * 10 intervals per second without the frontend having to manage it.
 */

import { useEffect, useRef } from 'react';
import { useApp } from '../store/useApp';
import { getNextStep } from '../api/client';

const POLL_INTERVAL_MS = 1000;

export function useSimPolling() {
  const { state, dispatch } = useApp();
  const { simRunning, simPaused, simManual } = state;

  // Latch the "in-flight" state so we never stack requests
  const inflight = useRef(false);

  useEffect(() => {
    // Don't auto-poll in manual mode or when paused/stopped
    if (!simRunning || simPaused || simManual) return;

    let cancelled = false;

    async function tick() {
      if (cancelled || inflight.current) return;
      inflight.current = true;
      try {
        const resp = await getNextStep();
        if (cancelled) return;
        if (resp.status === 'ok' && resp.state) {
          dispatch({ type: 'SIM_TICK', state: resp.state });
        } else if (resp.status === 'complete') {
          dispatch({ type: 'SIM_SET_RUNNING', running: false });
        }
      } catch {
        // Swallow — keep polling. If the API is down the running flag
        // stays on and the next tick will try again.
      } finally {
        inflight.current = false;
      }
    }

    // Fire immediately, then on interval
    void tick();
    const id = window.setInterval(tick, POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [simRunning, simPaused, simManual, dispatch]);
}
