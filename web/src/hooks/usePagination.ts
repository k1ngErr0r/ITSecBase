import { useState, useCallback } from 'react'

interface UsePaginationOptions {
  pageSize?: number
}

interface UsePaginationResult {
  currentPage: number
  pageSize: number
  after: string | null
  cursors: string[]
  goToNextPage: (endCursor: string) => void
  goToPreviousPage: () => void
  reset: () => void
}

export function usePagination(options: UsePaginationOptions = {}): UsePaginationResult {
  const pageSize = options.pageSize || 25
  const [currentPage, setCurrentPage] = useState(1)
  const [cursors, setCursors] = useState<string[]>([])

  const after = cursors.length > 0 ? cursors[cursors.length - 1] : null

  const goToNextPage = useCallback((endCursor: string) => {
    setCursors((prev) => [...prev, endCursor])
    setCurrentPage((prev) => prev + 1)
  }, [])

  const goToPreviousPage = useCallback(() => {
    setCursors((prev) => prev.slice(0, -1))
    setCurrentPage((prev) => Math.max(1, prev - 1))
  }, [])

  const reset = useCallback(() => {
    setCursors([])
    setCurrentPage(1)
  }, [])

  return {
    currentPage,
    pageSize,
    after,
    cursors,
    goToNextPage,
    goToPreviousPage,
    reset,
  }
}
