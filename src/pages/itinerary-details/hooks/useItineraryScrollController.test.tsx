import { renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useItineraryScrollController } from "./useItineraryScrollController";

describe("useItineraryScrollController summary measurement", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("measures the sticky summary after itinerary data mounts it and includes its configured top offset", () => {
    const summaryStickyRef = { current: null as HTMLDivElement | null };
    const setSummaryStickyHeight = vi.fn();
    const observe = vi.fn();
    const disconnect = vi.fn();
    class MockResizeObserver {
      observe = observe;
      disconnect = disconnect;
      constructor(_callback: ResizeObserverCallback) {}
    }
    vi.stubGlobal("ResizeObserver", MockResizeObserver);

    const { rerender } = renderHook(
      ({ days }: { days: unknown[] | null }) =>
        useItineraryScrollController({
          quoteId: "DVI202610180",
          days,
          summaryStickyRef,
          hotelListRef: { current: null },
          vehicleListRef: { current: null },
          summaryStickyHeight: 0,
          setSummaryStickyHeight,
          itineraryDaysCountRef: { current: 0 },
        }),
      { initialProps: { days: null } },
    );

    expect(setSummaryStickyHeight).not.toHaveBeenCalled();

    const summaryElement = document.createElement("div");
    summaryElement.style.position = "sticky";
    summaryElement.style.top = "76px";
    vi.spyOn(summaryElement, "getBoundingClientRect").mockReturnValue({ height: 208 } as DOMRect);
    summaryStickyRef.current = summaryElement;
    rerender({ days: [{ dayNumber: 1 }] });

    expect(setSummaryStickyHeight).toHaveBeenLastCalledWith(284);
    expect(observe).toHaveBeenCalledWith(summaryElement);
  });
});
