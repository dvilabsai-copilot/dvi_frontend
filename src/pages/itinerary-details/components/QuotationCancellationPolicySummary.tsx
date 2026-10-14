import { replaceHotelProviderBrandForDisplay } from "@/utils/hotelProviderDisplay";

type QuotationCancellationPolicySummaryProps = {
  items: readonly string[];
};

/** Shows the selected hotel's cancellation policy without requiring the card to be expanded. */
export function QuotationCancellationPolicySummary({ items }: QuotationCancellationPolicySummaryProps) {
  return (
    <div className="mt-2 rounded-lg border border-[#eadcfb] bg-[#fcf9ff] px-3 py-2 text-left">
      <p className="text-sm font-medium text-[#4a4260]">Cancellation Policy ({items.length})</p>
      {items.length > 0 ? (
        <ul className="mt-1 list-disc space-y-1 whitespace-pre-wrap pl-5 text-sm text-[#4a4260]">
          {items.map((item, index) => (
            <li key={`quotation-cancellation-policy-${index}`}>
              {replaceHotelProviderBrandForDisplay(item)}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-1 text-sm text-[#4a4260]">No cancellation policy available</p>
      )}
    </div>
  );
}

export default QuotationCancellationPolicySummary;
