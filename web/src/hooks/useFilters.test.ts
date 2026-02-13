import { renderHook, act } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { useFilters } from './useFilters'

describe('useFilters', () => {
  it('initializes with provided filters', () => {
    const { result } = renderHook(() =>
      useFilters({ status: '', severity: '' }),
    )
    expect(result.current.filters).toEqual({ status: '', severity: '' })
    expect(result.current.hasActiveFilters).toBe(false)
  })

  it('updates a single filter', () => {
    const { result } = renderHook(() =>
      useFilters({ status: '', severity: '' }),
    )

    act(() => {
      result.current.updateFilter('status', 'new')
    })

    expect(result.current.filters.status).toBe('new')
    expect(result.current.filters.severity).toBe('')
    expect(result.current.hasActiveFilters).toBe(true)
  })

  it('clears all filters back to initial state', () => {
    const { result } = renderHook(() =>
      useFilters({ status: '', severity: '' }),
    )

    act(() => {
      result.current.updateFilter('status', 'new')
      result.current.updateFilter('severity', 'high')
    })

    expect(result.current.hasActiveFilters).toBe(true)

    act(() => {
      result.current.clearFilters()
    })

    expect(result.current.filters).toEqual({ status: '', severity: '' })
    expect(result.current.hasActiveFilters).toBe(false)
  })

  it('hasActiveFilters is true when any filter is non-empty', () => {
    const { result } = renderHook(() =>
      useFilters({ a: '', b: '', c: '' }),
    )

    expect(result.current.hasActiveFilters).toBe(false)

    act(() => {
      result.current.updateFilter('b', 'value')
    })

    expect(result.current.hasActiveFilters).toBe(true)
  })
})
