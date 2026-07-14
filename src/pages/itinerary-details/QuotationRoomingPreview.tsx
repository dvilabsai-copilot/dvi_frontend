type QuotationRoomingPreviewProps = {
  visible: boolean;
  roomCount: number;
  passengerMix: string;
  occupancies: Array<{ adults: number; children: number }>;
};

export function QuotationRoomingPreview({
  visible,
  roomCount,
  passengerMix,
  occupancies,
}: QuotationRoomingPreviewProps) {
  if (!visible) return null;

  return (
    <div className="bg-[#f8f9fa] p-4 rounded-lg space-y-2">
      <div className="flex justify-between text-sm gap-4">
        <span className="text-[#6c6c6c]">Rooms To Be Booked:</span>
        <span className="font-medium text-[#4a4260]">{roomCount}</span>
      </div>
      <div className="flex justify-between text-sm gap-4">
        <span className="text-[#6c6c6c]">Passenger Mix:</span>
        <span className="font-medium text-[#4a4260] text-right">{passengerMix || "No passengers selected"}</span>
      </div>
      <div className="pt-2 border-t border-[#e6e6e6]">
        <p className="text-sm text-[#6c6c6c] mb-2">Rooming Preview</p>
        <div className="space-y-1">
          {occupancies.map((room, index) => {
            const roomMix = [
              room.adults > 0 ? `${room.adults} Adult${room.adults === 1 ? "" : "s"}` : null,
              room.children > 0 ? `${room.children} Child${room.children === 1 ? "" : "ren"}` : null,
            ].filter(Boolean).join(", ");

            return (
              <div key={`confirm-room-${index}`} className="flex justify-between text-sm gap-4">
                <span className="text-[#6c6c6c]">Room {index + 1}:</span>
                <span className="font-medium text-[#4a4260] text-right">{roomMix || "No passengers assigned"}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

