type QuotationPassengerNoticeProps = {
  visible: boolean;
};

export function QuotationPassengerNotice({ visible }: QuotationPassengerNoticeProps) {
  if (!visible) return null;

  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
      <p className="text-sm font-medium text-amber-800">Passenger details required for final booking</p>
      <p className="text-xs text-amber-700 mt-1">
        Please review the child and infant details below before confirming the booking.
      </p>
    </div>
  );
}

