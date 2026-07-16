import { Loader2 } from "lucide-react";

type QuotationPrebookLoadingNoticeProps = {
  visible: boolean;
};

export function QuotationPrebookLoadingNotice({ visible }: QuotationPrebookLoadingNoticeProps) {
  if (!visible) return null;

  return (
    <div className="flex items-center gap-3 border border-[#e5d9f2] rounded-lg p-4 bg-[#faf5ff]">
      <Loader2 className="h-5 w-5 animate-spin text-[#d546ab]" />
      <div>
        <p className="text-sm font-medium text-[#4a4260]">Fetching latest prebook details...</p>
        <p className="text-xs text-[#6c6c6c]">Loading updated price, amenities, rate conditions, and inclusions.</p>
      </div>
    </div>
  );
}

