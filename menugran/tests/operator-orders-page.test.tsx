// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, waitFor } from '@testing-library/react';

// Mock next/link to avoid Next-specific runtime behavior in jsdom.
vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

// Mock FontAwesome — it depends on React internals that can fail in jsdom.
vi.mock('@fortawesome/react-fontawesome', () => ({
  FontAwesomeIcon: () => <span />,
}));

// Mock fetch for OperatorOrdersPage.
const mockFetch = vi.fn();
global.fetch = mockFetch as unknown as typeof fetch;

describe('OperatorOrdersPage smoke test', () => {
  it('renders without crashing when API returns empty list', async () => {
    mockFetch.mockResolvedValue(
      new Response(JSON.stringify({ success: true, data: [] }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    );

    const { default: OperatorOrdersPage } = await import(
      '@/app/(operator)/operator/orders/page'
    );
    const { container } = render(<OperatorOrdersPage />);

    await waitFor(() => {
      expect(container).toBeTruthy();
      expect(document.body).toBeTruthy();
    });
  });
});
