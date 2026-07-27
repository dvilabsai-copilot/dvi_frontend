import { Button } from "@/components/ui/button";

interface VehicleBuildErrorStateProps {
  error: string | null;
  onRetry: () => void | Promise<void>;
  retrying?: boolean;
  savedPlanId?: number;
  savedQuoteId?: string;
}

export function VehicleBuildErrorState({ error, onRetry, retrying = false, savedPlanId, savedQuoteId }: VehicleBuildErrorStateProps) {
  return (
    <div className="w-full max-w-full px-4 py-3">
      <div className="w-full rounded-xl border border-red-200 bg-red-50 p-4 shadow-sm">
        <p className="text-base font-semibold text-red-700">Vehicle pricing failed to prepare</p>
        {savedPlanId && savedQuoteId && (
          <p className="mt-1 text-sm font-medium text-emerald-800">
            Itinerary saved (plan {savedPlanId}, quote {savedQuoteId}).
          </p>
        )}
        <p className="mt-2 text-sm text-[#6c6c6c]">{error || "Vehicle pricing failed to prepare. Please retry."}</p>
        <Button type="button" className="mt-4 bg-[#d546ab] text-white hover:bg-[#c63e9c]" onClick={onRetry} disabled={retrying}>
          {retrying ? "Retrying vehicle pricing…" : "Retry vehicle pricing"}
        </Button>
      </div>
    </div>
  );
}
