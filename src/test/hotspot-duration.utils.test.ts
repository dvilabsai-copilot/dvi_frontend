import { describe, expect, it } from "vitest";
import {
  formatHotspotDuration,
  getHotspotDurationMinutes,
  isFullDayHotspot,
} from "../pages/itinerary-details/utils/hotspotDuration.utils";
import type { AvailableHotspot } from "../pages/itinerary-details/itinerary-details.types";

describe("hotspot visit duration", () => {
  it("uses exact minutes when the API provides them", () => {
    const hotspot: Partial<AvailableHotspot> = { durationMinutes: 510, timeSpend: 8 };
    expect(getHotspotDurationMinutes(hotspot)).toBe(510);
    expect(formatHotspotDuration(510)).toBe("8 hrs 30 min");
  });

  it("keeps compatibility with the legacy whole-hours field", () => {
    const hotspot: Partial<AvailableHotspot> = { timeSpend: 8 };
    expect(getHotspotDurationMinutes(hotspot)).toBe(480);
  });

  it("marks visits of eight hours or longer as full-day", () => {
    expect(isFullDayHotspot(479)).toBe(false);
    expect(isFullDayHotspot(480)).toBe(true);
    expect(isFullDayHotspot(600)).toBe(true);
  });
});
