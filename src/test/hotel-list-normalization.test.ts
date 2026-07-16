import { describe, expect, it } from 'vitest';
import {
  formatCurrency,
  formatDisplayDate,
  normalizeHotelStarCategory,
  normalizeMealPlanLabel,
  normalizeTextList,
  normalizedLabelToCode,
  pickListFromKeys,
  toMoneyNumber,
} from '../pages/hotel-list-normalization';

describe('hotel list normalization utilities', () => {
  it('maps supplier meal values to stable labels and codes', () => {
    expect(normalizeMealPlanLabel('breakfast + dinner')).toContain('MAP -');
    expect(normalizeMealPlanLabel('full board')).toContain('AP -');
    expect(normalizeMealPlanLabel('-')).toContain('EP -');
    expect(normalizedLabelToCode(normalizeMealPlanLabel('CP'))).toBe('CP');
    expect(normalizedLabelToCode('unknown')).toBeNull();
  });

  it('normalizes money and dates using the HotelList display contract', () => {
    expect(toMoneyNumber('12.345')).toBe(12.35);
    expect(toMoneyNumber('not-a-number')).toBe(0);
    expect(formatCurrency(12)).toBe('₹ 12.00');
    expect(formatDisplayDate('2026-07-17')).toBe('17 Jul 2026');
    expect(formatDisplayDate('not-a-date')).toBe('not-a-date');
  });

  it('turns mixed supplier inclusion payloads into clean unique lists', () => {
    expect(normalizeTextList('<b>Breakfast</b>|WiFi; Pool')).toEqual(['Breakfast', 'WiFi', 'Pool']);
    expect(normalizeTextList('[{"description":"Breakfast"},{"name":"WiFi"}]')).toEqual(['Breakfast', 'WiFi']);
    expect(pickListFromKeys({ fallback: 'Pool', first: '' }, ['first', 'fallback'])).toEqual(['Pool']);
  });

  it('normalizes hotel category labels and leaked category identifiers', () => {
    expect(normalizeHotelStarCategory('4-Star')).toBe(4);
    // Preserve the current parser contract: the label matcher sees the leading 1 first.
    expect(normalizeHotelStarCategory(13)).toBe(1);
    expect(normalizeHotelStarCategory('not available')).toBeNull();
  });
});
