import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { QuotationHotelReviewSections } from "./QuotationHotelReviewSections";

describe("Offline confirmations in the package hotel review", () => {
  it("shows Confirmed without old hold messages or actions on the matching nights", () => {
    const onHoldHotel = vi.fn();
    const cutoffAt = new Date(Date.now() + 86_400_000).toISOString();
    const entries = [
      { hotelId: 25, hotelCode: "H25", provider: "offline", hotelName: "Tea Castle", displayDayNumbers: [1, 2, 4], displayRouteIds: [11, 12, 14], displayHotelDetailsIds: [21, 22, 24] },
      { hotelId: 26, hotelCode: "H26", provider: "tbo", hotelName: "The Chakrie Residency", displayDayNumbers: [3], displayRouteIds: [13], displayHotelDetailsIds: [23] },
      { hotelId: 27, hotelCode: "H27", provider: "offline", hotelName: "Lake Lodge", displayDayNumbers: [5], displayRouteIds: [15], displayHotelDetailsIds: [25] },
    ];
    render(<QuotationHotelReviewSections
      requiresHotelBookingFlow
      itineraryDays={[1, 2, 3, 4, 5].map((dayNumber) => ({ dayNumber, date: `2027-01-0${dayNumber}` }))}
      externalStayEntries={[]}
      defaultExternalStayMessage=""
      hasAcceptedUpdatedPrice
      setHasAcceptedUpdatedPrice={vi.fn()}
      isPrebooking={false}
      isOpeningConfirmQuotation={false}
      nonTboSelectedHotelEntries={entries}
      prebookHotelEntries={[]}
      holdRequests={[
        { id: 31, hotelName: "Tea Castle", provider: "offline", selectionIds: [21], status: "BLOCKED", cutoffAt },
        { id: 32, hotelName: "Tea Castle", provider: "offline", selectionIds: [22], status: "REQUESTED", canResendEmail: true },
        { id: 33, hotelName: "The Chakrie Residency", provider: "tbo", selectionIds: [23], status: "EXPIRED", confirmationChannel: "OFFLINE_HOLD", releaseStatus: "PENDING", releaseEmailStatus: "SENT" },
        { id: 35, hotelName: "Lake Lodge", provider: "offline", selectionIds: [25], status: "BLOCKED", cutoffAt },
      ]}
      offlineConfirmedStays={[
        { routeId: 11, hotelKey: "offline:25", checkIn: "2027-01-01", checkOut: "2027-01-03" },
        { routeId: 13, hotelKey: "tbo:h26", checkIn: "2027-01-03", checkOut: "2027-01-04" },
      ]}
      hasPrebookPriceChanged={false}
      normalizePrebookItems={() => []}
      resolvePrebookInclusions={() => []}
      resolvePrebookMealPlan={() => ""}
      normalizeCancellationPolicyItems={() => []}
      normalizeMealPlanLabel={() => ""}
      onHoldHotel={onHoldHotel}
      onResendHotelHold={vi.fn()}
      onAcknowledgeHotelRelease={vi.fn()}
    />);

    const firstNight = within(screen.getByRole("row", { name: /Day 1.*Tea Castle/ }));
    const secondNight = within(screen.getByRole("row", { name: /Day 2.*Tea Castle/ }));
    const supplierStay = within(screen.getByRole("row", { name: /Day 3.*The Chakrie Residency/ }));
    const laterStay = within(screen.getByRole("row", { name: /Day 4.*Tea Castle/ }));
    for (const stay of [firstNight, secondNight, supplierStay]) {
      expect(stay.getByText("Confirmed", { exact: false })).toBeVisible();
      expect(stay.getAllByRole("cell")[4]).toBeEmptyDOMElement();
      expect(stay.queryByRole("button", { name: /Hold|Resend|Record Release/ })).not.toBeInTheDocument();
      expect(stay.queryByRole("button", { name: "View Voucher" })).not.toBeInTheDocument();
    }
    expect(laterStay.getByText("Not Started", { exact: false })).toBeVisible();
    expect(laterStay.getByRole("button", { name: "Hold" })).toBeVisible();
    const hotelOnHold = within(screen.getByRole("row", { name: /Day 5.*Lake Lodge/ }));
    expect(hotelOnHold.getByText(/remaining/)).toBeVisible();
    expect(hotelOnHold.getByRole("button", { name: "Extend Hold" })).toBeVisible();
    expect(onHoldHotel).not.toHaveBeenCalled();
  });
});
