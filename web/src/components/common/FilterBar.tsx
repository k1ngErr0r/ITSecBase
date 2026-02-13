import { ReactNode } from 'react'

interface FilterOption {
  value: string
  label: string
}

interface FilterField {
  key: string
  label: string
  type: 'select' | 'search'
  options?: FilterOption[]
  placeholder?: string
}

interface FilterBarProps {
  filters: FilterField[]
  values: Record<string, string>
  onChange: (key: string, value: string) => void
  onClear?: () => void
  actions?: ReactNode
}

export default function FilterBar({ filters, values, onChange, onClear, actions }: FilterBarProps) {
  const hasActiveFilters = Object.values(values).some((v) => v !== '')

  return (
    <div className="mb-4 flex flex-wrap items-center gap-3">
      {filters.map((filter) => {
        if (filter.type === 'select') {
          return (
            <select
              key={filter.key}
              value={values[filter.key] || ''}
              onChange={(e) => onChange(filter.key, e.target.value)}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="">{filter.label}</option>
              {filter.options?.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          )
        }

        return (
          <input
            key={filter.key}
            type="text"
            value={values[filter.key] || ''}
            onChange={(e) => onChange(filter.key, e.target.value)}
            placeholder={filter.placeholder || `Search...`}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
        )
      })}

      {hasActiveFilters && onClear && (
        <button
          onClick={onClear}
          className="text-sm font-medium text-gray-500 hover:text-gray-700"
        >
          Clear filters
        </button>
      )}

      {actions && <div className="ml-auto flex gap-3">{actions}</div>}
    </div>
  )
}
