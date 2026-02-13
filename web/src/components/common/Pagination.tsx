interface PaginationProps {
  hasNextPage: boolean
  hasPreviousPage: boolean
  totalCount: number
  pageSize: number
  currentPage: number
  onNextPage: () => void
  onPreviousPage: () => void
}

export default function Pagination({
  hasNextPage,
  hasPreviousPage,
  totalCount,
  pageSize,
  currentPage,
  onNextPage,
  onPreviousPage,
}: PaginationProps) {
  const start = (currentPage - 1) * pageSize + 1
  const end = Math.min(currentPage * pageSize, totalCount)

  if (totalCount === 0) return null

  return (
    <div className="flex items-center justify-between border-t border-gray-200 bg-white px-6 py-3">
      <div className="text-sm text-gray-700">
        Showing <span className="font-medium">{start}</span> to{' '}
        <span className="font-medium">{end}</span> of{' '}
        <span className="font-medium">{totalCount}</span> results
      </div>
      <div className="flex gap-2">
        <button
          onClick={onPreviousPage}
          disabled={!hasPreviousPage}
          className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Previous
        </button>
        <button
          onClick={onNextPage}
          disabled={!hasNextPage}
          className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Next
        </button>
      </div>
    </div>
  )
}
