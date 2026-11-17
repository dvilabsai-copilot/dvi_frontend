/**
 * Super Admin Vehicle Comparison export only.
 * V13: vendor comparison first, clear widths, and matching Excel/clipboard order.
 * We keep the same records for Excel download and clipboard copy so labels,
 * vendors, daily amounts, and reconciliation cannot drift between exports.
 *
 * SheetJS community edition cannot write full font/fill/border cell styling.
 * Generate a small, valid OOXML workbook instead: no new dependencies,
 * no shared components changed, and numbers remain genuine Excel numbers.
 */
export type VehicleExportKind = 'currency' | 'number' | 'text';
export type VehicleExportCategory =
  | 'title' | 'metadata' | 'header' | 'status' | 'section' | 'total' | 'check' | 'normal';
export type VehicleExportRecord = {
  cells: Array<string | number | null>;
  kind?: VehicleExportKind;
  category?: VehicleExportCategory;
};

/**
 * V13: mirror the on-screen reading order. Keep the vendor comparison directly
 * after the quote details; move the separate day-by-day route list below the
 * pricing table. BOTH clipboard and XLSX share this same arrangement.
 * The transform only moves record objects: no calculations or source values change.
 */
export const arrangeVehicleExportRecords = (records: VehicleExportRecord[]): VehicleExportRecord[] => {
  const sectionAt = (name: string): number => records.findIndex(record =>
    record.category === 'section' && String(record.cells[0]).trim() === name);
  const quote = sectionAt('QUOTE INFORMATION');
  const route = sectionAt('ROUTE PLAN - DAY BY DAY');
  const costs = sectionAt('VENDOR COST COMPARISON');
  const daily = sectionAt('DAY-WISE COST BREAKDOWN');
  if (!(quote > 0 && route > quote && costs > route && daily > costs)) return [...records];
  return [
    ...records.slice(0, route),
    ...records.slice(costs, daily),
    ...records.slice(route, costs),
    ...records.slice(daily),
  ];
};

/**
 * The detailed cost allocation is still calculated and retained in the live
 * vehicle data. It is intentionally omitted from the day-wise export view:
 * the user requested only usage details and the final daily selling price.
 * Filtering is scoped to DAY-WISE COST BREAKDOWN, not the main vendor totals.
 * Both Copy Full Vehicle List and Download Excel use this same function.
 */
const DAILY_ALLOCATION_ROWS_HIDDEN_FROM_EXPORT = new Set([
  'Rental (allocated)',
  'Other operational charges (allocated)',
  'Vendor GST (allocated)',
  'Daily purchase cost',
  'Daily margin + margin GST',
]);

const hideAllocatedDailyBreakdownRows = (records: VehicleExportRecord[]): VehicleExportRecord[] => {
  let inDayWiseBreakdown = false;
  return records.filter(record => {
    if (record.category === 'section') {
      const label = String(record.cells[0] ?? '').trim();
      // Individual Day N route headings are also 'section' records.
      // Keep filtering across them; only the next major section ends it.
      if (label === 'DAY-WISE COST BREAKDOWN') inDayWiseBreakdown = true;
      if (label === 'CUMULATIVE CHECK' || label === 'HOW TO READ THIS COMPARISON') {
        inDayWiseBreakdown = false;
      }
    }
    return !(inDayWiseBreakdown &&
      DAILY_ALLOCATION_ROWS_HIDDEN_FROM_EXPORT.has(String(record.cells[0] ?? '').trim()));
  }).map(record =>
    record.category === 'metadata' && record.cells[0] === 'Daily figures'
      ? { ...record, cells: [
          'Daily figures',
          'Daily selling prices remain visible; detailed allocated-cost rows are omitted for clarity.',
        ] }
      : record);
};

const valueForText = (value: string | number | null | undefined): string =>
  value === null || value === undefined ? '—' : String(value).replace(/[\t\r\n]+/g, ' ').trim() || '—';
const xmlEscape = (value: string): string =>
  value.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&apos;');
const htmlEscape = (value: string): string =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
// Excel can interpret text starting with an operator as a formula when pasted.
const safeClipboardText = (value: string): string => /^[\s]*[=+@-]/.test(value) ? `'${value}` : value;

/** Paste into Excel A1. Keep each vendor in its own column, wrap long route
 * names and use the same readable sections as Download Excel. */
export function buildReadableVehicleClipboard(records: VehicleExportRecord[], columns: number) {
  const ordered = hideAllocatedDailyBreakdownRows(arrangeVehicleExportRecords(records));
  const htmlRows = ordered.map((record, index) => {
    const cat = record.category || 'normal';
    const section = cat === 'section';
    const title = cat === 'title';
    const meta = cat === 'metadata';
    const header = cat === 'header';
    const total = cat === 'total';
    const check = cat === 'check';
    const stripe = index % 2 === 0;
    const background = title ? (index === 0 ? '#5b21b6' : '#ede9fe') :
      section ? '#ddd6fe' : header ? '#6d28d9' : total ? '#f3e8ff' :
      check ? '#ecfdf5' : (stripe ? '#ffffff' : '#faf7ff');
    const foreground = index === 0 && title || header ? '#ffffff' : '#1f2937';
    const base = `background-color:${background};color:${foreground};font-family:Calibri,Arial,sans-serif;`+
      `font-size:${title ? 15 : section ? 12 : 11}pt;`+
      'padding:8px 12px;border:1px solid #dcd7e8;vertical-align:middle;';
    if (section || title) {
      return `<tr><th colspan="${columns}" style="${base}font-weight:700;text-align:left;height:${title ? 30 : 26}px;">`+
        `${htmlEscape(safeClipboardText(valueForText(record.cells[0])))}</th></tr>`;
    }
    if (meta) {
      return `<tr><th style="${base}font-weight:700;text-align:left;width:310px;">`+
        `${htmlEscape(safeClipboardText(valueForText(record.cells[0])))}</th>`+
        `<td colspan="${Math.max(1, columns - 1)}" style="${base}font-weight:400;text-align:left;white-space:normal;`+
        `word-wrap:break-word;mso-number-format:\\@;">${htmlEscape(safeClipboardText(valueForText(record.cells[1])))}</td></tr>`;
    }
    const cells = Array.from({ length: columns }, (_, column) => {
      const value = record.cells[column] ?? null;
      const number = typeof value === 'number' && Number.isFinite(value);
      const first = column === 0;
      const bold = first || header || total || check;
      const status = cat === 'status';
      const cellBg = status && !first && (/^(current vendor|selected)(\b|\s|$)/i.test(String(value)))
        ? '#dcfce7' : background;
      const cellFg = status ? '#166534' : foreground;
      const cellStyle = base + `background-color:${cellBg};color:${cellFg};font-weight:${bold ? 700 : 400};`+
        `text-align:${first || header || status ? 'left' : 'right'};white-space:normal;word-wrap:break-word;`+
        (number ? (record.kind === 'currency'
          ? "mso-number-format:'\\0022₹\\0022 #,##0.00';"
          : "mso-number-format:'#,##0.00';") : 'mso-number-format:\\@;');
      const tag = first || header ? 'th' : 'td';
      // Raw numeric HTML keeps pasted amounts editable/summable in Excel.
      // Excel applies the rupee format above rather than receiving text like "₹ 1,200".
      const display = number ? String(value) : safeClipboardText(valueForText(value));
      return `<${tag} style="${cellStyle}${first ? 'width:335px;min-width:335px;' : 'width:215px;min-width:215px;'}">${htmlEscape(display)}</${tag}>`;
    });
    return `<tr>${cells.join('')}</tr>`;
  });
  const html = '<html><head><meta charset="utf-8" /></head><body>'+
    '<table border="1" cellspacing="0" cellpadding="0" width="'+(335 + (columns - 1) * 215)+'" '+
    'style="border-collapse:collapse;table-layout:fixed;font-family:Calibri,Arial,sans-serif;mso-table-layout-alt:fixed;">'+
    `<colgroup><col width="335" style="width:335px;mso-width-source:userset;" />${'<col width="215" style="width:215px;mso-width-source:userset;" />'.repeat(Math.max(0, columns - 1))}</colgroup>`+
    htmlRows.join('')+'</table></body></html>';
  // TSV is the fallback if the browser cannot write rich clipboard HTML.
  const tsv = ordered.map(record => {
    if (record.category === 'title' || record.category === 'section') return safeClipboardText(valueForText(record.cells[0]));
    return Array.from({ length: columns }, (_, column) => {
      const value = record.cells[column];
      return typeof value === 'number' && Number.isFinite(value) ? String(value) : safeClipboardText(valueForText(value));
    }).join('\t');
  }).join('\r\n');
  return { html, tsv };
}

const asCellName = (index: number): string => {
  let value = index + 1;
  let name = '';
  while (value > 0) { value -= 1; name = String.fromCharCode(65 + value % 26) + name; value = Math.floor(value / 26); }
  return name;
};
const formatStyle = (font: number, fill: number, numberFormat: number, align: 'left' | 'right' | 'center' = 'left') =>
  `<xf numFmtId="${numberFormat}" fontId="${font}" fillId="${fill}" borderId="1" xfId="0"`+
  ' applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1" applyNumberFormat="1">'+
  `<alignment horizontal="${align}" vertical="center" wrapText="1" indent="${align === 'left' ? 1 : 0}"/></xf>`;
// Stable style IDs used when creating cells.
const ST = {
  normalLabel: 0, title: 1, subtitle: 2, headerLabel: 3, headerVendor: 4,
  metadataLabel: 5, metadataValue: 6, section: 7, text: 8,
  money: 9, number: 10, stripeLabel: 11, stripeText: 12, stripeMoney: 13,
  stripeNumber: 14, totalLabel: 15, totalMoney: 16, totalNumber: 17,
  checkLabel: 18, checkMoney: 19, checkMismatch: 20, selectedStatus: 21,
  otherStatus: 22, selectedVendor: 23, notes: 24, integerNumber: 25,
} as const;

const makeStylesXml = () => {
  const fonts = [
    '<font><sz val="11"/><name val="Calibri"/><color rgb="FF243044"/></font>',
    '<font><sz val="17"/><name val="Calibri"/><b/><color rgb="FFFFFFFF"/></font>',
    '<font><sz val="13"/><name val="Calibri"/><b/><color rgb="FF4C1D95"/></font>',
    '<font><sz val="11"/><name val="Calibri"/><b/><color rgb="FFFFFFFF"/></font>',
    '<font><sz val="11"/><name val="Calibri"/><b/><color rgb="FF4C1D95"/></font>',
    '<font><sz val="11"/><name val="Calibri"/><b/><color rgb="FF243044"/></font>',
    '<font><sz val="11"/><name val="Calibri"/><b/><color rgb="FF166534"/></font>',
    '<font><sz val="11"/><name val="Calibri"/><b/><color rgb="FF991B1B"/></font>',
    '<font><sz val="10"/><name val="Calibri"/><i/><color rgb="FF64748B"/></font>',
  ];
  const fillColor = (color: string) => `<fill><patternFill patternType="solid"><fgColor rgb="${color}"/><bgColor indexed="64"/></patternFill></fill>`;
  const fills = ['<fill><patternFill patternType="none"/></fill>', '<fill><patternFill patternType="gray125"/></fill>',
    fillColor('FF5B21B6'),fillColor('FFEDE9FE'),fillColor('FF6D28D9'),fillColor('FFDDD6FE'),
    fillColor('FFFFFFFF'),fillColor('FFFAF7FF'),fillColor('FFF3E8FF'),fillColor('FFECFDF5'),
    fillColor('FFFEE2E2'),fillColor('FFF1F5F9'),fillColor('FFDCFCE7')];
  const border = '<border><left style="thin"><color rgb="FFE2DCEB"/></left>'+
    '<right style="thin"><color rgb="FFE2DCEB"/></right>'+
    '<top style="thin"><color rgb="FFE2DCEB"/></top>'+
    '<bottom style="thin"><color rgb="FFE2DCEB"/></bottom><diagonal/></border>';
  const formats = [
    formatStyle(0,6,0),                    // 0 normal label
    formatStyle(1,2,0),                    // 1 title
    formatStyle(2,3,0),                    // 2 subtitle
    formatStyle(3,4,0),                    // 3 vendor title label
    formatStyle(3,4,0),                    // 4 vendor title
    formatStyle(5,11,0),                   // 5 metadata label
    formatStyle(0,6,49),                   // 6 metadata text (always text)
    formatStyle(4,5,0),                    // 7 section
    formatStyle(0,6,49),                   // 8 normal text
    formatStyle(0,6,164,'right'),          // 9 currency
    formatStyle(0,6,165,'right'),          // 10 number
    formatStyle(0,7,0),                    // 11 stripe label
    formatStyle(0,7,49),                   // 12 stripe text
    formatStyle(0,7,164,'right'),          // 13 stripe currency
    formatStyle(0,7,165,'right'),          // 14 stripe number
    formatStyle(5,8,0),                    // 15 total label
    formatStyle(5,8,164,'right'),          // 16 total currency
    formatStyle(5,8,165,'right'),          // 17 total number
    formatStyle(5,9,0),                    // 18 check label
    formatStyle(6,9,164,'right'),          // 19 check valid currency
    formatStyle(7,10,164,'right'),         // 20 mismatch currency
    formatStyle(6,12,49),                  // 21 selected status
    formatStyle(0,11,49),                  // 22 unselected status
    formatStyle(3,2,0),                    // 23 selected header
    formatStyle(8,6,49),                   // 24 notes
    formatStyle(0,6,166,'right'),          // 25 whole-number counts
  ];
  return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'+
    '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'+
    '<numFmts count="3"><numFmt numFmtId="164" formatCode="&quot;₹&quot; #,##0.00"/>'+
    '<numFmt numFmtId="165" formatCode="#,##0.00"/>'+
    '<numFmt numFmtId="166" formatCode="#,##0"/></numFmts>'+
    `<fonts count="${fonts.length}">${fonts.join('')}</fonts>`+
    `<fills count="${fills.length}">${fills.join('')}</fills>`+
    `<borders count="2"><border><left/><right/><top/><bottom/><diagonal/></border>${border}</borders>`+
    '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>'+
    `<cellXfs count="${formats.length}">${formats.join('')}</cellXfs>`+
    '<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>';
};
const xlsxStringCell = (address: string, value: unknown, style: number): string =>
  `<c r="${address}" t="inlineStr" s="${style}"><is><t xml:space="preserve">${xmlEscape(valueForText(value as string))}</t></is></c>`;
const xlsxNumericCell = (address: string, value: number, style: number): string =>
  `<c r="${address}" s="${style}"><v>${value}</v></c>`;

const rowHeight = (record: VehicleExportRecord, rowIndex: number, columns: number): number => {
  if (record.category === 'title') return rowIndex === 0 ? 37 : 30;
  if (record.category === 'header') return 37;
  if (record.category === 'status') return 28;
  if (record.category === 'section') {
    const textLength = String(record.cells[0] ?? '').length;
    const availableChars = 44 + Math.max(0, columns - 1) * 28;
    return Math.max(28, Math.min(100, 28 + Math.max(0, Math.ceil(textLength / availableChars) - 1) * 18));
  }
  if (record.category === 'metadata') {
    // Metadata values are merged from B through the last vendor column. A two-
    // vendor or single-vendor quotation needs taller route lines than seven vendors.
    const len = String(record.cells[1] ?? '').length;
    const availableChars = Math.max(27, (columns - 1) * 27);
    return Math.max(28, Math.min(115, 10 + Math.max(1, Math.ceil(len / availableChars)) * 18));
  }
  return record.category === 'total' ? 30 : record.category === 'check' ? 28 : 26;
};

const xmlForSheet = (records: VehicleExportRecord[], columns: number) => {
  const merges: string[] = [];
  const headerIndex = records.findIndex(record => record.category === 'header');
  const freezeThrough = headerIndex >= 0 ? Math.min(records.length, headerIndex + 2) : 2;
  const rows = records.map((record, index) => {
    const rowNumber = index + 1;
    const cells: string[] = [];
    const category = record.category || 'normal';
    const singleAcross = category === 'title' || category === 'section';
    const metadata = category === 'metadata';
    if (singleAcross && columns > 1) merges.push(`A${rowNumber}:${asCellName(columns - 1)}${rowNumber}`);
    if (metadata && columns > 2) merges.push(`B${rowNumber}:${asCellName(columns - 1)}${rowNumber}`);
    for (let column = 0; column < columns; column += 1) {
      if (singleAcross && column > 0 || metadata && column > 1) continue;
      if (record.cells[column] === undefined && !metadata && !singleAcross) continue;
      const address = `${asCellName(column)}${rowNumber}`;
      const value = record.cells[column] ?? null;
      const first = column === 0;
      const stripe = index % 2 !== 0;
      let style: number = ST.normalLabel;
      if (category === 'title') style = index === 0 ? ST.title : ST.subtitle;
      else if (category === 'section') style = ST.section;
      else if (category === 'metadata') style = first ? ST.metadataLabel : ST.metadataValue;
      else if (category === 'header') style = first ? ST.headerLabel : ST.headerVendor;
      else if (category === 'status') style = first ? ST.metadataLabel :
        (/^(current vendor|selected)(\b|\s|$)/i.test(String(value ?? ''))) ? ST.selectedStatus : ST.otherStatus;
      else if (category === 'total') style = first ? ST.totalLabel : record.kind === 'number' ? ST.totalNumber : ST.totalMoney;
      else if (category === 'check') style = first ? ST.checkLabel :
        record.cells[0] === 'Reconciliation difference' && typeof value === 'number' && Math.abs(value) >= 0.01
          ? ST.checkMismatch : ST.checkMoney;
      else if (first) style = stripe ? ST.stripeLabel : ST.normalLabel;
      else if (record.kind === 'currency') style = stripe ? ST.stripeMoney : ST.money;
      else if (record.kind === 'number') style = record.cells[0] === 'Rental days' ? ST.integerNumber : (stripe ? ST.stripeNumber : ST.number);
      else style = stripe ? ST.stripeText : ST.text;
      cells.push(typeof value === 'number' && Number.isFinite(value)
        ? xlsxNumericCell(address, value, style)
        : xlsxStringCell(address, value, style));
    }
    return `<row r="${rowNumber}" ht="${rowHeight(record, index, columns)}" customHeight="1">${cells.join('')}</row>`;
  });
  const columnsXml = `<col min="1" max="1" width="45" customWidth="1"/>`+
    Array.from({ length: columns - 1 }, (_, col) => {
      const name = String(records.find(r => r.category === 'header')?.cells[col + 1] ?? '');
      const width = Math.min(38, Math.max(29, Math.ceil(name.length * 1.10 + 6)));
      return `<col min="${col + 2}" max="${col + 2}" width="${width}" customWidth="1"/>`;
    }).join('');
  return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'+
    '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'+
    '<sheetPr><pageSetUpPr fitToPage="1"/></sheetPr>'+
    `<dimension ref="A1:${asCellName(columns - 1)}${records.length}"/>`+
    `<sheetViews><sheetView showGridLines="0" zoomScale="90" workbookViewId="0"><pane xSplit="1" ySplit="${freezeThrough}" topLeftCell="B${freezeThrough + 1}" activePane="bottomRight" state="frozen"/>`+
    `<selection pane="bottomRight" activeCell="B${freezeThrough + 1}" sqref="B${freezeThrough + 1}"/>`+
    '</sheetView></sheetViews>'+
    '<sheetFormatPr defaultRowHeight="23"/>'+
    `<cols>${columnsXml}</cols><sheetData>${rows.join('')}</sheetData>`+
    (merges.length ? `<mergeCells count="${merges.length}">${merges.map(ref=>`<mergeCell ref="${ref}"/>`).join('')}</mergeCells>` : '')+
    '<printOptions horizontalCentered="0"/><pageMargins left="0.25" right="0.25" top="0.5" bottom="0.5" header="0.2" footer="0.2"/>'+
    '<pageSetup paperSize="8" orientation="landscape" fitToWidth="1" fitToHeight="0"/>'+
    '</worksheet>';
};

// ZIP STORE method (not deflated): valid Excel XLSX with no dependency on an
// extra ZIP package. The generated workbook is small (normally < 1 MB).
const crcTable = (() => {
  const table = new Uint32Array(256);
  for (let i=0;i<256;i++) {
    let x=i;
    for (let n=0;n<8;n++) x = (x & 1) ? (0xEDB88320 ^ (x >>> 1)) : (x >>> 1);
    table[i] = x >>> 0;
  }
  return table;
})();
const crc32 = (data: Uint8Array): number => {
  let crc = -1;
  for (const value of data) crc = crcTable[(crc ^ value) & 0xFF] ^ (crc >>> 8);
  return (crc ^ -1) >>> 0;
};
function makeZip(entries: Array<{name: string; content: string}>): Uint8Array {
  const enc = new TextEncoder();
  const parts: Uint8Array[] = [];
  const central: Uint8Array[] = [];
  let offset = 0;
  for (const entry of entries) {
    const name = enc.encode(entry.name);
    const data = enc.encode(entry.content);
    const crc = crc32(data);
    const local = new Uint8Array(30 + name.length);
    const l = new DataView(local.buffer);
    l.setUint32(0,0x04034B50,true);
    l.setUint16(4,20,true); l.setUint16(6,0x0800,true); l.setUint16(8,0,true);
    l.setUint32(14,crc,true); l.setUint32(18,data.length,true); l.setUint32(22,data.length,true);
    l.setUint16(26,name.length,true); local.set(name,30);
    const cd = new Uint8Array(46 + name.length);
    const c = new DataView(cd.buffer);
    c.setUint32(0,0x02014B50,true); c.setUint16(4,20,true); c.setUint16(6,20,true);
    c.setUint16(8,0x0800,true); c.setUint16(10,0,true);
    c.setUint32(16,crc,true); c.setUint32(20,data.length,true); c.setUint32(24,data.length,true);
    c.setUint16(28,name.length,true); c.setUint32(42,offset,true); cd.set(name,46);
    parts.push(local,data); central.push(cd);
    offset += local.length + data.length;
  }
  const dirSize = central.reduce((sum, item) => sum+item.length,0);
  const end = new Uint8Array(22);
  const e = new DataView(end.buffer);
  e.setUint32(0,0x06054B50,true);
  e.setUint16(8,entries.length,true); e.setUint16(10,entries.length,true);
  e.setUint32(12,dirSize,true); e.setUint32(16,offset,true);
  const output = new Uint8Array(offset + dirSize + end.length);
  let cursor = 0;
  for (const part of [...parts,...central,end]) { output.set(part,cursor); cursor += part.length; }
  return output;
}

export function buildStyledVehicleWorkbook(records: VehicleExportRecord[], columns: number): Uint8Array {
  if (!records.length || columns < 2 || columns > 150) throw new Error('No vendors available to export.');
  const ordered = hideAllocatedDailyBreakdownRows(arrangeVehicleExportRecords(records));
  const entries = [
    {name:'[Content_Types].xml',content:'<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'+
      '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'+
      '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'+
      '<Default Extension="xml" ContentType="application/xml"/>'+
      '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>'+
      '<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>'+
      '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>'+
      '</Types>'},
    {name:'_rels/.rels',content:'<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'+
      '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'+
      '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>'+
      '</Relationships>'},
    {name:'xl/workbook.xml',content:'<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'+
      '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">'+
      '<bookViews><workbookView activeTab="0"/></bookViews><sheets><sheet name="Vehicle Comparison" sheetId="1" r:id="rId1"/></sheets></workbook>'},
    {name:'xl/_rels/workbook.xml.rels',content:'<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'+
      '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'+
      '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>'+
      '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>'+
      '</Relationships>'},
    {name:'xl/styles.xml',content:makeStylesXml()},
    {name:'xl/worksheets/sheet1.xml',content:xmlForSheet(ordered,columns)},
  ];
  return makeZip(entries);
}

export function downloadReadableVehicleWorkbook(records: VehicleExportRecord[], columns: number, filename: string): void {
  const bytes = buildStyledVehicleWorkbook(records,columns);
  const blob = new Blob([new Uint8Array(bytes)],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click(); link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 10000);
}

/** V24: One styled Excel workbook with one independently formatted tab for
 * every chosen vehicle category. Each category uses its ORIGINAL comparison
 * records (with the V15-V23 row filtering already applied). */
export type VehicleWorkbookTab = { name: string; records: VehicleExportRecord[]; columns: number };
export function buildStyledVehicleMultiSheetWorkbook(sheets: VehicleWorkbookTab[]): Uint8Array {
  if (!Array.isArray(sheets) || sheets.length === 0 || sheets.length > 100) {
    throw new Error('Select between 1 and 100 vehicle categories to export.');
  }
  const used = new Set<string>();
  const tabs = sheets.map(({ name, records, columns }, index) => {
    if (!records.length || columns < 2 || columns > 150) throw new Error('A selected vehicle has no vendor comparison.');
    const base = `${index + 1} - ${String(name).replace(/[\\\[\]:*?/\x00-\x1F]/g, ' ').trim() || 'Vehicle'}`;
    let suffix = 1;
    let title = base.slice(0, 31).trim();
    while (used.has(title.toLowerCase())) {
      suffix++;
      title = base.slice(0, 31 - String(suffix).length - 1).trim() + '-' + suffix;
    }
    used.add(title.toLowerCase());
    const visibleRecords = hideAllocatedDailyBreakdownRows(arrangeVehicleExportRecords(records))
      .filter(record => !['total purchase cost', 'total selling price'].includes(String(record.cells?.[0] ?? '').trim().toLowerCase()));
    return { title, records: visibleRecords, columns };
  });
  const wsType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml';
  const sheetRel = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet';
  const entries: Array<{ name: string; content: string }> = [
    { name: '[Content_Types].xml', content: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
      '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
      '<Default Extension="xml" ContentType="application/xml"/>' +
      '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' +
      '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>' +
      tabs.map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="${wsType}"/>`).join('') +
      '</Types>' },
    { name: '_rels/.rels', content: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
      '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>' +
      '</Relationships>' },
    { name: 'xl/workbook.xml', content: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">' +
      '<bookViews><workbookView activeTab="0"/></bookViews><sheets>' +
      tabs.map((tab, i) => `<sheet name="${xmlEscape(tab.title)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join('') +
      '</sheets></workbook>' },
    { name: 'xl/_rels/workbook.xml.rels', content: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
      tabs.map((_, i) => `<Relationship Id="rId${i + 1}" Type="${sheetRel}" Target="worksheets/sheet${i + 1}.xml"/>`).join('') +
      `<Relationship Id="rId${tabs.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>` +
      '</Relationships>' },
    { name: 'xl/styles.xml', content: makeStylesXml() },
    ...tabs.map((tab, i) => ({ name: `xl/worksheets/sheet${i + 1}.xml`, content: xmlForSheet(tab.records, tab.columns) })),
  ];
  return makeZip(entries);
}
export function downloadReadableVehicleMultiSheetWorkbook(sheets: VehicleWorkbookTab[], filename: string): void {
  const bytes = buildStyledVehicleMultiSheetWorkbook(sheets);
  const blob = new Blob([new Uint8Array(bytes)], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 10000);
}
