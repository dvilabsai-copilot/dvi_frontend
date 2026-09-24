import React from "react";

import { Card, CardContent } from "@/components/ui/card";

import type {
  ItineraryDetailsResponse,
  PackageIncludes,
} from "../itinerary-details.types";

type PackageIncludesCardProps = {
  packageIncludes: PackageIncludes;
  itinerary: ItineraryDetailsResponse;
};

const cleanPackageText = (value: unknown) =>
  String(value ?? "")
    // Remove empty markdown table rows: |   |
    .replace(/^\s*\|\s*\|\s*$/gm, "")

    // Remove empty markdown separator rows: | - |
    .replace(/^\s*\|\s*-+\s*\|\s*$/gm, "")

    // Remove excessive blank lines left after cleanup
    .replace(/\n{3,}/g, "\n\n")

    .trim();

export const PackageIncludesCard: React.FC<
  PackageIncludesCardProps
> = ({
  packageIncludes,
  itinerary,
}) => {
  const mealPlans = Array.from(
    new Set(
      [
        ...(itinerary.costBreakdown?.hotelRateBreakdown || []).map(
          (row) =>
            String(row.mealPlan || "")
              .trim()
              .toUpperCase(),
        ),

        String(itinerary.meal_plan_code || "")
          .trim()
          .toUpperCase(),
      ].filter(Boolean),
    ),
  );

  const mealPlanText =
    mealPlans.length > 0
      ? mealPlans.join(", ")
      : "--";

  return (
    <Card className="border-none shadow-none bg-white">
      <CardContent className="pt-2">
        <h2 className="text-lg font-semibold text-[#4a4260] mb-4">
          Package Includes
        </h2>

        <div className="space-y-3 text-sm text-[#6c6c6c]">

          {/* Package traveller / room / meal details */}
          <div className="rounded-lg border border-[#eadff5] bg-[#fcf9ff] p-3">
            <p className="mb-2 font-medium text-[#4a4260]">
              Package Details
            </p>

            <div className="grid grid-cols-2 gap-x-4 gap-y-2 md:grid-cols-4">
              <p>
                <span className="font-medium text-[#4a4260]">
                  Adults:
                </span>{" "}
                {Number(itinerary.adults || 0)}
              </p>

              <p>
                <span className="font-medium text-[#4a4260]">
                  Children:
                </span>{" "}
                {Number(itinerary.children || 0)}
              </p>

              <p>
                <span className="font-medium text-[#4a4260]">
                  Infants:
                </span>{" "}
                {Number(itinerary.infants || 0)}
              </p>

              <p>
                <span className="font-medium text-[#4a4260]">
                  Rooms:
                </span>{" "}
                {Number(itinerary.roomCount || 0)}
              </p>

              <p>
                <span className="font-medium text-[#4a4260]">
                  Extra Bed:
                </span>{" "}
                {Number(itinerary.extraBed || 0)}
              </p>

              <p>
                <span className="font-medium text-[#4a4260]">
                  Child With Bed:
                </span>{" "}
                {Number(itinerary.childWithBed || 0)}
              </p>

              <p>
                <span className="font-medium text-[#4a4260]">
                  Child Without Bed:
                </span>{" "}
                {Number(itinerary.childWithoutBed || 0)}
              </p>

              <p>
                <span className="font-medium text-[#4a4260]">
                  Meal Plan:
                </span>{" "}
                {mealPlanText}
              </p>
            </div>
          </div>

          {/* Existing inclusion content - KEEP */}
          <div>
            <p className="font-medium text-[#4a4260] mb-1">
              Package Includes: (Inclusion)
            </p>

           <p className="whitespace-pre-line">
  {cleanPackageText(packageIncludes?.description)}
</p>
          </div>

          {/* Existing house boat content - KEEP */}
          <div>
            <p className="font-medium text-[#4a4260] mb-1">
              If staying in the House boat At Alleppey/Kumarakom
            </p>

           <p className="whitespace-pre-line">
  {cleanPackageText(packageIncludes?.houseBoatNote)}
</p>
          </div>

          {/* Existing exclusion / rate note content - KEEP */}
          <div>
           <p className="whitespace-pre-line font-medium text-[#4a4260]">
  {cleanPackageText(packageIncludes?.rateNote)}
</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};