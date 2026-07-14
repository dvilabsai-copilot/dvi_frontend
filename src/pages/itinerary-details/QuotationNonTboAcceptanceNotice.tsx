import type { Dispatch, SetStateAction } from "react";

type QuotationNonTboAcceptanceNoticeProps = {
  accepted: boolean;
  setAccepted: Dispatch<SetStateAction<boolean>>;
};

export function QuotationNonTboAcceptanceNotice({
  accepted,
  setAccepted,
}: QuotationNonTboAcceptanceNoticeProps) {
  return (
    <label className="flex items-start gap-2 text-sm text-[#4a4260]">
      <input type="checkbox" className="mt-1" checked={accepted} onChange={(event) => setAccepted(event.target.checked)} />
      <span>I have reviewed the selected hotel details before final booking confirmation.</span>
    </label>
  );
}

