/**
 * DVI Create Itinerary journey animation controller.
 * UI-only. The real save API remains the source of truth.
 * The App-level overlay persists when React Router switches to itinerary details.
 */
export type DviJourneyMode = "Cabs" | "Hotels" | "Tours & Attractions";
export type DviJourneyPhase = "saving" | "loading-details" | "arrived";
export type DviJourneySnapshot = {
  id: number;
  from: string;
  to: string;
  mode: DviJourneyMode;
  phase: DviJourneyPhase;
  quoteId: string | null;
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
  journey = { id, from, to, mode, phase: "saving", quoteId: null };
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
