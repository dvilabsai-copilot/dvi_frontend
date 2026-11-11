export const OTHER_HOTELIER_PHONE_OPTION = "__other__";

export const splitHotelierPhoneOptions = (...values: unknown[]): string[] => Array.from(new Set(
  values.flatMap((value) => {
    const entries = Array.isArray(value) ? value : [value];
    return entries.flatMap((entry) => String(entry || "").split(/[;,|]/))
      .map((phone) => phone.trim())
      .filter(Boolean);
  }),
));
