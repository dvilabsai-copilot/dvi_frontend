import { afterEach, describe, expect, it, vi } from "vitest";
import { isBrowserReloadNavigation } from "@/pages/itinerary-details/itinerary-details-route-state";

describe("itinerary details navigation state", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("detects a hard browser reload", () => {
    vi.stubGlobal("performance", {
      getEntriesByType: () => [{ type: "reload" }],
    });

    expect(isBrowserReloadNavigation()).toBe(true);
  });

  it("does not treat normal navigation as a reload", () => {
    vi.stubGlobal("performance", {
      getEntriesByType: () => [{ type: "navigate" }],
    });

    expect(isBrowserReloadNavigation()).toBe(false);
  });
});
