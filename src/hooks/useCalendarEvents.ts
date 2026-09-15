import { useQuery } from "@tanstack/react-query";
import { fetchCalendarEvents } from "@/services/calendarEvents";

function normalizeLocations(locations: string[]) {
  const unique = new Map<string, string>();
  locations.map((location) => location.trim()).filter(Boolean).forEach((location) => {
    const key = location.toLocaleLowerCase();
    if (!unique.has(key)) unique.set(key, location);
  });
  return Array.from(unique.values()).sort((a, b) => a.localeCompare(b));
}

export function useCalendarEvents({
  from,
  to,
  locations = [],
  enabled = true,
}: {
  from: string;
  to: string;
  locations?: string[];
  enabled?: boolean;
}) {
  const normalizedLocations = normalizeLocations(locations);
  return useQuery({
    queryKey: ["calendar-events", from, to, normalizedLocations],
    queryFn: () => fetchCalendarEvents({ from, to, locations: normalizedLocations }),
    enabled: enabled && Boolean(from && to),
    staleTime: 30 * 60 * 1000,
    retry: 1,
  });
}
