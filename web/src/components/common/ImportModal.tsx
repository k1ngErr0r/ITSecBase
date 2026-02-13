import { useState, useCallback } from 'react'
import Modal from './Modal'
import FileUpload from './FileUpload'
import { parseCsv } from '../../utils/csv'

interface FieldDef {
  key: string
  label: string
  required?: boolean
}

interface ImportModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  fields: FieldDef[]
  onImport: (rows: Record<string, string>[]) => void
  importing?: boolean
}

type Step = 'upload' | 'map' | 'preview'

export default function ImportModal({
  isOpen,
  onClose,
  title,
  fields,
  onImport,
  importing = false,
}: ImportModalProps) {
  const [step, setStep] = useState<Step>('upload')
  const [csvHeaders, setCsvHeaders] = useState<string[]>([])
  const [csvRows, setCsvRows] = useState<string[][]>([])
  const [mapping, setMapping] = useState<Record<string, string>>({})
  const [error, setError] = useState('')

  const reset = useCallback(() => {
    setStep('upload')
    setCsvHeaders([])
    setCsvRows([])
    setMapping({})
    setError('')
  }, [])

  const handleClose = () => {
    reset()
    onClose()
  }

  const handleFile = (file: File) => {
    setError('')
    const reader = new FileReader()
    reader.onload = (e) => {
      const text = e.target?.result as string
      if (!text) {
        setError('Could not read file.')
        return
      }

      const rows = parseCsv(text)
      if (rows.length < 2) {
        setError('CSV must have at least a header row and one data row.')
        return
      }

      const headers = rows[0]
      setCsvHeaders(headers)
      setCsvRows(rows.slice(1))

      // Auto-map columns by fuzzy matching
      const autoMapping: Record<string, string> = {}
      for (const header of headers) {
        const normalized = header.toLowerCase().replace(/[^a-z0-9]/g, '')
        const match = fields.find((f) => {
          const fieldNorm = f.key.toLowerCase().replace(/[^a-z0-9]/g, '')
          const labelNorm = f.label.toLowerCase().replace(/[^a-z0-9]/g, '')
          return fieldNorm === normalized || labelNorm === normalized
        })
        if (match) {
          autoMapping[header] = match.key
        }
      }
      setMapping(autoMapping)
      setStep('map')
    }
    reader.readAsText(file)
  }

  const handleMapChange = (csvCol: string, targetField: string) => {
    setMapping((prev) => ({
      ...prev,
      [csvCol]: targetField,
    }))
  }

  const validateMapping = (): string[] => {
    const errors: string[] = []
    const requiredFields = fields.filter((f) => f.required)
    const mappedTargets = new Set(Object.values(mapping).filter(Boolean))

    for (const rf of requiredFields) {
      if (!mappedTargets.has(rf.key)) {
        errors.push(`Required field "${rf.label}" is not mapped.`)
      }
    }
    return errors
  }

  const handleProceedToPreview = () => {
    const errors = validateMapping()
    if (errors.length > 0) {
      setError(errors.join(' '))
      return
    }
    setError('')
    setStep('preview')
  }

  const buildMappedRows = (): Record<string, string>[] => {
    return csvRows.map((row) => {
      const obj: Record<string, string> = {}
      for (const [csvCol, targetField] of Object.entries(mapping)) {
        if (!targetField) continue
        const colIndex = csvHeaders.indexOf(csvCol)
        if (colIndex >= 0) {
          obj[targetField] = row[colIndex] || ''
        }
      }
      return obj
    })
  }

  const handleImport = () => {
    onImport(buildMappedRows())
  }

  const previewRows = step === 'preview' ? buildMappedRows().slice(0, 5) : []
  const mappedFieldKeys = Object.values(mapping).filter(Boolean)

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={title} size="lg">
      {error && (
        <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Step 1: Upload */}
      {step === 'upload' && (
        <div>
          <p className="mb-4 text-sm text-gray-500">
            Upload a CSV file. The first row should contain column headers.
          </p>
          <FileUpload
            onUpload={handleFile}
            accept=".csv"
            maxSizeMB={5}
            label="Choose CSV file"
          />
        </div>
      )}

      {/* Step 2: Column Mapping */}
      {step === 'map' && (
        <div>
          <p className="mb-4 text-sm text-gray-500">
            Map CSV columns to fields. {csvRows.length} data row
            {csvRows.length !== 1 ? 's' : ''} detected.
          </p>
          <div className="max-h-80 space-y-3 overflow-y-auto">
            {csvHeaders.map((header) => (
              <div key={header} className="flex items-center gap-3">
                <span className="w-1/3 truncate text-sm font-medium text-gray-700">
                  {header}
                </span>
                <span className="text-gray-400">&rarr;</span>
                <select
                  value={mapping[header] || ''}
                  onChange={(e) => handleMapChange(header, e.target.value)}
                  className="w-1/2 rounded-lg border border-gray-300 px-3 py-1.5 text-sm"
                >
                  <option value="">-- Skip --</option>
                  {fields.map((f) => (
                    <option key={f.key} value={f.key}>
                      {f.label}
                      {f.required ? ' *' : ''}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>
          <div className="mt-4 flex justify-end gap-3">
            <button
              onClick={reset}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Back
            </button>
            <button
              onClick={handleProceedToPreview}
              className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700"
            >
              Preview
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Preview & Confirm */}
      {step === 'preview' && (
        <div>
          <p className="mb-4 text-sm text-gray-500">
            Preview of first {Math.min(5, csvRows.length)} rows (
            {csvRows.length} total). Confirm to import.
          </p>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  {mappedFieldKeys.map((key) => {
                    const f = fields.find((ff) => ff.key === key)
                    return (
                      <th
                        key={key}
                        className="px-3 py-2 text-left text-xs font-medium uppercase text-gray-500"
                      >
                        {f?.label || key}
                      </th>
                    )
                  })}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {previewRows.map((row, i) => (
                  <tr key={i}>
                    {mappedFieldKeys.map((key) => (
                      <td key={key} className="px-3 py-2 text-gray-700">
                        {row[key] || '--'}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-4 flex justify-end gap-3">
            <button
              onClick={() => setStep('map')}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Back
            </button>
            <button
              onClick={handleImport}
              disabled={importing}
              className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-50"
            >
              {importing
                ? `Importing ${csvRows.length} rows...`
                : `Import ${csvRows.length} rows`}
            </button>
          </div>
        </div>
      )}
    </Modal>
  )
}
