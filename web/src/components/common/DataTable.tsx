import { ReactNode, useState } from 'react'
import { Link } from 'react-router-dom'

interface Column<T> {
  key: string
  header: string
  render?: (item: T) => ReactNode
  sortable?: boolean
}

interface DataTableProps<T> {
  columns: Column<T>[]
  data: T[]
  keyExtractor: (item: T) => string
  onRowClick?: (item: T) => void
  linkTo?: (item: T) => string
  emptyMessage?: string
  emptyAction?: { label: string; href: string }
  selectable?: boolean
  onSelectionChange?: (selectedIds: string[]) => void
  loading?: boolean
}

export default function DataTable<T>({
  columns,
  data,
  keyExtractor,
  onRowClick,
  linkTo,
  emptyMessage = 'No data found.',
  emptyAction,
  selectable = false,
  onSelectionChange,
  loading = false,
}: DataTableProps<T>) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [sortKey, setSortKey] = useState<string | null>(null)
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')

  const toggleAll = () => {
    if (selectedIds.size === data.length) {
      setSelectedIds(new Set())
      onSelectionChange?.([])
    } else {
      const all = new Set(data.map(keyExtractor))
      setSelectedIds(all)
      onSelectionChange?.([...all])
    }
  }

  const toggleOne = (id: string) => {
    const next = new Set(selectedIds)
    if (next.has(id)) {
      next.delete(id)
    } else {
      next.add(id)
    }
    setSelectedIds(next)
    onSelectionChange?.([...next])
  }

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  if (loading) {
    return (
      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-primary-600" />
        </div>
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
      {selectable && selectedIds.size > 0 && (
        <div className="flex items-center gap-3 border-b border-gray-200 bg-primary-50 px-6 py-2">
          <span className="text-sm font-medium text-primary-700">{selectedIds.size} selected</span>
        </div>
      )}
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            {selectable && (
              <th className="w-10 px-4 py-3">
                <input
                  type="checkbox"
                  className="rounded border-gray-300"
                  checked={data.length > 0 && selectedIds.size === data.length}
                  onChange={toggleAll}
                />
              </th>
            )}
            {columns.map((col) => (
              <th
                key={col.key}
                className={`px-6 py-3 text-left text-xs font-medium uppercase text-gray-500 ${
                  col.sortable ? 'cursor-pointer select-none hover:text-gray-700' : ''
                }`}
                onClick={() => col.sortable && handleSort(col.key)}
              >
                <span className="flex items-center gap-1">
                  {col.header}
                  {col.sortable && sortKey === col.key && (
                    <span>{sortDir === 'asc' ? '\u2191' : '\u2193'}</span>
                  )}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {data.length === 0 ? (
            <tr>
              <td
                className="px-6 py-8 text-center text-sm text-gray-500"
                colSpan={columns.length + (selectable ? 1 : 0)}
              >
                {emptyMessage}
                {emptyAction && (
                  <>
                    {' '}
                    <Link to={emptyAction.href} className="text-primary-600 hover:underline">
                      {emptyAction.label}
                    </Link>
                  </>
                )}
              </td>
            </tr>
          ) : (
            data.map((item) => {
              const id = keyExtractor(item)
              const RowWrapper = linkTo
                ? ({ children }: { children: ReactNode }) => (
                    <tr
                      key={id}
                      className="cursor-pointer hover:bg-gray-50"
                      onClick={() => onRowClick?.(item)}
                    >
                      {children}
                    </tr>
                  )
                : ({ children }: { children: ReactNode }) => (
                    <tr key={id} className="hover:bg-gray-50">
                      {children}
                    </tr>
                  )

              return (
                <RowWrapper key={id}>
                  {selectable && (
                    <td className="w-10 px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        className="rounded border-gray-300"
                        checked={selectedIds.has(id)}
                        onChange={() => toggleOne(id)}
                      />
                    </td>
                  )}
                  {columns.map((col) => (
                    <td key={col.key} className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                      {col.render
                        ? col.render(item)
                        : String((item as Record<string, unknown>)[col.key] ?? '')}
                    </td>
                  ))}
                </RowWrapper>
              )
            })
          )}
        </tbody>
      </table>
    </div>
  )
}
