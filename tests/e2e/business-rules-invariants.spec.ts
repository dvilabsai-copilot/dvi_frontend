import { expect, test } from './fixtures';
import {
  allAttractions,
  allCheckins,
  dayOne,
  fetchItineraryDetails,
  findFirstIndex,
  loginForToken,
  parseDisplayTimeToMinutes,
  scenarioQuoteId,
  segmentsOf,
  type ItinerarySegment,
} from './booking-engine-test-utils';

const scenarioKeys = [
  'beforeNoonSameCity',
  'afterNoonSameCityWithin20',
  'afterNoonSameCityBeyond20',
  'differentCityDay1',
  'closedHotspotDeferred',
  'houseboat',
  'kmWarning',
  'guideTotal',
] as const;

function segmentTime(segment: ItinerarySegment): number | null {
  return parseDisplayTimeToMinutes(segment.visitTime || segment.time || null);
}

test.describe('Business-rule invariant coverage', () => {
  test('all seeded scenarios have ordered days and valid timeline segments', async ({ request }) => {
    const token = await loginForToken(request);

    for (const key of scenarioKeys) {
      const quoteId = scenarioQuoteId(key);
      expect(quoteId, `${key} fixture quote`).toBeTruthy();
      const details = await fetchItineraryDetails(request, token, quoteId as string);
      const days = Array.isArray(details.days) ? details.days : [];

      expect(days.length, `${key} should contain route days`).toBeGreaterThan(0);
      const dayNumbers = days.map((day) => Number(day.dayNumber || 0));
      expect(dayNumbers, `${key} day numbers`).toEqual([...dayNumbers].sort((a, b) => a - b));

      for (const day of days) {
        const segments = segmentsOf(day);
        expect(segments.length, `${key} day ${day.dayNumber} should contain segments`).toBeGreaterThan(0);

        const timedSegments = segments.map(segmentTime).filter((value): value is number => value !== null);
        expect(timedSegments.every((minutes) => minutes >= 0 && minutes < 24 * 60), `${key} contains an invalid time`).toBeTruthy();
      }
    }
  });

  test('business-rule fixtures preserve their expected outcomes', async ({ request }) => {
    const token = await loginForToken(request);
    const load = async (key: typeof scenarioKeys[number]) => {
      const quoteId = scenarioQuoteId(key);
      expect(quoteId, `${key} fixture quote`).toBeTruthy();
      return fetchItineraryDetails(request, token, quoteId as string);
    };

    const beforeNoon = await load('beforeNoonSameCity');
    const beforeSegments = segmentsOf(dayOne(beforeNoon));
    expect(findFirstIndex(beforeSegments, (segment) => segment.type === 'attraction'))
      .toBeLessThan(findFirstIndex(beforeSegments, (segment) => segment.type === 'checkin'));
    expect(segmentTime(allCheckins(beforeSegments)[0])).toBeGreaterThanOrEqual(14 * 60);

    const within20 = await load('afterNoonSameCityWithin20');
    const withinSegments = segmentsOf(dayOne(within20));
    const withinCheckin = segmentTime(allCheckins(withinSegments)[0]);
    const withinAttraction = segmentTime(allAttractions(withinSegments)[0]);
    expect(withinCheckin).toBeGreaterThanOrEqual(14 * 60);
    expect(withinAttraction).not.toBeNull();
    expect((withinAttraction as number) - (withinCheckin as number)).toBeGreaterThanOrEqual(60);

    const beyond20 = await load('afterNoonSameCityBeyond20');
    const beyondSegments = segmentsOf(dayOne(beyond20));
    expect(findFirstIndex(beyondSegments, (segment) => segment.type === 'attraction'))
      .toBeLessThan(findFirstIndex(beyondSegments, (segment) => segment.type === 'checkin'));

    const differentCity = await load('differentCityDay1');
    const differentSegments = segmentsOf(dayOne(differentCity));
    const differentCheckinIndex = findFirstIndex(differentSegments, (segment) => segment.type === 'checkin');
    expect(differentSegments.slice(0, differentCheckinIndex).some((segment) => segment.type === 'travel' && segment.from !== segment.to)).toBeTruthy();

    const closed = await load('closedHotspotDeferred');
    expect(allAttractions(segmentsOf(dayOne(closed))).some((segment) => /(opens at|outside operating hours|closed on this day)/i.test(String(segment.visitTime || '')))).toBeTruthy();

    const houseboat = await load('houseboat');
    expect(allAttractions(segmentsOf(dayOne(houseboat))).length).toBe(0);

    const kmWarning = await load('kmWarning');
    expect(String(kmWarning.costBreakdown?.kmLimitWarning || '').trim()).not.toBe('');

    const guideTotal = await load('guideTotal');
    expect(Number(guideTotal.costBreakdown?.totalGuideCost || 0)).toBeGreaterThan(0);
  });
});
