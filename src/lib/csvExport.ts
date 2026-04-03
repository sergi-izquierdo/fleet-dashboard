/**
 * Escapes a cell value for CSV output.
 * Wraps in quotes if it contains commas, quotes, or newlines.
 */
function escapeCell(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";
  const str = String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Builds a CSV string from headers and rows.
 */
export function buildCSV(
  headers: string[],
  rows: Array<Array<string | number | null | undefined>>,
): string {
  const headerLine = headers.map(escapeCell).join(",");
  const dataLines = rows.map((row) => row.map(escapeCell).join(","));
  return [headerLine, ...dataLines].join("\n");
}

/**
 * Triggers a browser download of a CSV file.
 */
export function downloadCSV(filename: string, csv: string): void {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Returns today's date formatted as YYYY-MM-DD.
 */
export function todayDateString(): string {
  return new Date().toISOString().slice(0, 10);
}
