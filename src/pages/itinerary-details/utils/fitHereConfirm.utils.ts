const errorMessage = (error: unknown): string => {
  if (typeof error === "object" && error !== null) {
    const message = (error as { message?: unknown }).message;
    return String(message || "");
  }
  return "";
};

export const isRetryableFitHereConfirmError = (error: unknown): boolean => {
  const message = errorMessage(error);
  return message.includes("Fit Here preview attempt was not found")
    || (message.includes("404") && message.includes("/manual-hotspot/fit-confirm"))
    || (
      message.includes("/manual-hotspot/fit-confirm")
      && message.includes("409")
      && (
        message.includes("Timeline changed after preview")
        || message.includes("cannot be confirmed as a clean fit")
        || message.includes("Fit Here confirm was rejected")
        || message.includes("MANUAL_INSERT_")
        || message.includes("MATRIX_SAFE_")
      )
    );
};

export const extractFitHereConfirmErrorCode = (error: unknown): string => {
  const message = errorMessage(error);
  const codeMatch = message.match(/"code"\s*:\s*"([^"]+)"/i);
  if (codeMatch?.[1]) return String(codeMatch[1]).trim();
  const fallbackMatch = message.match(/MANUAL_INSERT_[A-Z0-9_]+/i);
  return fallbackMatch?.[0] ? String(fallbackMatch[0]).trim() : "";
};

export const isExpiredOrMissingFitHereAttemptError = (error: unknown): boolean => {
  const message = errorMessage(error);
  return message.includes("Fit Here preview attempt was not found")
    || message.includes("Fit Here preview attempt expired")
    || (message.includes("/manual-hotspot/fit-confirm") && message.includes("409") && message.includes("preview attempt expired"));
};
