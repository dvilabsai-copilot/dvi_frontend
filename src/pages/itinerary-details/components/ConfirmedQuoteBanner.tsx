import React from "react";

/** Read-only context banner shown above confirmed itinerary content. */
export const ConfirmedQuoteBanner: React.FC = () => (
  <div className="mx-4 rounded-2xl border border-[#d9b6f3] bg-[#fcf7ff] px-4 py-3 text-[#4a4260] shadow-sm sm:mx-6 lg:mx-8">
    <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#8f6aa8]">Confirmed Quote</p>
        <p className="mt-1 text-sm text-[#6c6c6c]">
          Read-only confirmed itinerary view with quick document actions.
        </p>
      </div>
      <div className="flex flex-wrap gap-2 text-sm font-medium text-[#6f42c1]">
        <span className="rounded-full border border-[#e3d3f6] bg-white px-3 py-1">Top actions enabled</span>
        <span className="rounded-full border border-[#e3d3f6] bg-white px-3 py-1">Main content locked</span>
      </div>
    </div>
  </div>
);

