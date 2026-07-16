import type { Dispatch, SetStateAction } from "react";
import { QuotationNonTboSelectedHotels } from "./QuotationNonTboSelectedHotels";
import { QuotationPrebookHotelRows } from "../QuotationPrebookHotelRows";
import { QuotationPrebookAcceptanceNotice } from "../QuotationPrebookAcceptanceNotice";
import { QuotationNonTboAcceptanceNotice } from "../QuotationNonTboAcceptanceNotice";

type HotelEntry = Record<string, unknown>;
type ExternalStayEntry = { routeId?: string | number; destination?: string; day?: string; availabilityMessage?: string };
type PrebookData = { updatedTotalPrice?: number; finalPrice?: number; totalAmount?: number };

type QuotationHotelReviewSectionsProps = {
  requiresHotelBookingFlow: boolean;
  externalStayEntries: readonly ExternalStayEntry[];
  defaultExternalStayMessage: string;
  hasAcceptedUpdatedPrice: boolean;
  setHasAcceptedUpdatedPrice: Dispatch<SetStateAction<boolean>>;
  prebookData?: PrebookData | null;
  isPrebooking: boolean;
  isOpeningConfirmQuotation: boolean;
  nonTboSelectedHotelEntries: readonly HotelEntry[];
  prebookHotelEntries: readonly HotelEntry[];
  hasPrebookPriceChanged: boolean;
  normalizePrebookItems: (value: unknown) => string[];
  resolvePrebookInclusions: (hotel: unknown) => string[];
  resolvePrebookMealPlan: (hotel: unknown) => string;
  normalizeCancellationPolicyItems: (value: unknown) => string[];
  normalizeMealPlanLabel: (value?: string | null) => string;
};

/** Owns the external-stay, non-TBO, and TBO prebook review sections in quotation confirmation. */
export function QuotationHotelReviewSections({
  requiresHotelBookingFlow,
  externalStayEntries,
  defaultExternalStayMessage,
  hasAcceptedUpdatedPrice,
  setHasAcceptedUpdatedPrice,
  prebookData,
  isPrebooking,
  isOpeningConfirmQuotation,
  nonTboSelectedHotelEntries,
  prebookHotelEntries,
  hasPrebookPriceChanged,
  normalizePrebookItems,
  resolvePrebookInclusions,
  resolvePrebookMealPlan,
  normalizeCancellationPolicyItems,
  normalizeMealPlanLabel,
}: QuotationHotelReviewSectionsProps) {
  return (
    <>
      {requiresHotelBookingFlow && externalStayEntries.length > 0 && (
        <div className="space-y-3 rounded-lg border border-amber-200 bg-amber-50 p-4">
          <div>
            <h3 className="font-semibold text-amber-900">External / self-arranged stay required</h3>
            <p className="mt-1 text-xs text-amber-800">These city/date rows do not have supplier-bookable rooms. They will be shown in the itinerary, but they will not be sent to prebook or final supplier booking.</p>
          </div>
          <div className="space-y-2">
            {externalStayEntries.map((entry, index) => (
              <div key={`external-stay-${entry.routeId || "na"}-${index}`} className="rounded-md border border-amber-100 bg-white/80 px-3 py-2">
                <p className="text-sm font-medium text-amber-900">Route {entry.routeId || "-"}{entry.destination ? ` · ${entry.destination}` : ""}{entry.day ? ` · ${entry.day}` : ""}</p>
                <p className="mt-1 text-xs text-amber-800">{entry.availabilityMessage || defaultExternalStayMessage}</p>
              </div>
            ))}
          </div>
          <label className="flex items-start gap-2 text-sm text-amber-900">
            <input type="checkbox" className="mt-1" checked={hasAcceptedUpdatedPrice} onChange={(event) => setHasAcceptedUpdatedPrice(event.target.checked)} />
            <span>I understand these hotel stays are external/self-arranged and will not be booked through supplier APIs.</span>
          </label>
        </div>
      )}

      {requiresHotelBookingFlow && !prebookData && !isPrebooking && !isOpeningConfirmQuotation && nonTboSelectedHotelEntries.length > 0 && (
        <div className="space-y-3 rounded-lg border border-[#e5d9f2] bg-[#faf5ff] p-4">
          <h3 className="font-semibold text-[#4a4260]">Selected Hotels (Non-TBO)</h3>
          <p className="text-xs text-[#6c6c6c]">No TBO hotels selected — TBO prebook not required for this booking.</p>
          <QuotationNonTboSelectedHotels entries={nonTboSelectedHotelEntries} normalizePrebookItems={normalizePrebookItems} resolvePrebookInclusions={resolvePrebookInclusions} resolvePrebookMealPlan={resolvePrebookMealPlan} normalizeCancellationPolicyItems={normalizeCancellationPolicyItems} normalizeMealPlanLabel={normalizeMealPlanLabel} keyPrefix="ntbo-only" providerNote="Policies and rate conditions are managed by the provider. TBO prebook is not applicable." />
          <QuotationNonTboAcceptanceNotice accepted={hasAcceptedUpdatedPrice} setAccepted={setHasAcceptedUpdatedPrice} />
        </div>
      )}

      {requiresHotelBookingFlow && prebookData && (
        <div className="space-y-3 rounded-lg border border-[#e5d9f2] bg-[#faf5ff] p-4">
          <h3 className="font-semibold text-[#4a4260]">Prebook Review</h3>
          <div className="grid grid-cols-1 gap-3 text-sm md:grid-cols-2">
            <div><p className="text-[#6c6c6c]">Hotel Final Cost</p><p className="font-semibold text-[#4a4260]">₹ {Number(prebookData.updatedTotalPrice || prebookData.finalPrice || prebookData.totalAmount || 0).toFixed(2)}</p></div>
            <div><p className="text-[#6c6c6c]">Hotels Prebooked</p><p className="font-semibold text-[#4a4260]">{prebookHotelEntries.length || 0}</p></div>
          </div>
          <QuotationPrebookHotelRows entries={prebookHotelEntries as never} normalizePrebookItems={normalizePrebookItems} resolvePrebookInclusions={resolvePrebookInclusions as never} resolvePrebookMealPlan={resolvePrebookMealPlan as never} normalizeCancellationPolicyItems={normalizeCancellationPolicyItems} normalizeMealPlanLabel={normalizeMealPlanLabel as (value: string) => string} />
          {nonTboSelectedHotelEntries.length > 0 && <div className="space-y-2"><p className="mt-1 text-xs font-semibold uppercase tracking-wide text-[#6c6c6c]">Non-TBO Selected Hotels</p><QuotationNonTboSelectedHotels entries={nonTboSelectedHotelEntries} normalizePrebookItems={normalizePrebookItems} resolvePrebookInclusions={resolvePrebookInclusions} resolvePrebookMealPlan={resolvePrebookMealPlan} normalizeCancellationPolicyItems={normalizeCancellationPolicyItems} normalizeMealPlanLabel={normalizeMealPlanLabel} keyPrefix="non-tbo-hotel" providerNote="This hotel is managed outside TBO. Details shown here come from the selected provider record." /></div>}
          <QuotationPrebookAcceptanceNotice priceChanged={hasPrebookPriceChanged} accepted={hasAcceptedUpdatedPrice} setAccepted={setHasAcceptedUpdatedPrice} />
        </div>
      )}
    </>
  );
}

export default QuotationHotelReviewSections;
