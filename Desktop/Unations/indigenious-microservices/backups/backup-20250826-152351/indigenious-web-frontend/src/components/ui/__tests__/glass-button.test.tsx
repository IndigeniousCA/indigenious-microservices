import { render, screen, fireEvent } from '@testing-library/react'
import { GlassButton } from '../GlassButton'

describe('GlassButton', () => {
  it('renders children correctly', () => {
    render(<GlassButton>Click me</GlassButton>)
    expect(screen.getByText('Click me')).toBeInTheDocument()
  })

  it('handles click events', () => {
    const handleClick = jest.fn()
    render(<GlassButton onClick={handleClick}>Click me</GlassButton>)
    
    fireEvent.click(screen.getByText('Click me'))
    expect(handleClick).toHaveBeenCalledTimes(1)
  })

  it('applies variant classes correctly', () => {
    const { rerender } = render(<GlassButton variant="primary">Primary</GlassButton>)
    const primaryButton = screen.getByText('Primary')
    expect(primaryButton.className).toMatch(/from-emerald-700\/30/)
    expect(primaryButton.className).toMatch(/to-amber-700\/30/)

    rerender(<GlassButton variant="secondary">Secondary</GlassButton>)
    const secondaryButton = screen.getByText('Secondary')
    expect(secondaryButton.className).toMatch(/bg-white\/10/)
  })

  it('can be disabled', () => {
    const handleClick = jest.fn()
    render(
      <GlassButton onClick={handleClick} disabled>
        Disabled
      </GlassButton>
    )
    
    const button = screen.getByText('Disabled')
    expect(button).toBeDisabled()
    
    fireEvent.click(button)
    expect(handleClick).not.toHaveBeenCalled()
  })

  it('applies size classes correctly', () => {
    const { rerender } = render(<GlassButton size="sm">Small</GlassButton>)
    expect(screen.getByText('Small')).toHaveClass('text-sm')
    
    rerender(<GlassButton size="lg">Large</GlassButton>)
    expect(screen.getByText('Large')).toHaveClass('text-lg')
  })

  it('passes through additional props', () => {
    render(
      <GlassButton data-testid="custom-button" aria-label="Custom button">
        Props Test
      </GlassButton>
    )
    
    const button = screen.getByTestId('custom-button')
    expect(button).toHaveAttribute('aria-label', 'Custom button')
  })
})