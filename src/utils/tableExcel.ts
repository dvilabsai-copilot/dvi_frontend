export type ExcelColumn<T> = {
  header: string;
  value: (row: T, index: number) => unknown;
  width?: number;
};

type PagedResult<T> = {
  rows: T[];
  total: number;
};

function sanitizeCellValue(
  value: unknown,
): string | number | boolean {
  if (value === null || value === undefined) {
    return "";
  }

  if (
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return value;
  }

  const text = String(value);

  // Prevent Excel formula injection from user-entered values.
  return /^[=+\-@]/.test(text)
    ? `'${text}`
    : text;
}

export async function downloadTableExcel<T>({
  fileName,
  sheetName,
  rows,
  columns,
}: {
  fileName: string;
  sheetName: string;
  rows: T[];
  columns: ExcelColumn<T>[];
}) {
  const XLSX = await import("xlsx");

  const tableData = [
    columns.map((column) => column.header),
    ...rows.map((row, rowIndex) =>
      columns.map((column) =>
        sanitizeCellValue(
          column.value(row, rowIndex),
        ),
      ),
    ),
  ];

  const worksheet =
    XLSX.utils.aoa_to_sheet(tableData);

  worksheet["!cols"] = columns.map(
    (column) => ({
      wch:
        column.width ??
        Math.max(column.header.length + 2, 12),
    }),
  );

  const workbook =
    XLSX.utils.book_new();

  const safeSheetName =
    sheetName
      .replace(/[\\/?*[\]:]/g, " ")
      .trim()
      .slice(0, 31) || "Data";

  XLSX.utils.book_append_sheet(
    workbook,
    worksheet,
    safeSheetName,
  );

  const normalizedFileName =
    fileName.toLowerCase().endsWith(".xlsx")
      ? fileName
      : `${fileName}.xlsx`;

  XLSX.writeFile(
    workbook,
    normalizedFileName,
    {
      compression: true,
    },
  );
}

export async function collectPagedRows<T>(
  fetchPage: (
    page: number,
    pageSize: number,
  ) => Promise<PagedResult<T>>,
  pageSize = 500,
): Promise<T[]> {
  const collected: T[] = [];

  let page = 1;
  let total = Number.POSITIVE_INFINITY;

  while (collected.length < total) {
    const result =
      await fetchPage(page, pageSize);

    const batch =
      Array.isArray(result.rows)
        ? result.rows
        : [];

    total = Number.isFinite(
      Number(result.total),
    )
      ? Number(result.total)
      : collected.length + batch.length;

    if (batch.length === 0) {
      break;
    }

    collected.push(...batch);
    page += 1;
  }

  return Number.isFinite(total)
    ? collected.slice(0, total)
    : collected;
}