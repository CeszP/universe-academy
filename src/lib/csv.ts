export type CsvColumn = { label: string; key: string };

function escapeCsvCell(value: unknown) {
  if (value === null || value === undefined) {
    return "";
  }

  const text = String(value);
  const escaped = text.replace(/"/g, '""');
  return `"${escaped}"`;
}

export function objectsToCsv(
  rows: Record<string, unknown>[],
  columns: CsvColumn[],
) {
  const header = columns.map((column) => escapeCsvCell(column.label)).join(",");
  const lines = rows.map((row) =>
    columns.map((column) => escapeCsvCell(row[column.key])).join(","),
  );
  return [header, ...lines].join("\r\n");
}

export function downloadCsv(
  filename: string,
  rows: Record<string, unknown>[],
  columns: CsvColumn[],
) {
  const csv = objectsToCsv(rows, columns);
  // BOM para que Excel abra el archivo reconociendo UTF-8 correctamente
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.style.display = "none";
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}
