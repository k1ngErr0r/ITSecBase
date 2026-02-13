import { useState, useCallback } from 'react'

export function useFilters<T extends Record<string, string>>(
  initialFilters: T,
) {
  const [filters, setFilters] = useState<T>(initialFilters)

  const updateFilter = useCallback(
    (key: keyof T, value: string) => {
      setFilters((prev) => ({ ...prev, [key]: value }))
    },
    [],
  )

  const clearFilters = useCallback(() => {
    setFilters(initialFilters)
  }, [initialFilters])

  const hasActiveFilters = Object.values(filters).some((v) => v !== '')

  return { filters, updateFilter, clearFilters, hasActiveFilters }
}
