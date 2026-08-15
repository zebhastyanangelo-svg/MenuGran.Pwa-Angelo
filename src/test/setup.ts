import '@testing-library/jest-dom/vitest'
import { vi } from 'vitest'
import React from 'react'

const mockReact = React

// Vercel Analytics registra visitas y page views en producción.
// En tests se mockea para no intentar llamar a la API ni romper el render.
vi.mock('@vercel/analytics/react', () => ({
  Analytics: () =>
    mockReact.createElement('div', { 'data-testid': 'vercel-analytics' }),
}))

if (typeof HTMLDialogElement !== 'undefined') {
  if (!HTMLDialogElement.prototype.showModal) {
    HTMLDialogElement.prototype.showModal = function showModal() {
      this.open = true
    }
  }
  if (!HTMLDialogElement.prototype.close) {
    HTMLDialogElement.prototype.close = function close() {
      this.open = false
    }
  }
}
