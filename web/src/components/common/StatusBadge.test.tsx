import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import StatusBadge from './StatusBadge'

describe('StatusBadge', () => {
  it('renders the status label with title case', () => {
    render(<StatusBadge status="in_progress" />)
    expect(screen.getByText('In Progress')).toBeInTheDocument()
  })

  it('renders simple status labels', () => {
    render(<StatusBadge status="active" />)
    expect(screen.getByText('Active')).toBeInTheDocument()
  })

  it('applies correct color class for known status', () => {
    const { container } = render(<StatusBadge status="critical" variant="severity" />)
    const badge = container.querySelector('span')
    expect(badge).toHaveClass('bg-red-100')
  })

  it('falls back to gray for unknown status', () => {
    const { container } = render(<StatusBadge status="unknown_status" />)
    const badge = container.querySelector('span')
    expect(badge).toHaveClass('bg-gray-100')
  })

  it('supports severity variant', () => {
    const { container } = render(<StatusBadge status="high" variant="severity" />)
    const badge = container.querySelector('span')
    expect(badge).toHaveClass('bg-orange-100')
  })

  it('supports impact variant', () => {
    const { container } = render(<StatusBadge status="low" variant="impact" />)
    const badge = container.querySelector('span')
    expect(badge).toHaveClass('bg-green-100')
  })
})
