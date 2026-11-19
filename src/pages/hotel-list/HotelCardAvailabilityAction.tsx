import { useEffect, useRef, useState } from 'react';
import type { HotelIntentPreviewResponse } from '@/services/itinerary';

export type HotelCardAvailabilityRequest = {
  key: string;
  planId: number;
  run: (signal: AbortSignal) => Promise<HotelIntentPreviewResponse>;
};

const CHECK_LIFETIME_MS = 30_000;
const checksByPlan = new Map<number, Promise<unknown>>();

function checkHotel(request: HotelCardAvailabilityRequest, signal: AbortSignal) {
  // The server serializes hotel selection for a plan. Keep supplier checks
  // for different cards in the same plan from piling up at that lock.
  const previous = checksByPlan.get(request.planId) || Promise.resolve();
  const check = previous.catch(() => undefined).then(() => {
    signal.throwIfAborted();
    return request.run(signal);
  });
  checksByPlan.set(request.planId, check);
  const release = () => {
    if (checksByPlan.get(request.planId) === check) checksByPlan.delete(request.planId);
  };
  void check.then(release, release);
  return check;
}

type Props = {
  request: HotelCardAvailabilityRequest;
  className: string;
  disabled: boolean;
  choosing: boolean;
  onChoose: (onUnavailable: (preview: HotelIntentPreviewResponse) => void) => void;
};

export function HotelCardAvailabilityAction({ request, className, disabled, choosing, onChoose }: Props) {
  const [result, setResult] = useState<HotelIntentPreviewResponse | null>(null);
  const [checking, setChecking] = useState(false);
  const checkRef = useRef<AbortController | null>(null);
  const dwellRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const mountedRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      clearTimeout(dwellRef.current);
      checkRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    if (!result) return;
    const timer = setTimeout(() => setResult(null), CHECK_LIFETIME_MS);
    return () => clearTimeout(timer);
  }, [result]);

  const runCheck = () => {
    clearTimeout(dwellRef.current);
    if (disabled || checkRef.current) return;
    const controller = new AbortController();
    checkRef.current = controller;
    setChecking(true);
    void checkHotel(request, controller.signal).then((preview) => {
      if (!controller.signal.aborted) setResult(preview);
    }).catch(() => {
      if (!controller.signal.aborted) setResult({
        status: 'REFRESH_FAILED',
        message: 'Hotel availability could not be verified. Try again.',
      });
    }).finally(() => {
      if (checkRef.current === controller) checkRef.current = null;
      if (!controller.signal.aborted) setChecking(false);
    });
  };

  const scheduleCheck = () => {
    if (disabled || result || checkRef.current) return;
    clearTimeout(dwellRef.current);
    dwellRef.current = setTimeout(runCheck, 220);
  };

  const available = result?.status === 'AVAILABLE';
  const singleNight = result?.status === 'NO_AVAILABILITY' && result.canBookSingleNight === true;
  const unavailable = result?.status === 'NO_AVAILABILITY' && !singleNight;
  const failed = result?.status === 'REFRESH_FAILED';

  return (
    <>
      <button
        type="button"
        className={`${className} disabled:bg-slate-200 disabled:text-slate-500`}
        disabled={disabled || checking || unavailable}
        onPointerEnter={scheduleCheck}
        onPointerLeave={() => clearTimeout(dwellRef.current)}
        onFocus={scheduleCheck}
        onBlur={() => clearTimeout(dwellRef.current)}
        onClick={() => available || singleNight
          ? onChoose((preview) => { if (mountedRef.current) setResult(preview); })
          : runCheck()}
      >
        {choosing ? 'Updating...' : checking ? 'Checking availability…' : unavailable ? 'Not Available'
          : available ? 'Choose' : singleNight ? 'Review single-night option' : failed ? 'Retry availability' : 'Check availability'}
      </button>
      {(failed || unavailable) && (
        <p className="mt-2 text-xs text-red-700" role="status">
          {result?.message || (unavailable ? 'No matching rate for this stay.' : 'Hotel availability could not be verified.')}
        </p>
      )}
      {unavailable && <button type="button" className="mt-1 text-xs text-[#6b32c6] underline" disabled={disabled || checking} onClick={runCheck}>Check again</button>}
    </>
  );
}
