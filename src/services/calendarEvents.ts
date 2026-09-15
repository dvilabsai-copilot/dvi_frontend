import { api } from "@/lib/api";

export type CalendarEventScope = {
  id: string;
  scopeType: "NATIONAL" | "STATE" | "CITY";
  scopeRefId: number;
};

export type CalendarEvent = {
  id: string;
  eventKey: string;
  title: string;
  shortTitle: string | null;
  eventType: string;
  eventStartDate: string;
  eventEndDate: string;
  travelWindowStartDate: string;
  travelWindowEndDate: string;
  isPublicHoliday: boolean;
  travelImpact: string;
  sortPriority: number;
  description: string | null;
  travelAdvisory: string | null;
  scopes: CalendarEventScope[];
};

export type CalendarEventsResponse = {
  from: string;
  to: string;
  resolvedLocations: Array<{
    input: string;
    cityId: number;
    cityName: string;
    stateId: number;
    stateName: string;
    countryId: number;
    countryName: string;
  }>;
  unresolvedLocations: string[];
  events: CalendarEvent[];
};

export async function fetchCalendarEvents(params: {
  from: string;
  to: string;
  locations?: string[];
}): Promise<CalendarEventsResponse> {
  const search = new URLSearchParams({ from: params.from, to: params.to });
  [...(params.locations || [])].forEach((location) => search.append("location", location));
  return api(`/calendar-events?${search.toString()}`) as Promise<CalendarEventsResponse>;
}
