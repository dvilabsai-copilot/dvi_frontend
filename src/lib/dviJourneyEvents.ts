/**
 * DVI Create Itinerary journey animation controller.
 * UI-only. The real save API remains the source of truth.
 * The App-level overlay persists when React Router switches to itinerary details.
 */
export type DviJourneyMode = "Cabs" | "Hotels" | "Tours & Attractions";
// Actual day-wise itinerary route rows, not estimated geography.
export type DviJourneyLeg = { day: number; from: string; to: string; via: string[] };

const cleanPlace = (value: unknown): string =>
  (typeof value === "string" || typeof value === "number" ? String(value) : "")
    .replace(/\s+/g, " ").trim().slice(0, 110);

export function resolveDviJourneyLegs(routes: unknown): DviJourneyLeg[] {
  if (!Array.isArray(routes)) return [];
  const legs: DviJourneyLeg[] = [];
  for (const candidate of routes.slice(0, 48)) {
    if (!candidate || typeof candidate !== "object") continue;
    const row = candidate as Record<string, unknown>;
    const from = cleanPlace(row.source ?? row.location_name ?? row.from);
    const to = cleanPlace(row.next ?? row.next_visiting_location ?? row.to);
    if (!from || !to) continue;
    const via: string[] = [];
    const addVia = (value: unknown) => {
      const name = cleanPlace(value);
      if (name && !/^\d+$/.test(name) &&
          name.toLowerCase() !== from.toLowerCase() &&
          name.toLowerCase() !== to.toLowerCase() &&
          !via.some(existing => existing.toLowerCase() === name.toLowerCase())) via.push(name);
    };
    if (Array.isArray(row.via_routes)) {
      for (const point of row.via_routes.slice(0, 8)) {
        if (point && typeof point === "object") {
          const item = point as Record<string, unknown>;
          addVia(item.name ?? item.location_name ?? item.locationName ?? item.label);
        } else addVia(point);
      }
    }
    if (via.length === 0 && typeof (row.via ?? row.via_route) === "string") {
      for (const location of String(row.via ?? row.via_route).split(/[,;|]|\s*(?:→|->)\s*/).slice(0, 8)) addVia(location);
    }
    legs.push({ day: legs.length + 1, from, to, via });
  }
  return legs;
}
export type DviJourneyPhase = "saving" | "loading-details" | "arrived";
export type DviJourneySnapshot = {
  id: number;
  from: string;
  to: string;
  mode: DviJourneyMode;
  phase: DviJourneyPhase;
  quoteId: string | null;
  legs: DviJourneyLeg[];
};

type Subscriber = () => void;
let sequence = 0;
let journey: DviJourneySnapshot | null = null;
const listeners = new Set<Subscriber>();
const broadcast = () => listeners.forEach((listener) => listener());

export function subscribeDviJourney(listener: Subscriber): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getDviJourneySnapshot(): DviJourneySnapshot | null {
  return journey;
}

export function startDviJourney(input: {
  from: unknown;
  to: unknown;
  preference: unknown;
  routes?: unknown;
}): number {
  const preference = String(input.preference || "vehicle");
  const mode: DviJourneyMode = preference === "hotel"
    ? "Hotels"
    : preference === "both"
      ? "Tours & Attractions"
      : "Cabs";
  const from = String(input.from ?? "").trim().slice(0, 110) || "Arrival Place";
  const to = String(input.to ?? "").trim().slice(0, 110) || "Departure Place";
  const id = ++sequence;
  journey = { id, from, to, mode, phase: "saving", quoteId: null, legs: resolveDviJourneyLegs(input.routes) };
  broadcast();
  return id;
}

/** API persisted a quote, but the details page may still be fetching. */
export function awaitDviJourneyDetails(quoteId: string): void {
  if (!journey) return;
  const quote = String(quoteId || "").trim();
  if (!quote) return;
  journey = { ...journey, quoteId: quote, phase: "loading-details" };
  broadcast();
}

/** Called when the REAL itinerary-details controller has finished loading. */
export function completeDviJourneyForDetails(quoteId: string): void {
  if (!journey || journey.phase !== "loading-details") return;
  if (String(quoteId || "").trim() !== journey.quoteId) return;
  journey = { ...journey, phase: "arrived" };
  broadcast();
}

/** Used only after an actual persisted save that redirects somewhere else. */
export function completeDviJourneyWithoutDetails(): void {
  if (!journey) return;
  journey = { ...journey, phase: "arrived" };
  broadcast();
}

/** Never display arrival following an API failure. */
export function cancelDviJourney(): void {
  if (!journey) return;
  journey = null;
  broadcast();
}

/** Clear an already-arrived overlay after its final visual transition. */
export function dismissArrivedDviJourney(id: number): void {
  if (journey?.id !== id || journey.phase !== "arrived") return;
  journey = null;
  broadcast();
}

export function failDviJourneyDetails(quoteId: string): void {
  if (journey?.phase === "loading-details" && journey.quoteId === String(quoteId || "").trim()) {
    cancelDviJourney();
  }
}
