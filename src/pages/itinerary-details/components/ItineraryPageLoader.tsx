import { Loader2 } from "lucide-react";

export interface ItineraryPageLoaderProps {
  stage: string;
  detail: string;
  history: string[];
}

export function ItineraryPageLoader({ stage, detail, history }: ItineraryPageLoaderProps) {
  return (
    <div className="min-h-[70vh] w-full max-w-full flex items-center justify-center px-4">
      <div className="w-full max-w-xl rounded-3xl border border-[#e5d9f2] bg-white p-8 text-center shadow-sm">
        <Loader2 className="mx-auto h-8 w-8 animate-spin text-[#d546ab]" />
        <p className="mt-4 text-base font-semibold text-[#4a4260]">{stage || "Building itinerary details"}</p>
        <p className="mt-2 text-sm font-medium text-[#6c6c6c]">
          {detail || "We are preparing the latest itinerary data before showing the page."}
        </p>
        {history.length > 0 ? (
          <div className="mt-5 rounded-2xl border border-[#f2e6fb] bg-[#fcf7ff] p-4 text-left">
            <p className="text-xs font-bold uppercase tracking-wide text-[#8f6aa8]">Progress log</p>
            <div className="mt-3 space-y-2">
              {history.map((step, index) => {
                const isLatest = index === history.length - 1;
                return (
                  <div
                    key={`${step}-${index}`}
                    className={`rounded-xl border px-3 py-2 text-sm ${
                      isLatest
                        ? "border-[#d9b6f3] bg-white text-[#4a4260]"
                        : "border-[#efe1fa] bg-[#faf5ff] text-[#7b6f8d]"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {isLatest ? (
                        <Loader2 className="h-4 w-4 animate-spin text-[#d546ab]" />
                      ) : (
                        <div className="h-2 w-2 rounded-full bg-[#d546ab]" />
                      )}
                      <span>{step}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
