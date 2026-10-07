import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ItineraryOverallCost } from "@/pages/itinerary-details/components/ItineraryOverallCost";
import { AdminItineraryOverallCost } from "@/pages/itinerary-details/components/AdminItineraryOverallCost";

describe("ItineraryOverallCost", () => {
  it("shows the authoritative hotel and package totals", () => {
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

    expect(screen.getByText("Hotel Cost")).toBeInTheDocument();
    expect(screen.getByText("Hotel Cost").parentElement).toHaveTextContent("96,233.50");
    expect(screen.getByText("Net Package Cost").parentElement).toHaveTextContent("2,20,308.43");
    expect(screen.getByText("Final Selling Price").parentElement).toHaveTextContent("2,20,308.00");
  });
});

describe("AdminItineraryOverallCost", () => {
  it("shows the TBO MAP dinner supplement without changing the hotel total", () => {
    render(
      <AdminItineraryOverallCost
        itinerary={{
          costBreakdown: {
            totalHotelAmount: 6642.68,
            tboMapFallbackDinnerRate: 900,
            tboMapFallbackDinnerCost: 1800,
            totalVehicleCost: 0,
            totalVehicleAmount: 0,
            totalAmount: 6642.68,
            additionalMargin: 0,
            couponDiscount: 0,
            agentMargin: 0,
            totalRoundOff: 0,
            netPayable: 6642.68,
            companyName: "Doview Holidays",
          },
        }}
        canViewCostBreakdown={false}
        financialTotals={{
          hotelAmount: 6642.68,
          totalAmount: 6642.68,
          netPayable: 6642.68,
          totalRoundOff: 0,
          agentMargin: 0,
          additionalMargin: 0,
        }}
      />,
    );

    expect(screen.getByText("MAP Dinner Supplement (included in Total Hotel Amount)")).toBeInTheDocument();
    expect(screen.getByText("Dinner Rate").parentElement).toHaveTextContent("900.00 / person / night");
    expect(screen.getByText("MAP Dinner Supplement (included in Total Hotel Amount)").parentElement).toHaveTextContent("1,800.00");
    expect(screen.getByText("Total Hotel Amount").parentElement).toHaveTextContent("6,642.68");
  });
});
