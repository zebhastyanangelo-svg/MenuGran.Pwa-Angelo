import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MerchantDeliveriesCard, deriveDeliveryLevel } from './MerchantDeliveriesCard';
import type { MerchantDeliveryMetrics } from '../../services/orderRatingService';
import type { DriverProfile } from '../../hooks/useMerchantDashboardPage';

const DRIVERS: DriverProfile[] = [
  { id: 'd-1', full_name: 'Luis Mensajero', email: 'luis@t.com' },
  { id: 'd-2', full_name: 'Ana Repartidora', email: 'ana@t.com' },
];

function buildMetrics(
  overrides: Partial<MerchantDeliveryMetrics> = {},
): MerchantDeliveryMetrics {
  return {
    drivers: [
      { driverId: 'd-1', summary: { average: 4.5, count: 4 } },
      { driverId: 'd-2', summary: { average: 3, count: 2 } },
    ],
    overall: { average: 4, count: 6 },
    ...overrides,
  };
}

describe('deriveDeliveryLevel', () => {
  it('clasifica según el promedio de estrellas', () => {
    expect(deriveDeliveryLevel(null)).toBe('sin_valoraciones');
    expect(deriveDeliveryLevel({ average: 4.6, count: 3 })).toBe('excelente');
    expect(deriveDeliveryLevel({ average: 4.2, count: 3 })).toBe('muy_buena');
    expect(deriveDeliveryLevel({ average: 3.5, count: 3 })).toBe('buena');
    expect(deriveDeliveryLevel({ average: 2, count: 3 })).toBe('mejorable');
    expect(deriveDeliveryLevel({ average: 0, count: 0 })).toBe('sin_valoraciones');
  });
});

describe('MerchantDeliveriesCard', () => {
  it('muestra la cantidad de repartidores y el resumen global', () => {
    render(
      <MerchantDeliveriesCard
        metrics={buildMetrics()}
        drivers={DRIVERS}
        isLoading={false}
        error={null}
      />,
    );

    expect(screen.getByTestId('merchant-deliveries-card')).toBeInTheDocument();
    expect(screen.getByText('2 repartidores')).toBeInTheDocument();
    expect(screen.getByTestId('delivery-overall-summary')).toHaveTextContent(
      '4,0 ★ · 6 calificaciones',
    );
  });

  it('lista el promedio de estrellas de cada repartidor con su nombre', () => {
    render(
      <MerchantDeliveriesCard
        metrics={buildMetrics()}
        drivers={DRIVERS}
        isLoading={false}
        error={null}
      />,
    );

    expect(screen.getByTestId('delivery-driver-rating-d-1')).toHaveTextContent('Luis Mensajero');
    expect(screen.getByTestId('delivery-driver-rating-d-1')).toHaveTextContent('4,5 ★');
    expect(screen.getByTestId('delivery-driver-rating-d-2')).toHaveTextContent('Ana Repartidora');
    expect(screen.getByTestId('delivery-driver-rating-d-2')).toHaveTextContent('3,0 ★');
  });

  it('usa el email cuando el repartidor no tiene nombre', () => {
    render(
      <MerchantDeliveriesCard
        metrics={buildMetrics({
          drivers: [{ driverId: 'd-1', summary: { average: 4, count: 1 } }],
        })}
        drivers={[{ id: 'd-1', full_name: null, email: 'luis@t.com' }]}
        isLoading={false}
        error={null}
      />,
    );

    expect(screen.getByTestId('delivery-driver-rating-d-1')).toHaveTextContent('luis@t.com');
  });

  it('muestra el estado vacío cuando no hay calificaciones', () => {
    render(
      <MerchantDeliveriesCard
        metrics={null}
        drivers={[]}
        isLoading={false}
        error={null}
      />,
    );

    expect(screen.getByTestId('delivery-overall-summary')).toHaveTextContent(
      'Sin valoraciones',
    );
    expect(screen.getByTestId('delivery-overall-level')).toHaveTextContent(
      'Sin valoraciones',
    );
    expect(
      screen.getByText('Aún no hay calificaciones de entrega para tu equipo.'),
    ).toBeInTheDocument();
  });

  it('muestra un repartidor en singular', () => {
    render(
      <MerchantDeliveriesCard
        metrics={buildMetrics({
          drivers: [{ driverId: 'd-1', summary: { average: 4, count: 1 } }],
          overall: { average: 4, count: 1 },
        })}
        drivers={[DRIVERS[0]!]}
        isLoading={false}
        error={null}
      />,
    );

    expect(screen.getByText('1 repartidor')).toBeInTheDocument();
  });

  it('muestra el cargador mientras consulta', () => {
    render(
      <MerchantDeliveriesCard
        metrics={null}
        drivers={[]}
        isLoading
        error={null}
      />,
    );

    expect(screen.getByRole('status')).toHaveTextContent('Cargando calificaciones…');
  });

  it('muestra el error de forma accesible', () => {
    render(
      <MerchantDeliveriesCard
        metrics={null}
        drivers={[]}
        isLoading={false}
        error="No se pudieron obtener las calificaciones"
      />,
    );

    expect(screen.getByRole('alert')).toHaveTextContent(
      'No se pudieron obtener las calificaciones',
    );
  });
});
