export const formatPreviewTime = (value: string | Date | null | undefined): string => {
  if (!value) return "N/A";

  const date = new Date(value instanceof Date ? value.getTime() : value);
  if (Number.isNaN(date.getTime())) return String(value);

  const hours = date.getUTCHours();
  const minutes = date.getUTCMinutes().toString().padStart(2, "0");
  const ampm = hours >= 12 ? "PM" : "AM";
  const h12 = hours % 12 || 12;
  return `${h12}:${minutes} ${ampm}`;
};

export const formatActivityDuration = (value: string | null | undefined): string => {
  if (!value) return "Not specified";

  const match = String(value).match(/(?:T)?(\d{2}):(\d{2})(?::(\d{2}))?/);
  if (!match) return String(value);

  const hours = Number(match[1] || 0);
  const minutes = Number(match[2] || 0);
  const parts: string[] = [];

  if (hours > 0) {
    parts.push(`${hours} Hour${hours === 1 ? "" : "s"}`);
  }

  if (minutes > 0) {
    parts.push(`${minutes} Min`);
  }

  return parts.length > 0 ? parts.join(" ") : "0 Min";
};

export const formatActivityMoney = (value: number | string | null | undefined): string =>
  `₹${Number(value || 0).toFixed(2)}`;

export const getActivityTotalAmount = (activity?: unknown | null): number => {
  const record = activity !== null && typeof activity === "object"
    ? activity as Record<string, unknown>
    : {};
  return Number(record.totalAmount ?? record.totalPrice ?? 0);
};
