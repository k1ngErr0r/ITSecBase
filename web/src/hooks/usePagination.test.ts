import { renderHook, act } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { usePagination } from './usePagination'

describe('usePagination', () => {
  it('initializes at page 1 with default page size', () => {
    const { result } = renderHook(() => usePagination())
    expect(result.current.currentPage).toBe(1)
    expect(result.current.pageSize).toBe(25)
    expect(result.current.after).toBeNull()
    expect(result.current.cursors).toEqual([])
  })

  it('uses custom page size', () => {
    const { result } = renderHook(() => usePagination({ pageSize: 10 }))
    expect(result.current.pageSize).toBe(10)
  })

  it('navigates to next page', () => {
    const { result } = renderHook(() => usePagination())

    act(() => {
      result.current.goToNextPage('cursor-1')
    })

    expect(result.current.currentPage).toBe(2)
    expect(result.current.after).toBe('cursor-1')
    expect(result.current.cursors).toEqual(['cursor-1'])
  })

  it('navigates through multiple pages', () => {
    const { result } = renderHook(() => usePagination())

    act(() => {
      result.current.goToNextPage('cursor-1')
    })
    act(() => {
      result.current.goToNextPage('cursor-2')
    })

    expect(result.current.currentPage).toBe(3)
    expect(result.current.after).toBe('cursor-2')
    expect(result.current.cursors).toEqual(['cursor-1', 'cursor-2'])
  })

  it('navigates back to previous page', () => {
    const { result } = renderHook(() => usePagination())

    act(() => {
      result.current.goToNextPage('cursor-1')
    })
    act(() => {
      result.current.goToNextPage('cursor-2')
    })
    act(() => {
      result.current.goToPreviousPage()
    })

    expect(result.current.currentPage).toBe(2)
    expect(result.current.after).toBe('cursor-1')
    expect(result.current.cursors).toEqual(['cursor-1'])
  })

  it('does not go below page 1', () => {
    const { result } = renderHook(() => usePagination())

    act(() => {
      result.current.goToPreviousPage()
    })

    expect(result.current.currentPage).toBe(1)
    expect(result.current.after).toBeNull()
  })

  it('resets to page 1', () => {
    const { result } = renderHook(() => usePagination())

    act(() => {
      result.current.goToNextPage('cursor-1')
    })
    act(() => {
      result.current.goToNextPage('cursor-2')
    })
    act(() => {
      result.current.reset()
    })

    expect(result.current.currentPage).toBe(1)
    expect(result.current.after).toBeNull()
    expect(result.current.cursors).toEqual([])
  })
})
