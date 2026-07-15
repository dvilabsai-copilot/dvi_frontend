import { useCallback, useEffect, type Dispatch, type MutableRefObject, type SetStateAction } from "react";
import type { FitHereModalState } from "./useHotspotState";

type FitHereProgressTimerOptions = {
  timerRef: MutableRefObject<number | null>;
  setFitHereModal: Dispatch<SetStateAction<FitHereModalState>>;
};

export function useFitHereProgressTimer({ timerRef, setFitHereModal }: FitHereProgressTimerOptions) {
  const stopFitHereProgressTimer = useCallback(() => {
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, [timerRef]);

  const startFitHereProgressTimer = useCallback(() => {
    stopFitHereProgressTimer();
    timerRef.current = window.setInterval(() => {
      setFitHereModal((previous) => {
        if (!previous.open || !previous.loading) return previous;
        return {
          ...previous,
          loadingStepIndex: Math.min(previous.loadingStepIndex + 1, 10),
        };
      });
    }, 700);
  }, [setFitHereModal, stopFitHereProgressTimer, timerRef]);

  useEffect(() => stopFitHereProgressTimer, [stopFitHereProgressTimer]);

  return { startFitHereProgressTimer, stopFitHereProgressTimer };
}

