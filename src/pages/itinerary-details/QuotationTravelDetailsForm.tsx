import type { Dispatch, SetStateAction } from "react";
import type { GuestDetails } from "./hooks/useQuotationState";

type QuotationTravelDetailsFormProps = {
  guestDetails: GuestDetails;
  setGuestDetails: Dispatch<SetStateAction<GuestDetails>>;
  handleArrivalDateTimeChange: (value: string) => void | Promise<void>;
};

export function QuotationTravelDetailsForm({
  guestDetails,
  setGuestDetails,
  handleArrivalDateTimeChange,
}: QuotationTravelDetailsFormProps) {
  return (
    <>
<div className="space-y-3">
  <h3 className="font-semibold text-[#4a4260]">Arrival Details</h3>

  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
    <div>
      <label className="text-sm font-medium text-[#4a4260] mb-1 block">
        Date & Time
      </label>
      <input
        type="text"
        className="w-full px-3 py-2 border border-[#e5d9f2] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#d546ab]"
        placeholder="12-12-2025 9:00 AM"
        value={guestDetails.arrivalDateTime}
        onChange={(e) => {
          void handleArrivalDateTimeChange(e.target.value);
        }}
      />
    </div>

    <div>
      <label className="text-sm font-medium text-[#4a4260] mb-1 block">
        Arrival Place
      </label>
      <input
        type="text"
        className="w-full px-3 py-2 border border-[#e5d9f2] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#d546ab]"
        placeholder="Chennai International Airport"
        value={guestDetails.arrivalPlace}
        onChange={(e) => setGuestDetails({ ...guestDetails, arrivalPlace: e.target.value })}
      />
    </div>
  </div>

  <div>
    <label className="text-sm font-medium text-[#4a4260] mb-1 block">
      Flight Details
    </label>
    <textarea
      className="w-full px-3 py-2 border border-[#e5d9f2] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#d546ab]"
      rows={2}
      placeholder="Enter the Flight Details"
      value={guestDetails.arrivalFlightDetails}
      onChange={(e) => setGuestDetails({ ...guestDetails, arrivalFlightDetails: e.target.value })}
    />
  </div>
</div>

{/* Departure Details */}
<div className="space-y-3">
  <h3 className="font-semibold text-[#4a4260]">Departure Details</h3>

  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
    <div>
      <label className="text-sm font-medium text-[#4a4260] mb-1 block">
        Date & Time
      </label>
      <input
        type="text"
        className="w-full px-3 py-2 border border-[#e5d9f2] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#d546ab]"
        placeholder="19-12-2025 4:00 PM"
        value={guestDetails.departureDateTime}
        onChange={(e) => setGuestDetails({ ...guestDetails, departureDateTime: e.target.value })}
      />
    </div>

    <div>
      <label className="text-sm font-medium text-[#4a4260] mb-1 block">
        Departure Place
      </label>
      <input
        type="text"
        className="w-full px-3 py-2 border border-[#e5d9f2] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#d546ab]"
        placeholder="Trivandrum, Domestic Airport"
        value={guestDetails.departurePlace}
        onChange={(e) => setGuestDetails({ ...guestDetails, departurePlace: e.target.value })}
      />
    </div>
  </div>

  <div>
    <label className="text-sm font-medium text-[#4a4260] mb-1 block">
      Flight Details
    </label>
    <textarea
      className="w-full px-3 py-2 border border-[#e5d9f2] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#d546ab]"
      rows={2}
      placeholder="Enter the Flight Details"
      value={guestDetails.departureFlightDetails}
      onChange={(e) => setGuestDetails({ ...guestDetails, departureFlightDetails: e.target.value })}
    />
  </div>
</div>
    </>
  );
}
