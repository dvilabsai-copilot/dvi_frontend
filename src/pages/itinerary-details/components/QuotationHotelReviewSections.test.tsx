import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { QuotationHotelReviewSections } from "./QuotationHotelReviewSections";

describe("Offline confirmations in the package hotel review", () => {
  it("shows Confirmed and hides Hold only for the matching hotel nights", () => {
    const onHoldHotel = vi.fn();
    const entries = [
      { hotelId: 25, hotelCode: "H25", provider: "offline", hotelName: "Tea Castle", displayDayNumbers: [1, 2, 4], displayRouteIds: [11, 12, 14], displayHotelDetailsIds: [21, 22, 24] },
      { hotelId: 26, hotelCode: "H26", provider: "tbo", hotelName: "The Chakrie Residency", displayDayNumbers: [3], displayRouteIds: [13], displayHotelDetailsIds: [23] },
    ];
    render(<QuotationHotelReviewSections
      requiresHotelBookingFlow
      itineraryDays={[1, 2, 3, 4].map((dayNumber) => ({ dayNumber, date: `2027-01-0${dayNumber}` }))}
      externalStayEntries={[]}
      defaultExternalStayMessage=""
      hasAcceptedUpdatedPrice
      setHasAcceptedUpdatedPrice={vi.fn()}
      isPrebooking={false}
      isOpeningConfirmQuotation={false}
      nonTboSelectedHotelEntries={entries}
      prebookHotelEntries={[]}
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
    />);

    const firstNight = within(screen.getByRole("row", { name: /Day 1.*Tea Castle/ }));
    const secondNight = within(screen.getByRole("row", { name: /Day 2.*Tea Castle/ }));
    const supplierStay = within(screen.getByRole("row", { name: /Day 3.*The Chakrie Residency/ }));
    const laterStay = within(screen.getByRole("row", { name: /Day 4.*Tea Castle/ }));
    for (const stay of [firstNight, secondNight, supplierStay]) {
      expect(stay.getByText("Confirmed", { exact: false })).toBeVisible();
      expect(stay.queryByRole("button", { name: "Hold" })).not.toBeInTheDocument();
      expect(stay.queryByRole("button", { name: "View Voucher" })).not.toBeInTheDocument();
    }
    expect(laterStay.getByText("Not Started", { exact: false })).toBeVisible();
    expect(laterStay.getByRole("button", { name: "Hold" })).toBeVisible();
    expect(onHoldHotel).not.toHaveBeenCalled();
  });
});
