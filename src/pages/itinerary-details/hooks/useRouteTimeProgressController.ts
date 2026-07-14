import { useCallback, type Dispatch, type MutableRefObject, type SetStateAction } from "react";
import { getEstimatedSaveMs } from "../../CreateItinerary/helpers/saveProgress.constants";

interface RouteTimeProgressControllerOptions {
  dayCount: number;
  timerRef: MutableRefObject<number | null>;
  setProgressPercent: Dispatch<SetStateAction<number>>;
  setProgressDetail: Dispatch<SetStateAction<string>>;
  setProgressHistory: Dispatch<SetStateAction<string[]>>;
}

/** Owns the timer and progress-history mechanics for route-time updates. */
export const useRouteTimeProgressController = ({
  dayCount,
  timerRef,
  setProgressPercent,
  setProgressDetail,
  setProgressHistory,
}: RouteTimeProgressControllerOptions) => {
  const stopRouteTimeProgress = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, [timerRef]);

  const pushRouteProgressStage = useCallback((stage: string, detail?: string) => {
    setProgressDetail(detail || stage);
    setProgressHistory((prev) => (
      prev[prev.length - 1] === stage ? prev : [...prev, stage].slice(-6)
    ));
  }, [setProgressDetail, setProgressHistory]);

  const startRouteTimeProgress = useCallback((estimatedMs: number) => {
    stopRouteTimeProgress();
    setProgressPercent(1);

    const startedAt = Date.now();
    timerRef.current = window.setInterval(() => {
      const elapsed = Date.now() - startedAt;
      const pct = Math.floor((elapsed / Math.max(estimatedMs, 1000)) * 100);
      setProgressPercent(Math.min(95, Math.max(1, pct)));
    }, 220);
  }, [setProgressPercent, stopRouteTimeProgress, timerRef]);

  const getRouteTimeUpdateEstimateMs = useCallback((dayNumber: number) => {
    const count = Math.max(1, dayCount || dayNumber || 1);
    const createEstimateMs = getEstimatedSaveMs(count, "itineary_basic_info_with_optimized_route");
    return Math.max(15000, createEstimateMs * 2);
  }, [dayCount]);

  return {
    stopRouteTimeProgress,
    pushRouteProgressStage,
    startRouteTimeProgress,
    getRouteTimeUpdateEstimateMs,
  };
};

