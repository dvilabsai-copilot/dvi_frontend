import { afterEach, expect, it, vi } from "vitest";

afterEach(() => vi.unstubAllEnvs());

it("skips the 07:00 preference on an intercity transfer and keeps it for a same-city arrival", async () => {
  vi.stubEnv("VITE_TRANSPORT_EARLY_ARRIVAL_CUTOFF", "08:00");
  const { requiresTransportEarlyArrivalPreference } = await import("../pages/CreateItinerary/helpers/transportEarlyArrival");

  expect(requiresTransportEarlyArrivalPreference("vehicle", "07:00", "Madurai Airport", "Rameswaram")).toBe(false);
  expect(requiresTransportEarlyArrivalPreference("vehicle", "07:00", "Madurai Airport", "Madurai")).toBe(true);
  expect(requiresTransportEarlyArrivalPreference("both", "07:00", "Madurai Airport", "Madurai")).toBe(false);
  expect(requiresTransportEarlyArrivalPreference("vehicle", "08:00", "Madurai Airport", "Madurai")).toBe(false);
});
