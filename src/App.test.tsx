import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from './App'

describe('App', () => {
  it('renders the MenuGram title', () => {
    render(<App />)
    expect(screen.getByRole('heading', { name: /MenuGram/i })).toBeInTheDocument()
  })

  it('increments the counter when the button is clicked', async () => {
    const user = userEvent.setup()
    render(<App />)
    const button = screen.getByRole('button', { name: /Contador/i })
    await user.click(button)
    expect(button).toHaveTextContent('Contador: 1')
  })
})
