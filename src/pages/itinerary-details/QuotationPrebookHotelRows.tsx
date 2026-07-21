import { SupplementDisplay, type NormalizedSupplement } from "@/components/hotels/SupplementDisplay";
import { replaceHotelProviderBrandForDisplay } from "@/utils/hotelProviderDisplay";

type PrebookHotelEntry = {
  routeId?: string | number;
  hotelCode?: string | number;
  hotelName?: string;
  amenities?: unknown;
  rateConditions?: unknown;
  cancellationPolicy?: unknown;
  cancellationPoliciesText?: unknown;
  roomPromotion?: unknown;
  normalizedSupplements?: NormalizedSupplement[];
  mandatorySupplements?: unknown;
};

type QuotationPrebookHotelRowsProps = {
  entries: readonly PrebookHotelEntry[];
  normalizePrebookItems: (value: unknown) => string[];
  resolvePrebookInclusions: (hotel: PrebookHotelEntry) => string[];
  resolvePrebookMealPlan: (hotel: PrebookHotelEntry) => string;
  normalizeCancellationPolicyItems: (value: unknown) => string[];
  normalizeMealPlanLabel: (value: string) => string;
};

export function QuotationPrebookHotelRows({
  entries,
  normalizePrebookItems,
  resolvePrebookInclusions,
  resolvePrebookMealPlan,
  normalizeCancellationPolicyItems,
  normalizeMealPlanLabel,
}: QuotationPrebookHotelRowsProps) {
  return (
    <>
    {entries.map((hotel, index: number) => {
  const hotelAmenities = normalizePrebookItems(hotel?.amenities);
  const hotelRateConditions = normalizePrebookItems(hotel?.rateConditions);
  const hotelInclusions = resolvePrebookInclusions(hotel);
  const hotelMealType = resolvePrebookMealPlan(hotel);
  const hotelCancellation = normalizeCancellationPolicyItems(hotel?.cancellationPolicy || hotel?.cancellationPoliciesText);
  const hotelPromotions = normalizePrebookItems(hotel?.roomPromotion);
  const hotelSupplements = Array.isArray(hotel?.normalizedSupplements) ? hotel.normalizedSupplements : [];
  const hotelMandatorySupplements = normalizePrebookItems(hotel?.mandatorySupplements);

  return (
    <details key={`prebook-hotel-${hotel?.routeId ?? index}-${hotel?.hotelCode ?? index}`} className="rounded-lg border border-[#eadcfb] bg-white p-4 space-y-3">
      <summary className="cursor-pointer list-none">
        <div className="flex flex-col gap-1">
          <p className="font-semibold text-[#4a4260]">{hotel?.hotelName || `Hotel ${index + 1}`}</p>
          <p className="text-xs text-[#6c6c6c]">Tap to view details</p>
        </div>
      </summary>

                  <div className="pt-3 space-y-3 border-t border-[#f1e7fb]">
                    <div>
                      <p className="text-xs text-[#6c6c6c]">Hotel Code: {hotel?.hotelCode || '-'}</p>
                      {hotel?.routeId ? <p className="text-xs text-[#6c6c6c]">Route ID: {hotel.routeId}</p> : null}
                      {hotelMealType ? (
                        <p className="text-xs text-[#6c6c6c]">
                          Meal Plan: <span className="font-medium text-[#4a4260]">{normalizeMealPlanLabel(hotelMealType)}</span>
                        </p>
                      ) : null}
                    </div>

                  <details className="rounded-lg border border-[#eadcfb] bg-[#fcf9ff] px-3 py-2" open>
                    <summary className="cursor-pointer text-sm font-medium text-[#4a4260]">Cancellation Policy ({hotelCancellation.length})</summary>
                    <div className="mt-2">
                      {hotelCancellation.length > 0 ? (
                        <ul className="text-sm text-[#4a4260] list-disc pl-5 space-y-1 whitespace-pre-wrap">
                          {hotelCancellation.map((item, idx) => (
                            <li key={`hotel-cancel-${hotel?.routeId ?? index}-${idx}`}>{replaceHotelProviderBrandForDisplay(item)}</li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-sm text-[#4a4260]">No cancellation policy returned</p>
                      )}
                    </div>
                  </details>

                  <details className="rounded-lg border border-[#eadcfb] bg-[#fcf9ff] px-3 py-2">
                    <summary className="cursor-pointer text-sm font-medium text-[#4a4260]">Room Promotion ({hotelPromotions.length})</summary>
                    <div className="mt-2">
                      {hotelPromotions.length > 0 ? (
                        <ul className="text-sm text-[#4a4260] list-disc pl-5 space-y-1 whitespace-pre-wrap">
                          {hotelPromotions.map((item, idx) => (
                            <li key={`hotel-promo-${hotel?.routeId ?? index}-${idx}`}>{replaceHotelProviderBrandForDisplay(item)}</li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-sm text-[#4a4260]">No room promotion returned</p>
                      )}
                    </div>
                  </details>

                  <details className="rounded-lg border border-[#eadcfb] bg-[#fcf9ff] px-3 py-2">
                    <summary className="cursor-pointer text-sm font-medium text-[#4a4260]">Rate Conditions ({hotelRateConditions.length})</summary>
                    <div className="mt-2">
                      {hotelRateConditions.length > 0 ? (
                        <ul className="text-sm text-[#4a4260] list-disc pl-5 space-y-1 whitespace-pre-wrap">
                          {hotelRateConditions.map((item, idx) => (
                            <li key={`hotel-rate-${hotel?.routeId ?? index}-${idx}`}>{replaceHotelProviderBrandForDisplay(item)}</li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-sm text-[#4a4260]">No rate conditions returned</p>
                      )}
                    </div>
                  </details>

                  <details className="rounded-lg border border-[#eadcfb] bg-[#fcf9ff] px-3 py-2">
                    <summary className="cursor-pointer text-sm font-medium text-[#4a4260]">Amenities ({hotelAmenities.length})</summary>
                    <div className="mt-2">
                      {hotelAmenities.length > 0 ? (
                        <ul className="text-sm text-[#4a4260] list-disc pl-5 space-y-1 whitespace-pre-wrap">
                          {hotelAmenities.map((item, idx) => (
                            <li key={`hotel-amenity-${hotel?.routeId ?? index}-${idx}`}>{replaceHotelProviderBrandForDisplay(item)}</li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-sm text-[#4a4260]">No amenities returned</p>
                      )}
                    </div>
                  </details>

                  <details className="rounded-lg border border-[#eadcfb] bg-[#fcf9ff] px-3 py-2">
                    <summary className="cursor-pointer text-sm font-medium text-[#4a4260]">Package Inclusions ({hotelInclusions.length})</summary>
                    <div className="mt-2">
                      {hotelInclusions.length > 0 ? (
                        <ul className="text-sm text-[#4a4260] list-disc pl-5 space-y-1 whitespace-pre-wrap">
                          {hotelInclusions.map((item, idx) => (
                            <li key={`hotel-inclusion-${hotel?.routeId ?? index}-${idx}`}>{replaceHotelProviderBrandForDisplay(item)}</li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-sm text-[#4a4260]">No inclusions returned</p>
                      )}
                    </div>
                  </details>

                  <div>
                    <p className="text-[#6c6c6c] text-sm">Mandatory Supplements & Additional Charges</p>
                    {hotelSupplements.length > 0 ? (
                      <SupplementDisplay supplements={hotelSupplements} showHeading={false} />
                    ) : hotelMandatorySupplements.length > 0 ? (
                      <ul className="text-sm text-[#4a4260] list-disc pl-5 space-y-1 whitespace-pre-wrap">
                        {hotelMandatorySupplements.map((item, idx) => (
                          <li key={`hotel-supplement-${hotel?.routeId ?? index}-${idx}`}>{replaceHotelProviderBrandForDisplay(item)}</li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-[#4a4260]">No mandatory supplements returned</p>
                    )}
                  </div>
                  </div>
                </details>
              );
            })}
    </>

  );
}
