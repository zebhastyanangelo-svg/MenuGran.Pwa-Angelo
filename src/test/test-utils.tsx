import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactElement, ReactNode } from 'react';
import { render, type RenderOptions } from '@testing-library/react';

/**
 * Crea un QueryClient aislado por test para evitar fugas de caché entre
 * renderizados. Se usa en los tests que montan componentes que dependen de
 * React Query (useQuery / useMutation).
 */
export function createTestQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
        staleTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  });
}

interface ProvidersProps {
  children: ReactNode;
  client?: QueryClient;
}

export function QueryClientTestProvider({
  children,
  client,
}: ProvidersProps): ReactElement {
  const queryClient = client ?? createTestQueryClient();
  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

function customRender(
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>,
): ReturnType<typeof render> {
  const queryClient = createTestQueryClient();
  return render(ui, {
    wrapper: ({ children }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    ),
    ...options,
  });
}

export * from '@testing-library/react';
export { customRender as render };
