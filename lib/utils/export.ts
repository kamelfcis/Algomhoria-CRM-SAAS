/**
 * Utility functions for exporting data to CSV format
 */

export interface ExportColumn {
  key: string
  header: string
  accessor?: (row: any) => any
}

/**
 * Converts data to CSV format
 */
export function convertToCSV<T extends Record<string, any>>(
  data: T[],
  columns: ExportColumn[]
): string {
  // Create header row
  const headers = columns.map((col) => escapeCSVValue(col.header))
  const headerRow = headers.join(',')

  // Create data rows
  const dataRows = data.map((row) => {
    return columns
      .map((col) => {
        const value = col.accessor ? col.accessor(row) : row[col.key]
        return escapeCSVValue(value)
      })
      .join(',')
  })

  // Combine header and data rows
  return [headerRow, ...dataRows].join('\n')
}

/**
 * Escapes CSV values (handles commas, quotes, and newlines)
 */
function escapeCSVValue(value: any): string {
  if (value == null || value === undefined) {
    return ''
  }

  const stringValue = String(value)

  // If value contains comma, quote, or newline, wrap in quotes and escape quotes
  if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
    return `"${stringValue.replace(/"/g, '""')}"`
  }

  return stringValue
}

/**
 * Downloads CSV data as a file
 */
export function downloadCSV(csvContent: string, filename: string): void {
  // Add BOM for UTF-8 to support Arabic characters in Excel
  const BOM = '\uFEFF'
  const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)

  link.setAttribute('href', url)
  link.setAttribute('download', filename)
  link.style.visibility = 'hidden'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

/**
 * Exports data to CSV file
 */
export function exportToCSV<T extends Record<string, any>>(
  data: T[],
  columns: ExportColumn[],
  filename: string
): void {
  const csvContent = convertToCSV(data, columns)
  downloadCSV(csvContent, filename)
}

