import { describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach } from 'vitest';
import {
  MerchantPopularityCard,
  derivePopularityLevel,
} from './MerchantPopularityCard';

afterEach(() => {
  cleanup();
});

describe('derivePopularityLevel', () => {
  it('clasifica el promedio de estrellas en niveles', () => {
    expect(derivePopularityLevel(null)).toBe('sin_valoraciones');
    expect(derivePopularityLevel({ average: 0, count: 0 })).toBe('sin_valoraciones');
    expect(derivePopularityLevel({ average: 2, count: 3 })).toBe('mejorable');
    expect(derivePopularityLevel({ average: 3.4, count: 8 })).toBe('buena');
    expect(derivePopularityLevel({ average: 4.2, count: 15 })).toBe('muy_buena');
    expect(derivePopularityLevel({ average: 4.8, count: 40 })).toBe('excelente');
  });
});

describe('MerchantPopularityCard', () => {
  it('muestra el promedio, el nivel y la cantidad de valoraciones', () => {
    render(
      <MerchantPopularityCard
        summary={{ average: 4.5, count: 12 }}
        isLoading={false}
        error={null}
      />,
    );

    expect(screen.getByTestId('popularity-average')).toHaveTextContent('4,5');
    expect(screen.getByTestId('popularity-level')).toHaveTextContent('Excelente');
    expect(screen.getByTestId('popularity-count')).toHaveTextContent('12 valoraciones');
  });

  it('muestra estado vacío cuando aún no hay valoraciones', () => {
    render(
      <MerchantPopularityCard
        summary={{ average: 0, count: 0 }}
        isLoading={false}
        error={null}
      />,
    );

    expect(screen.getByTestId('popularity-average')).toHaveTextContent('—');
    expect(screen.getByTestId('popularity-level')).toHaveTextContent('Sin valoraciones');
  });

  it('muestra el estado de carga sin romperse', () => {
    render(
      <MerchantPopularityCard summary={null} isLoading error={null} />,
    );

    expect(screen.getByRole('status')).toHaveTextContent(/Cargando valoraciones/);
  });

  it('muestra el error de carga con rol de alerta', () => {
    render(
      <MerchantPopularityCard
        summary={null}
        isLoading={false}
        error="No se pudieron obtener las valoraciones"
      />,
    );

    expect(screen.getByRole('alert')).toHaveTextContent(
      'No se pudieron obtener las valoraciones',
    );
  });
});
