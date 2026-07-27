// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, waitFor } from '@testing-library/react';

// Mock next/link
vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

describe('MenuPage smoke test', () => {
  it('renders without crashing', async () => {
    const { default: MenuPage } = await import('@/app/(admin)/admin/menu/page');
    const { container } = render(<MenuPage />);

    await waitFor(() => {
      // The page uses initialCategories and initialDishes constants — should render
      // something like a heading or list, but to keep this smoke test resilient
      // to copy changes we just assert no crash and a body exists.
      expect(container).toBeTruthy();
      expect(document.body).toBeTruthy();
    });
  });
});
