import { api } from "@/lib/api";
import { downloadAuthenticatedFile } from "./itineraryPdf";

export type ConfirmedItineraryListParams = {
  draw?: number;
  start?: number;
  length?: number;
  start_date?: string;
  end_date?: string;
  source_location?: string;
  destination_location?: string;
  agent_id?: number;
  staff_id?: number;
  guide_id?: number;
  vendor_id?: number;
  include_cancelled?: boolean;
  search?: string;
  search_value?: string;
};

export type CancelledItineraryListParams = {
  draw?: number;
  start?: number;
  length?: number;
  agent_id?: number;
  search_value?: string;
};

export type AccountsItineraryListParams = {
  draw?: number;
  start?: number;
  length?: number;
  agent_id?: number;
};

export async function getConfirmedItineraries(params: ConfirmedItineraryListParams) {
  const queryParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return;
    if (key === "search" || key === "search_value") {
      if (!queryParams.has("search")) queryParams.append("search", String(value));
      return;
    }
    queryParams.append(key, String(value));
  });
  return api(`itineraries/confirmed?${queryParams.toString()}`, { method: "GET" });
}

export async function getConfirmedItineraryDetails(id: string) {
  return api(`itineraries/confirmed/${id}`, { method: "GET" });
}

export async function getConfirmedGuideAssignments(confirmedId: number) {
  return api(`itineraries/confirmed/${confirmedId}/guides`, { method: "GET" });
}

export async function cancelConfirmedGuideSlot(
  confirmedId: number,
  data: {
    routeGuideId: number;
    guideSlotCostDetailsId: number;
    itineraryRouteId?: number;
    cancellationPercentage?: number;
    defectType?: string;
    reason?: string;
  },
) {
  return api(`itineraries/confirmed/${confirmedId}/guides/cancel-slot`, {
    method: "POST",
    body: data,
  });
}

export async function getCancelledItineraries(params: CancelledItineraryListParams) {
  const queryParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return;
    if (key === "search_value") {
      queryParams.append("search[value]", String(value));
      return;
    }
    queryParams.append(key, String(value));
  });
  return api(`itineraries/cancelled?${queryParams.toString()}`, { method: "GET" });
}

export async function getAccountsItineraries(params: AccountsItineraryListParams) {
  const queryParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) queryParams.append(key, String(value));
  });
  return api(`itineraries/accounts?${queryParams.toString()}`, { method: "GET" });
}

export async function getConfirmedAgents() {
  return api("itineraries/confirmed/agents", { method: "GET" });
}

export async function getConfirmedLocations() {
  return api("itineraries/confirmed/locations", { method: "GET" });
}

export async function getLatestAgents() {
  return api("itineraries/latest/agents", { method: "GET" });
}

export async function getLatestLocations() {
  return api("itineraries/latest/locations", { method: "GET" });
}

export async function getVoucherDetails(id: number) {
  return api(`itineraries/${id}/voucher-details`, { method: "GET" });
}

export async function downloadVoucherPdf(id: number) {
  return downloadAuthenticatedFile(`itineraries/${id}/voucher-pdf`, `voucher-details-${id}.pdf`);
}

export async function downloadHotelVoucherPdf(id: number) {
  return downloadAuthenticatedFile(`itineraries/${id}/hotel-voucher-pdf`, `hotel-voucher-${id}.pdf`);
}

export async function downloadVehicleVoucherPdf(id: number) {
  return downloadAuthenticatedFile(`itineraries/${id}/vehicle-voucher-pdf`, `transport-voucher-${id}.pdf`);
}

export async function getPluckCardData(id: number) {
  return api(`itineraries/${id}/pluck-card-data`, { method: "GET" });
}

export async function downloadPluckCardPdf(id: number) {
  return downloadAuthenticatedFile(`itineraries/${id}/pluck-card-pdf`, `pluck-card-${id}.pdf`);
}

export async function getPluckCardDataByConfirmedId(confirmedId: number) {
  return api(`itineraries/confirmed/${confirmedId}/pluck-card-data`, { method: "GET" });
}

export async function getInvoiceData(id: number) {
  return api(`itineraries/${id}/invoice-data`, { method: "GET" });
}

export async function downloadInvoicePdf(id: number, type: "tax" | "proforma" = "tax") {
  return downloadAuthenticatedFile(
    `itineraries/${id}/invoice-pdf?type=${encodeURIComponent(type)}`,
    `${type}-invoice-${id}.pdf`,
  );
}

export async function getIncidentalAvailableComponents(itineraryPlanId: number) {
  return api(`incidental-expenses/available-components?itineraryPlanId=${itineraryPlanId}`, { method: "GET" });
}

export async function getIncidentalAvailableMargin(
  itineraryPlanId: number,
  componentType: number,
  componentId?: number,
) {
  let url = `incidental-expenses/available-margin?itineraryPlanId=${itineraryPlanId}&componentType=${componentType}`;
  if (componentId) url += `&componentId=${componentId}`;
  return api(url, { method: "GET" });
}

export async function addIncidentalExpense(data: {
  itineraryPlanId: number;
  componentType: number;
  componentId: number;
  amount: number;
  reason: string;
  createdBy: number;
}) {
  return api("incidental-expenses", { method: "POST", body: data });
}

export async function getIncidentalHistory(itineraryPlanId: number) {
  return api(`incidental-expenses/history?itineraryPlanId=${itineraryPlanId}`, { method: "GET" });
}

export async function deleteIncidentalHistory(id: number) {
  return api(`incidental-expenses/history/${id}`, { method: "DELETE" });
}

export type HotelSearchParams = {
  cityCode: string;
  checkInDate: string;
  checkOutDate: string;
  roomCount: number;
  guestCount: number;
  adultCount?: number;
  childCount?: number;
  infantCount?: number;
  childAges?: number[];
  guestNationality?: string;
  hotelName?: string;
};

export async function searchHotels(searchParams: HotelSearchParams) {
  return api("hotels/search", {
    method: "POST",
    body: { ...searchParams, guestNationality: searchParams.guestNationality },
  });
}

export async function getHotelInfo(hotelCode: string) {
  return api(`hotels/${hotelCode}`, { method: "GET" });
}

export async function getRoomAvailability(
  hotelCode: string,
  checkInDate: string,
  checkOutDate: string,
) {
  return api(`hotels/${hotelCode}/availability`, {
    method: "POST",
    body: { checkInDate, checkOutDate },
  });
}
