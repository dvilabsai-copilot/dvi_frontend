/**
 * Pure display and supplier-value normalization rules shared by HotelList.
 * Keeping these rules outside the component makes them independently testable
 * and prevents re-rendering concerns from being coupled to parsing behavior.
 */

const mealPlanLabelByCode: Record<string, string> = {
  CP: 'CP - Continental Plan (Breakfast only)',
  EP: 'EP - European Plan (Room only)',
  MAP: 'MAP - Modified American Plan (Breakfast + Lunch or Dinner)',
  AP: 'AP - American Plan (Breakfast + Lunch + Dinner)',
};

export const MEAL_CODE_LABEL: Record<string, string> = { CP: 'CP', EP: 'EP', MAP: 'MAP', AP: 'AP' };

export const normalizeMealPlanLabel = (value?: string | null): string => {
  const raw = String(value || '').trim();
  if (!raw || raw === '-') return mealPlanLabelByCode.EP;

  const upper = raw.toUpperCase();
  if (upper === 'CP' || upper.includes('CONTINENTAL PLAN')) return mealPlanLabelByCode.CP;
  if (upper === 'MAP' || upper.includes('MODIFIED AMERICAN PLAN')) return mealPlanLabelByCode.MAP;
  if (upper === 'AP' || upper === 'AMERICAN PLAN') return mealPlanLabelByCode.AP;
  if (upper === 'EP' || upper.includes('EUROPEAN PLAN') || upper.includes('ROOM ONLY') || upper.includes('NO MEAL')) {
    return mealPlanLabelByCode.EP;
  }

  if (upper.includes('ALL MEALS') || upper.includes('FULL BOARD') || upper.includes('FULLBOARD')) return mealPlanLabelByCode.AP;
  if (upper.includes('HALF BOARD') || upper.includes('HALFBOARD')) return mealPlanLabelByCode.MAP;

  const hasBreakfast = upper.includes('BREAKFAST');
  const hasLunch = upper.includes('LUNCH');
  const hasDinner = upper.includes('DINNER');

  if (hasBreakfast && hasLunch && hasDinner) return mealPlanLabelByCode.AP;
  if ((hasBreakfast && hasLunch) || (hasBreakfast && hasDinner) || (hasLunch && hasDinner)) return mealPlanLabelByCode.MAP;
  if (hasBreakfast) return mealPlanLabelByCode.CP;

  return mealPlanLabelByCode.EP;
};

export const normalizedLabelToCode = (label: string): string | null => {
  const normalized = String(label || '').trim().toUpperCase();
  if (normalized.startsWith('CP')) return 'CP';
  if (normalized.startsWith('EP')) return 'EP';
  if (normalized.startsWith('MAP')) return 'MAP';
  if (normalized.startsWith('AP')) return 'AP';
  return null;
};

export const toMoneyNumber = (value: number | string | undefined | null): number => {
  const num = Number(value ?? 0);
  if (!Number.isFinite(num)) return 0;

  return Number(num.toFixed(2));
};

export const formatCurrency = (value: number | string | undefined | null): string => {
  return `\u20B9 ${toMoneyNumber(value).toFixed(2)}`;
};

export const formatDisplayDate = (value?: string | null): string => {
  if (!value) return "";
  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

export const stripHtml = (value: string): string =>
  String(value || "")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

export const normalizeTextList = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value
      .flatMap((item) => {
        if (typeof item === "string") return [stripHtml(item)];
        if (typeof item === "number") return [String(item)];
        if (item && typeof item === "object") {
          const candidate =
            (item as any).description ??
            (item as any).text ??
            (item as any).title ??
            (item as any).name ??
            (item as any).type;
          return candidate ? [stripHtml(String(candidate))] : [];
        }
        return [];
      })
      .map((entry) => entry.trim())
      .filter(Boolean);
  }

  if (typeof value === "string") {
    const text = value.trim();
    if (!text) return [];

    if ((text.startsWith("[") && text.endsWith("]")) || (text.startsWith("{") && text.endsWith("}"))) {
      try {
        return normalizeTextList(JSON.parse(text));
      } catch {
        // Continue with plain string fallback below.
      }
    }

    return text
      .split(/\r?\n|\||;/)
      .map((part) => stripHtml(part))
      .map((part) => part.trim())
      .filter(Boolean);
  }

  if (typeof value === "number") return [String(value)];
  return [];
};

export const pickListFromKeys = (source: Record<string, unknown>, keys: string[]): string[] => {
  for (const key of keys) {
    const values = normalizeTextList(source[key]);
    if (values.length > 0) {
      return Array.from(new Set(values));
    }
  }
  return [];
};

export const normalizeHotelStarCategory = (value: unknown): number | null => {
  const raw = String(value ?? '').trim();
  if (!raw) return null;

  // Handles labels like "3*", "4-Star", "5 star".
  const starLabelMatch = raw.match(/([1-5])\s*(?:\*|STAR)?/i);
  if (starLabelMatch) {
    const parsed = Number(starLabelMatch[1]);
    if (parsed >= 1 && parsed <= 5) return parsed;
  }

  const numeric = Number(raw);
  if (!Number.isFinite(numeric)) return null;
  if (numeric >= 1 && numeric <= 5) return numeric;

  // Some environments leak category IDs (e.g. 13, 14) for 3*/4*.
  const lastDigit = Math.floor(numeric) % 10;
  if (numeric >= 10 && numeric < 100 && lastDigit >= 1 && lastDigit <= 5) {
    return lastDigit;
  }

  return null;
};
