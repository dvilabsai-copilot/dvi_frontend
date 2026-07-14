import type { Dispatch, SetStateAction } from "react";

type QuotationPrebookAcceptanceNoticeProps = {
  priceChanged: boolean;
  accepted: boolean;
  setAccepted: Dispatch<SetStateAction<boolean>>;
};

export function QuotationPrebookAcceptanceNotice({
  priceChanged,
  accepted,
  setAccepted,
}: QuotationPrebookAcceptanceNoticeProps) {
  return (
    <>
      {priceChanged && (
        <p className="text-sm font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded p-2">
          Prebook returned a changed price compared to selected hotel rates. You must accept the updated amount before final booking.
        </p>
      )}

      <label className="flex items-start gap-2 text-sm text-[#4a4260]">
        <input type="checkbox" className="mt-1" checked={accepted} onChange={(event) => setAccepted(event.target.checked)} />
        <span>I have reviewed the inclusions, amenities, rate conditions, cancellation policy, room promotion, and additional charge details before final booking confirmation.</span>
      </label>
    </>
  );
}

