import { Button } from "@/components/ui/button";

interface VehicleBuildErrorStateProps {
  error: string | null;
  onRetry: () => void | Promise<void>;
}

export function VehicleBuildErrorState({ error, onRetry }: VehicleBuildErrorStateProps) {
  return (
    <div className="min-h-[70vh] w-full max-w-full flex items-center justify-center px-4">
      <div className="w-full max-w-xl rounded-3xl border border-red-200 bg-white p-8 text-center shadow-sm">
        <p className="text-base font-semibold text-red-700">Vehicle pricing failed to prepare</p>
        <p className="mt-2 text-sm text-[#6c6c6c]">{error || "Vehicle pricing failed to prepare. Please retry."}</p>
        <Button type="button" className="mt-6 bg-[#d546ab] text-white hover:bg-[#c63e9c]" onClick={onRetry}>
          Retry vehicle build
        </Button>
      </div>
    </div>
  );
}
