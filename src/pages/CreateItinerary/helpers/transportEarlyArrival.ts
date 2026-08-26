export type TransportEarlyArrivalOption =
  | "HOTEL_REST"
  | "REFRESHMENT_BEFORE_SIGHTSEEING";

export const TRANSPORT_EARLY_ARRIVAL_HOTEL_MESSAGE =
  "Guest has opted to proceed to the hotel first for rest and refreshment before commencing sightseeing.";

const DEFAULT_CUTOFF_MINUTES = 8 * 60;

export const TRANSPORT_EARLIEST_SIGHTSEEING_TIME =
  String(import.meta.env.VITE_TRANSPORT_EARLIEST_SIGHTSEEING_TIME || "09:00");
export const TRANSPORT_EARLY_ARRIVAL_CUTOFF = String(
  import.meta.env.VITE_TRANSPORT_EARLY_ARRIVAL_CUTOFF || "08:00",
);
export const TRANSPORT_DEFAULT_REFRESHMENT_MINUTES = Number(
  import.meta.env.VITE_TRANSPORT_DEFAULT_REFRESHMENT_MINUTES || 60,
);
export const TRANSPORT_DEFAULT_HOTEL_REST_MINUTES = Number(
  import.meta.env.VITE_TRANSPORT_DEFAULT_HOTEL_REST_MINUTES || 180,
);

export const timeToMinutes = (value: string): number | null => {
  const match = /^(\d{1,2}):(\d{2})/.exec(String(value || "").trim());
  if (!match) return null;

  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (
    !Number.isInteger(hours) ||
    !Number.isInteger(minutes) ||
    hours < 0 ||
    hours > 23 ||
    minutes < 0 ||
    minutes > 59
  ) {
    return null;
  }

  return hours * 60 + minutes;
};

export const transportEarlyArrivalCutoffMinutes = (): number => {
  const configured = timeToMinutes(
    TRANSPORT_EARLY_ARRIVAL_CUTOFF,
  );
  return configured ?? DEFAULT_CUTOFF_MINUTES;
};

export const requiresTransportEarlyArrivalPreference = (
  itineraryPreference: "vehicle" | "hotel" | "both",
  startTime: string,
): boolean => {
  const arrivalMinutes = timeToMinutes(startTime);
  return (
    itineraryPreference === "vehicle" &&
    arrivalMinutes !== null &&
    arrivalMinutes < transportEarlyArrivalCutoffMinutes()
  );
};
