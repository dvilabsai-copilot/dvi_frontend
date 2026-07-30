const dateOnly = (value?: string | Date | null): string => {
  if (!value) return "";
  const text = String(value).trim();
  if (!text) return "";

  const ymd = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (ymd) return `${ymd[1]}-${ymd[2]}-${ymd[3]}`;

  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime()) ? "" : parsed.toISOString().split("T")[0];
};

const nextDate = (value: string): string => {
  if (!value) return "";
  const parsed = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return "";
  parsed.setUTCDate(parsed.getUTCDate() + 1);
  return parsed.toISOString().split("T")[0];
};

/** Ensures supplier hotel searches always receive a positive stay range. */
export const normalizeHotelStayDates = ({
  checkInDate,
  checkOutDate,
  fallbackDate,
}: {
  checkInDate?: string | Date | null;
  checkOutDate?: string | Date | null;
  fallbackDate?: string | Date | null;
}): { checkInDate: string; checkOutDate: string } => {
  const normalizedCheckIn = dateOnly(checkInDate) || dateOnly(fallbackDate);
  const normalizedCheckOut = dateOnly(checkOutDate);

  return {
    checkInDate: normalizedCheckIn,
    checkOutDate:
      normalizedCheckOut && normalizedCheckOut > normalizedCheckIn
        ? normalizedCheckOut
        : nextDate(normalizedCheckIn),
  };
};
