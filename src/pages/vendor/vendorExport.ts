/* eslint-disable @typescript-eslint/no-explicit-any */

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export type ExportColumn<T> = {
  key: keyof T | string;
  header: string;
  getValue?: (row: T) => string | number | null | undefined;
};

function normalizeCell(value: any): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "boolean") return value ? "Active" : "Inactive";
  return String(value);
}

function buildAOA<T>(columns: ExportColumn<T>[], rows: T[]) {
  const headers = columns.map((column) => column.header);
  const data = rows.map((row) =>
    columns.map((column) =>
      normalizeCell(column.getValue ? column.getValue(row) : (row as any)[column.key as any]),
    ),
  );
  return { headers, data };
}

export async function copyToClipboard<T>(columns: ExportColumn<T>[], rows: T[]) {
  const { headers, data } = buildAOA(columns, rows);
  const tsv = [headers, ...data].map((row) => row.join("\t")).join("\n");
  await navigator.clipboard.writeText(tsv);
}

export function downloadCSV<T>(columns: ExportColumn<T>[], rows: T[], filename: string) {
  const { headers, data } = buildAOA(columns, rows);
  const lines = [headers, ...data].map((row) =>
    row
      .map((cell) => {
        const needsQuote = /[",\n]/.test(cell);
        const escaped = cell.replace(/"/g, '""');
        return needsQuote ? `"${escaped}"` : escaped;
      })
      .join(","),
  );
  const csv = "\uFEFF" + lines.join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export async function downloadExcel<T>(
  columns: ExportColumn<T>[],
  rows: T[],
  filename: string,
  sheetName = "Vendors",
) {
  try {
    const XLSX = await import("xlsx");
    const { headers, data } = buildAOA(columns, rows);
    const worksheet = XLSX.utils.aoa_to_sheet([headers, ...data]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
    XLSX.writeFile(workbook, filename);
  } catch {
    const safeName = filename.toLowerCase().endsWith(".xlsx")
      ? filename.replace(/\.xlsx$/i, ".csv")
      : filename + ".csv";
    downloadCSV(columns, rows, safeName);
  }
}

export function downloadPDF<T>(columns: ExportColumn<T>[], rows: T[], filename: string) {
  const { headers, data } = buildAOA(columns, rows);
  const doc = new jsPDF("p", "pt", "a4");
  autoTable(doc, {
    head: [headers],
    body: data,
    styles: { fontSize: 8 },
    headStyles: { fillColor: [110, 94, 254] },
    margin: { top: 30, left: 30, right: 30 },
  });
  doc.save(filename);
}

export function todaySuffix() {
  return new Date().toISOString().slice(0, 10);
}
