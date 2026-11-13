import { HotelMealSupplementSummary } from "@/pages/itinerary-details/components/HotelMealSupplementSummary";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ItineraryOverallCost } from "@/pages/itinerary-details/components/ItineraryOverallCost";
import { AdminItineraryOverallCost } from "@/pages/itinerary-details/components/AdminItineraryOverallCost";

describe("ItineraryOverallCost", () => {
  it("includes guide and entry ticket charges once without re-adding hotel margin", () => {
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
    expect(screen.getByText("Guide Cost").parentElement).toHaveTextContent("17,500.00");
    expect(screen.getByText("Entry Ticket Cost").parentElement).toHaveTextContent("1,610.00");
    expect(screen.getByText("Net Package Cost").parentElement).toHaveTextContent("2,39,418.43");
    expect(screen.getByText("Final Selling Price").parentElement).toHaveTextContent("2,39,418.00");
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
    expect(screen.queryByText("Dinner Rate")).not.toBeInTheDocument();
    expect(screen.getByText("MAP Dinner Supplement (included in Total Hotel Amount)").parentElement).toHaveTextContent("1,800.00");
    expect(screen.getByText("Total Hotel Amount").parentElement).toHaveTextContent("6,642.68");
  });
});

describe('breakfast fallback display', () => {
 it('shows the existing CP breakfast charge without inventing a dinner charge', () => {
  render(<HotelMealSupplementSummary cost={{tboMapFallbackTargetMealPlan: 'CP', tboMapFallbackBreakfastRate: 400, tboMapFallbackBreakfastCost: 1600, tboMapFallbackDinnerCost: 1600} as any} />);
  expect(screen.getByText('CP Breakfast Supplement (included in Total Hotel Amount)').parentElement).toHaveTextContent('1,600.00');
  expect(screen.getByText('₹ 400.00 × 4 guest-nights')).toBeInTheDocument();
  expect(screen.queryByText(/Dinner Supplement/)).not.toBeInTheDocument();
 });
 it('shows EP to MAP breakfast and dinner separately', () => {
  render(<HotelMealSupplementSummary cost={{tboMapFallbackTargetMealPlan: 'MAP', tboMapFallbackBreakfastCost: 1600, tboMapFallbackDinnerCost: 5200, tboMapFallbackDinnerComponentCost: 3600} as any} />);
  expect(screen.getByText('MAP Dinner Supplement (included in Total Hotel Amount)').parentElement).toHaveTextContent('3,600.00');
  expect(screen.getByText('MAP Breakfast Supplement (included in Total Hotel Amount)').parentElement).toHaveTextContent('1,600.00');
 });
});

// Exercise the card subtotal independently of backend-only margin breakdowns.
describe('package cost-card reconciliation', () => {
 const base = {
  itinerary: { costBreakdown: {totalVehicleAmount: 2000.25, totalVehicleQty: 2, totalGuideCost: 100, totalActivityCost: 50, totalHotspotCost: 25} },
  financialTotals: {hotelAmount: 1000.25, totalAmount: 9999, netPayable: 9999, totalRoundOff: 0, agentMargin: 700, additionalMargin: 80},
  canViewCostBreakdown: false,
 } as any;
 it('keeps API ticket charges after live guide/activity removal and repeated renders', () => {
  const {rerender} = render(<ItineraryOverallCost {...base} />);
  expect(screen.getByText('Net Package Cost').parentElement).toHaveTextContent('3,175.50');
  expect(screen.getByText('Final Selling Price').parentElement).toHaveTextContent('3,176.00');
  rerender(<ItineraryOverallCost {...base} liveGuideCost={0} liveActivityCost={0} />);
  expect(screen.getByText('Net Package Cost').parentElement).toHaveTextContent('3,025.50');
  rerender(<ItineraryOverallCost {...base} liveGuideCost={0} liveActivityCost={0} />);
  expect(screen.getByText('Net Package Cost').parentElement).toHaveTextContent('3,025.50');
 });
 it.each([
  [false, true, '2,175.25'],
  [true, false, '1,175.25'],
 ])('respects hotel/vehicle visibility (%s, %s)', (showHotelCost, showVehicleCost, expected) => {
  render(<ItineraryOverallCost {...base} showHotelCost={showHotelCost} showVehicleCost={showVehicleCost} />);
  expect(screen.getByText('Net Package Cost').parentElement).toHaveTextContent(expected);
 });
 it('adds explicitly enabled additional margin and Agent profit once, then rounds', () => {
  const changed = vi.fn();
  render(<ItineraryOverallCost {...base} includePersistedAdditionalMargin onFinalSellingPriceChange={changed} />);
  fireEvent.change(screen.getByRole('spinbutton'), {target: {value: '100.12'}});
  expect(screen.getByText('Net Package Cost').parentElement).toHaveTextContent('3,255.50');
  expect(screen.getByText('Final Selling Price').parentElement).toHaveTextContent('3,356.00');
  expect(changed).toHaveBeenLastCalledWith(3356);
 });
 it.each([undefined, 0, 'invalid'])('preserves no-ticket totals for %s', (totalHotspotCost) => {
  render(<ItineraryOverallCost {...base} itinerary={{costBreakdown: {...base.itinerary.costBreakdown, totalHotspotCost}}} />);
  expect(screen.queryByText('Entry Ticket Cost')).not.toBeInTheDocument();
  expect(screen.getByText('Net Package Cost').parentElement).toHaveTextContent('3,150.50');
 });
});
