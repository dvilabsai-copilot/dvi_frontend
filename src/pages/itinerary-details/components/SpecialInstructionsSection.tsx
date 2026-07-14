import React from "react";
import { AlertTriangle } from "lucide-react";

export const SpecialInstructionsSection: React.FC<{ text: string }> = ({ text }) => (
  <div className="mx-4 mb-4 mt-4 rounded-lg border border-[#f1c4dd] bg-[#fff7fb] px-4 py-3 lg:mx-5">
    <div className="mb-1 flex items-center gap-2 text-sm font-semibold text-[#d546ab]">
      <AlertTriangle className="h-4 w-4" />
      Special Instructions
    </div>
    <p className="whitespace-pre-line text-sm leading-6 text-[#4a4260]">
      {text || "No special instructions mentioned."}
    </p>
  </div>
);

