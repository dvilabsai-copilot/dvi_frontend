export const formatHotelHoldDuration = (durationValue: unknown): string | null => {
  const durationHours = Number(durationValue);
  if (!Number.isFinite(durationHours) || durationHours <= 0) return null;
  if (durationHours % 24 === 0) {
    const days = durationHours / 24;
    return `${days} ${days === 1 ? "day" : "days"} (${durationHours} hours)`;
  }
  return `${durationHours} hours`;
};

export const formatHotelHoldDeadline = (deadlineValue: unknown): string | null => {
  if (typeof deadlineValue !== "string" || !deadlineValue.trim()) return null;
  const deadline = new Date(deadlineValue);
  if (Number.isNaN(deadline.getTime())) return null;
  return deadline.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
};
