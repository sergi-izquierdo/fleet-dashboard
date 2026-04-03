/**
 * Escapes a CSV field value, wrapping in quotes if needed.
 */
function escapeCsvField(val: string): string {
  if (val.includes(",") || val.includes('"') || val.includes("\n")) {
    return `"${val.replace(/"/g, '""')}"`;
  }
  return val;
}

/**
 * Builds a CSV string from headers and rows.
 */
export function buildCsvString(headers: string[], rows: string[][]): string {
  const lines = [
    headers.map(escapeCsvField).join(","),
    ...rows.map((row) => row.map(escapeCsvField).join(",")),
  ];
  return lines.join("\n");
}

/**
 * Triggers a browser file download for the given CSV content.
 */
export function downloadCsv(filename: string, content: string): void {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Returns today's date as YYYY-MM-DD.
 */
export function todayDateString(): string {
  return new Date().toISOString().split("T")[0];
}
