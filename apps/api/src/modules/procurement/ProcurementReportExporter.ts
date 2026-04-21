type ExportRow = Record<string, unknown>;

function escapeCsvValue(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }

  const stringValue =
    value instanceof Date ? value.toISOString() : String(value);

  if (
    stringValue.includes(',') ||
    stringValue.includes('"') ||
    stringValue.includes('\n')
  ) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }

  return stringValue;
}

export class ProcurementReportExporter {
  static toCsv(rows: ExportRow[]): string {
    if (!rows.length) {
      return '';
    }

    const headers = Object.keys(rows[0]);
    const headerLine = headers.map(escapeCsvValue).join(',');

    const lines = rows.map((row) =>
      headers.map((header) => escapeCsvValue(row[header])).join(','),
    );

    return [headerLine, ...lines].join('\n');
  }

  static toJson(data: unknown): string {
    return JSON.stringify(data, null, 2);
  }

  static makeFilename(prefix: string, extension: 'csv' | 'json'): string {
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    return `${prefix}-${stamp}.${extension}`;
  }
}