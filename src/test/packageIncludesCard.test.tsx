import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PackageIncludesCard } from "@/pages/itinerary-details/components/PackageIncludesCard";
import { PackageIncludesCard as TravelExpertPackageIncludesCard } from "@/pages/itinerary-details/components/TravelExpertPackageIncludesCard";

const itinerary = {
  adults: 2,
  children: 0,
  infants: 0,
  roomCount: 1,
  extraBed: 0,
  childWithBed: 0,
  childWithoutBed: 0,
  meal_plan_code: "CP",
  costBreakdown: { hotelRateBreakdown: [] },
} as any;

const packageIncludes = {
  description: "Hotel package details",
  houseBoatNote: "",
  rateNote: "",
  vehicleTermsCondition: "<p><strong>Included:</strong> tolls</p><p>Excluded: personal expenses</p>",
};

describe("vehicle terms in package costing", () => {
  it("renders global vehicle terms in the standard package card", () => {
    render(<PackageIncludesCard packageIncludes={packageIncludes} itinerary={itinerary} />);

    expect(screen.getByText("Vehicle Inclusions & Exclusions")).toBeInTheDocument();
    expect(screen.getByText(/Included: tolls Excluded: personal expenses/)).toBeInTheDocument();
    expect(screen.getByText("Hotel package details")).toBeInTheDocument();
  });

  it("renders vehicle terms in the Travel Expert package card", () => {
    render(
      <TravelExpertPackageIncludesCard
        packageIncludes={packageIncludes}
        itinerary={itinerary}
        itineraryPreference={2}
      />,
    );

    expect(screen.getByText("Vehicle Inclusions & Exclusions")).toBeInTheDocument();
    expect(screen.getByText(/Included: tolls Excluded: personal expenses/)).toBeInTheDocument();
  });
});
