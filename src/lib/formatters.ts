/**
 * Shared formatting utilities for cell values across the application.
 * Handles pt-BR locale: dates DD/MM/YYYY, currency R$, time HH:MM.
 */

export const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

/**
 * Parse a date value that may be:
 * - ISO string (YYYY-MM-DD)
 * - DD/MM/YYYY string
 * - Excel serial number (e.g. 46055)
 * - Plain number string
 * Returns a Date object or null if unparseable.
 */
export function parseFlexibleDate(value: string): Date | null {
  if (!value) return null;
  const trimmed = value.trim();

  // Check if it's a number (Excel serial date)
  const num = Number(trimmed);
  if (!isNaN(num) && num > 1 && num < 200000 && /^\d+$/.test(trimmed)) {
    // Excel serial date: days since 1899-12-30
    const excelEpoch = new Date(1899, 11, 30);
    const date = new Date(excelEpoch.getTime() + num * 86400000);
    if (!isNaN(date.getTime()) && date.getFullYear() >= 1900 && date.getFullYear() <= 2200) {
      return date;
    }
  }

  // Try DD/MM/YYYY
  const brMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (brMatch) {
    const d = new Date(Number(brMatch[3]), Number(brMatch[2]) - 1, Number(brMatch[1]));
    if (!isNaN(d.getTime())) return d;
  }

  // Try DD/MM/YY
  const brShortMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2})$/);
  if (brShortMatch) {
    const year = Number(brShortMatch[3]) + 2000;
    const d = new Date(year, Number(brShortMatch[2]) - 1, Number(brShortMatch[1]));
    if (!isNaN(d.getTime())) return d;
  }

  // Try ISO date-only format YYYY-MM-DD (avoid UTC interpretation)
  const isoMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) {
    const d2 = new Date(Number(isoMatch[1]), Number(isoMatch[2]) - 1, Number(isoMatch[3]));
    if (!isNaN(d2.getTime())) return d2;
  }

  // Try ISO datetime or other parseable formats
  const d = new Date(trimmed);
  if (!isNaN(d.getTime()) && d.getFullYear() >= 1900 && d.getFullYear() <= 2200) {
    return d;
  }

  return null;
}

export function formatDate(value: string): string {
  const d = parseFlexibleDate(value);
  if (!d) return value;
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}

/**
 * Format a time value to HH:MM.
 * Handles: "HH:MM:SS", "HH:MM", plain number (hours), decimal hours, etc.
 */
export function formatTime(value: string): string {
  if (!value) return '';
  const trimmed = value.trim();

  // Already HH:MM or HH:MM:SS
  if (/^\d{1,2}:\d{2}/.test(trimmed)) {
    const parts = trimmed.split(':');
    return `${parts[0].padStart(2, '0')}:${parts[1]}`;
  }

  // Plain number — treat as hours (e.g. "8" → "08:00", "14" → "14:00")
  const num = Number(trimmed);
  if (!isNaN(num) && num >= 0 && num <= 24) {
    const hours = Math.floor(num);
    const minutes = Math.round((num - hours) * 60);
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  }

  return trimmed;
}

/**
 * Universal cell value formatter used across Consulta, Relatórios, DynamicSpreadsheet, etc.
 */
export function formatDisplayValue(
  value: string | undefined,
  columnType: string
): string {
  if (!value) return '';
  switch (columnType) {
    case 'currency': {
      const num = parseFloat(value);
      return isNaN(num) ? value : formatCurrency(num);
    }
    case 'date':
      return formatDate(value);
    case 'time':
      return formatTime(value);
    default:
      return value;
  }
}
