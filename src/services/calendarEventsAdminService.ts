import { api } from "@/lib/api";

export type CalendarEventAdminRow = {
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
  description: string | null;
  travelAdvisory: string | null;
  sourceName: string | null;
  sourceReference: string | null;
  sortPriority: number;
  status: boolean;
  scopes: Array<{ id: string; scopeType: string; scopeRefId: number }>;
};

export type CalendarEventAdminInput = {
  eventKey?: string;
  title: string;
  shortTitle?: string;
  eventType: string;
  eventStartDate: string;
  eventEndDate: string;
  travelWindowStartDate: string;
  travelWindowEndDate: string;
  isPublicHoliday: boolean;
  travelImpact: string;
  description?: string;
  travelAdvisory?: string;
  sourceName?: string;
  sourceReference?: string;
  sortPriority: number;
  status: number;
};

const BASE_PATH = "/calendar-events";

export const calendarEventsAdminService = {
  async list(): Promise<CalendarEventAdminRow[]> {
    return (await api(`${BASE_PATH}/admin`)) as CalendarEventAdminRow[];
  },

  async create(payload: CalendarEventAdminInput): Promise<CalendarEventAdminRow> {
    return (await api(BASE_PATH, { method: "POST", body: payload })) as CalendarEventAdminRow;
  },

  async update(id: string, payload: Partial<CalendarEventAdminInput>): Promise<CalendarEventAdminRow> {
    return (await api(`${BASE_PATH}/${id}`, { method: "PUT", body: payload })) as CalendarEventAdminRow;
  },

  async updateStatus(id: string, status: boolean): Promise<CalendarEventAdminRow> {
    return (await api(`${BASE_PATH}/${id}/status`, {
      method: "PATCH",
      body: { status: status ? 1 : 0 },
    })) as CalendarEventAdminRow;
  },

  async remove(id: string): Promise<void> {
    await api(`${BASE_PATH}/${id}`, { method: "DELETE" });
  },
};
