/**
 * CSV parsing and generation utilities for import/export.
 */

/**
 * Parse a CSV string into an array of row arrays.
 * Handles quoted fields with commas and newlines.
 */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let inQuotes = false

  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    const next = text[i + 1]

    if (inQuotes) {
      if (ch === '"' && next === '"') {
        field += '"'
        i++
      } else if (ch === '"') {
        inQuotes = false
      } else {
        field += ch
      }
    } else {
      if (ch === '"') {
        inQuotes = true
      } else if (ch === ',') {
        row.push(field.trim())
        field = ''
      } else if (ch === '\n' || (ch === '\r' && next === '\n')) {
        row.push(field.trim())
        if (row.some((f) => f !== '')) rows.push(row)
        row = []
        field = ''
        if (ch === '\r') i++
      } else {
        field += ch
      }
    }
  }

  // Last field
  row.push(field.trim())
  if (row.some((f) => f !== '')) rows.push(row)

  return rows
}

/**
 * Convert an array of objects to a CSV string.
 */
export function generateCsv(
  headers: string[],
  rows: Record<string, any>[],
): string {
  const escapeField = (val: any): string => {
    const str = val == null ? '' : String(val)
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`
    }
    return str
  }

  const lines = [headers.map(escapeField).join(',')]
  for (const row of rows) {
    lines.push(headers.map((h) => escapeField(row[h])).join(','))
  }
  return lines.join('\n')
}

/**
 * Trigger a file download in the browser.
 */
export function downloadFile(
  content: string,
  filename: string,
  mimeType = 'text/csv',
) {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

/**
 * Convert parsed CSV rows (with header row) into objects.
 * Uses a column mapping to map CSV headers → target field names.
 */
export function mapCsvToObjects(
  rows: string[][],
  mapping: Record<string, string>,
): Record<string, string>[] {
  if (rows.length < 2) return []
  const headers = rows[0]
  const dataRows = rows.slice(1)

  return dataRows.map((row) => {
    const obj: Record<string, string> = {}
    for (const [csvCol, targetField] of Object.entries(mapping)) {
      const colIndex = headers.indexOf(csvCol)
      if (colIndex >= 0 && targetField) {
        obj[targetField] = row[colIndex] || ''
      }
    }
    return obj
  })
}
