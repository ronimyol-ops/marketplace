/**
 * Small CSV helper for admin exports.
 *
 * - Values are always quoted.
 * - Arrays/objects are JSON-stringified.
 */

export type CsvColumn<T> = {
  key: keyof T | string;
  label: string;
  value?: (row: T) => any;
};

function normalizeValue(value: any): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (value instanceof Date) return value.toISOString();

  // Arrays / objects
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function csvEscape(raw: string): string {
  // Always quote; escape quotes by doubling
  return `"${raw.replace(/"/g, '""')}"`;
}

export function buildCsv<T>(rows: T[], columns: CsvColumn<T>[]): string {
  const header = columns.map((c) => csvEscape(c.label)).join(',');

  const lines = rows.map((row) => {
    const cells = columns.map((c) => {
      const v = c.value ? c.value(row) : (row as any)?.[c.key as any];
      return csvEscape(normalizeValue(v));
    });
    return cells.join(',');
  });

  // UTF-8 BOM so Excel opens Bangla/Unicode correctly
  return `\uFEFF${header}\n${lines.join('\n')}`;
}

export function downloadTextFile(filename: string, content: string, mime = 'text/plain;charset=utf-8') {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();

  // Cleanup
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

export function downloadCsv<T>(filename: string, rows: T[], columns: CsvColumn<T>[]) {
  const csv = buildCsv(rows, columns);
  downloadTextFile(filename, csv, 'text/csv;charset=utf-8');
}
