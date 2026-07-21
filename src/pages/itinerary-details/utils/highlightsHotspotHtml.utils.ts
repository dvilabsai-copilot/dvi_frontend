import { escapeHtml } from './clipboardFormatting.utils';

type UnknownRecord = Record<string, unknown>;

const asRecord = (value: unknown): UnknownRecord =>
  value !== null && typeof value === 'object' ? (value as UnknownRecord) : {};

export const addHotspotDetailsParagraphSpacing = (html: string): string => {
  if (!html) return html;

  const hotspotHeadingMatch = html.match(/Hotspot Details/i);

  if (!hotspotHeadingMatch || hotspotHeadingMatch.index === undefined) {
    return html;
  }

  const hotspotContentStart =
    hotspotHeadingMatch.index + hotspotHeadingMatch[0].length;

  const afterHotspotHeading = html.slice(hotspotContentStart);

  const nextSectionMatchers = [
    /Terms\s*&?\s*Condition/i,
    /Package Includes/i,
    /Package Excludes/i,
    /Inclusion/i,
    /Exclusion/i,
    /Important Instructions/i,
    /Instructions/i,
    /Cancellation/i,
    /Payment Policy/i,
  ];

  const nextSectionIndex = nextSectionMatchers
    .map((regex) => {
      const match = afterHotspotHeading.match(regex);

      return match?.index !== undefined
        ? hotspotContentStart + match.index
        : -1;
    })
    .filter((index) => index > hotspotContentStart)
    .sort((a, b) => a - b)[0];

  const nextSectionTableStart = nextSectionIndex
    ? html.lastIndexOf('<table', nextSectionIndex)
    : -1;

  const hotspotContentEnd =
    nextSectionTableStart > hotspotContentStart
      ? nextSectionTableStart
      : nextSectionIndex || html.length;

  const hotspotContentHtml = html.slice(
    hotspotContentStart,
    hotspotContentEnd,
  );

  const paragraphBreakToken = '__DVI_HOTSPOT_PARAGRAPH_BREAK__';

const spacedHotspotContentHtml = hotspotContentHtml
  .replace(
    /(?:<br\s*\/?>\s*(?:(?:&nbsp;|&#160;)\s*)?)+/gi,
    paragraphBreakToken,
  )
  .split(paragraphBreakToken)
  .map((segment) => segment.trim())
  .filter((segment) => segment.length > 0)
  .map(
    (segment) =>
      `<div style="margin:0 0 14px 0;line-height:1.45;">${segment}</div>`,
  )
  .join('');

  return `${html.slice(
    0,
    hotspotContentStart,
  )}${spacedHotspotContentHtml}${html.slice(hotspotContentEnd)}`;
};

export const buildHighlightsHotspotDetailsHtml = (daysValue: unknown): string => {
  const days = Array.isArray(daysValue) ? daysValue : [];
  if (!days.length) return '';
  const tableStyle =
  'border-collapse:collapse;background:#fff;font-family:Calibri,Arial,sans-serif;font-size:16px;line-height:1.35;color:#000;';

const borderStyle =
  'border:1px solid #b1b1b1;';

const cellStyle =
  `${borderStyle}padding:6px;text-align:left;vertical-align:middle;`;

const dayCellStyle =
  `${cellStyle}background:#f2f2f2;font-weight:700;`;

const titleStyle =
  'font-family:Calibri,Arial,sans-serif;font-size:18px;line-height:36px;font-weight:700;text-align:center;color:#000;';
  const formatB2BDate = (iso: string) => {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return iso;
    return date.toLocaleDateString('en-US', {
      weekday: 'short', month: 'short', day: '2-digit', year: 'numeric',
    });
  };
  const getHotspotLine = (day: UnknownRecord) => {
    const segments = Array.isArray(day.segments) ? day.segments : [];
    const attractions = segments.filter((segmentValue) => asRecord(segmentValue).type === 'attraction');
    if (!attractions.length) return 'No Hotspot Details Available';
    return attractions.map((segmentValue) => {
      const segment = asRecord(segmentValue);
      const name = escapeHtml(segment.name || '');
      const duration = escapeHtml(segment.duration || '');
      return `<b>${name}</b>${duration ? ` - ${duration}` : ''}`;
    }).join(', ');
  };
  const rowsHtml = days.map((dayValue) => {
    const day = asRecord(dayValue);
    const fromText = day.departure || '';
    const toText = day.arrival || '';
    const routeText = fromText || toText ? ` - ${escapeHtml(fromText)} to ${escapeHtml(toText)}` : '';
    return `
        <tr>
          <td style="${dayCellStyle}">
            Day ${escapeHtml(day.dayNumber)} - ${escapeHtml(formatB2BDate(String(day.date || '')))}
            (${escapeHtml(day.startTime || '')} - ${escapeHtml(day.endTime || '')})${routeText}
          </td>
        </tr>
        <tr>
          <td style="${cellStyle}">
            ${getHotspotLine(day)}
          </td>
        </tr>
      `;
  }).join('');
  return `
    <div style="${titleStyle}margin-top:22px;">Hotspot Details</div>
    <table width="700" border="1" cellpadding="0" cellspacing="0" style="${tableStyle}">
      ${rowsHtml}
    </table>
  `;
};

export const replaceHighlightsHotspotDetailsHtml = (
  backendHtml: string,
  highlightsHotspotHtml: string,
): string => {
  if (!backendHtml || !highlightsHotspotHtml) return backendHtml;
  const hotspotHeadingMatch = backendHtml.match(/Hotspot Details/i);
  if (!hotspotHeadingMatch || hotspotHeadingMatch.index === undefined) return backendHtml;
  const hotspotTableStart = backendHtml.lastIndexOf('<table', hotspotHeadingMatch.index);
  if (hotspotTableStart === -1) return backendHtml;
  const afterHotspotHtml = backendHtml.slice(hotspotHeadingMatch.index + 'Hotspot Details'.length);
  const nextSectionMatchers = [
    /Terms\s*&?\s*Condition/i, /Package Includes/i, /Package Excludes/i,
    /Inclusion/i, /Exclusion/i, /Important Instructions/i, /Instructions/i,
    /Cancellation/i, /Payment Policy/i,
  ];
  const nextSectionIndex = nextSectionMatchers.map((regex) => {
    const match = afterHotspotHtml.match(regex);
    return match?.index !== undefined
      ? hotspotHeadingMatch.index! + 'Hotspot Details'.length + match.index
      : -1;
  }).filter((index) => index > hotspotHeadingMatch.index!).sort((a, b) => a - b)[0];
  if (!nextSectionIndex) return `${backendHtml.slice(0, hotspotTableStart)}${highlightsHotspotHtml}`;
  const nextSectionTableStart = backendHtml.lastIndexOf('<table', nextSectionIndex);
  const hotspotSectionEnd = nextSectionTableStart > hotspotTableStart ? nextSectionTableStart : nextSectionIndex;
  return `${backendHtml.slice(0, hotspotTableStart)}${highlightsHotspotHtml}${backendHtml.slice(hotspotSectionEnd)}`;
};
