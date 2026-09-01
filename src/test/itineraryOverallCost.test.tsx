import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ItineraryOverallCost } from "@/pages/itinerary-details/components/ItineraryOverallCost";

describe("ItineraryOverallCost", () => {
  it("shows hotel pax allocation without adding room cost or margin twice", () => {
    render(
      <ItineraryOverallCost
        itinerary={{
          costBreakdown: {
            hotelPaxCount: 10,
            totalHotelAmount: 96233.5,
            totalVehicleCost: 124074.93,
            totalVehicleAmount: 124074.93,
            totalVehicleQty: 2,
            totalGuideCost: 17500,
            totalHotspotCost: 1610,
            totalAmount: 258609.37,
            agentMargin: 19190.94,
            totalRoundOff: -0.37,
            netPayable: 258609,
            additionalMargin: 0,
            couponDiscount: 0,
            hotelPresentation: {
              roomCount: 5,
              roomPaxCount: 10,
              roomRatePerNight: 3675,
              oneNightRoomCost: 18375,
              roomCost: 96233.5,
              roomCostPerPerson: 9623.35,
              breakfastCost: 0,
              extraBedCount: 1,
              extraBedCost: 950,
              childWithBedCost: 0,
              childWithoutBedCost: 660,
              hotelMarginPercentage: 10,
              hotelMarginCost: 19190.94,
              serviceTax: 0,
              grandTotal: 96233.5,
            },
          },
        }}
        canViewCostBreakdown={true}
        financialTotals={{
          hotelAmount: 96233.5,
          totalAmount: 258609.37,
          netPayable: 258609,
          totalRoundOff: -0.37,
          agentMargin: 19190.94,
          additionalMargin: 0,
        }}
      />,
    );

    expect(screen.getByText(/Total Room Cost \(10 Pax .*9,623\.35\)/)).toBeInTheDocument();
    expect(screen.getByText("Total Hotel Amount")).toBeInTheDocument();
    expect(screen.getByText("Agent Margin (included in Total Amount)")).toBeInTheDocument();
    expect(screen.getByText(/Total Room Cost \(10 Pax .*9,623\.35\)/).parentElement).toHaveTextContent("96,233.50");
    expect(screen.queryByText(/Room Cost \(1 night/)).not.toBeInTheDocument();
    expect(screen.getByText("Net Payable To Doview Holidays India Pvt ltd").parentElement).toHaveTextContent("2,58,609.00");
  });
});
