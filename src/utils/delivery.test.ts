import { describe, expect, it } from 'vitest';
import {
  NEW_DELIVERY_STATUSES,
  TRACKED_DELIVERY_STATUSES,
  getOrderDeliveryAddress,
  getOrderDeliveryCoordinates,
  buildDeliveryMapsUrl,
  buildDeliveryWazeUrl,
} from './delivery';

const baseOrder = {
  delivery_address: null,
  delivery_address_notes: null,
  latitude: null,
  longitude: null,
  delivery_location: null,
};

describe('delivery utils', () => {
  describe('estados de entrega', () => {
    it('incluye confirmed, preparing y ready como "Nuevas"', () => {
      expect(NEW_DELIVERY_STATUSES).toEqual(['confirmed', 'preparing', 'ready']);
    });

    it('el panel sigue Nuevas + En camino + Entregadas', () => {
      expect(TRACKED_DELIVERY_STATUSES).toEqual([
        'confirmed',
        'preparing',
        'ready',
        'on_the_way',
        'delivered',
      ]);
    });
  });

  describe('getOrderDeliveryAddress', () => {
    it('prefiere delivery_address guardada en checkout', () => {
      const order = {
        ...baseOrder,
        delivery_address: 'Calle 1 #2-3',
        delivery_address_notes: 'Nota vieja',
      };
      expect(getOrderDeliveryAddress(order)).toBe('Calle 1 #2-3');
    });

    it('cae en delivery_address_notes si no hay delivery_address', () => {
      const order = { ...baseOrder, delivery_address_notes: 'Av. Principal 123' };
      expect(getOrderDeliveryAddress(order)).toBe('Av. Principal 123');
    });

    it('devuelve texto por defecto cuando no hay dirección', () => {
      expect(getOrderDeliveryAddress(baseOrder)).toBe('Dirección no disponible');
    });
  });

  describe('getOrderDeliveryCoordinates', () => {
    it('prefiere latitude/longitude explícitas', () => {
      const order = {
        ...baseOrder,
        latitude: 10.48,
        longitude: -66.9,
        delivery_location: { x: -99.1, y: 19.43 },
      };
      expect(getOrderDeliveryCoordinates(order)).toEqual([10.48, -66.9]);
    });

    it('cae en delivery_location si no hay lat/lng', () => {
      const order = { ...baseOrder, delivery_location: { x: -99.1, y: 19.43 } };
      expect(getOrderDeliveryCoordinates(order)).toEqual([19.43, -99.1]);
    });

    it('devuelve null si no hay coordenadas', () => {
      expect(getOrderDeliveryCoordinates(baseOrder)).toBeNull();
    });
  });

  describe('URLs de navegación', () => {
    const withCoords = { ...baseOrder, latitude: 10.48, longitude: -66.9 };
    const withAddress = { ...baseOrder, delivery_address: 'Av. Libertador, Caracas' };

    it('Maps usa las coordenadas cuando existen', () => {
      expect(buildDeliveryMapsUrl(withCoords)).toBe(
        'https://www.google.com/maps/search/?api=1&query=10.48%2C-66.9',
      );
    });

    it('Maps cae en búsqueda por dirección sin coordenadas', () => {
      expect(buildDeliveryMapsUrl(withAddress)).toContain(
        'https://www.google.com/maps/search/?api=1&query=',
      );
      expect(buildDeliveryMapsUrl(withAddress)).toContain(
        encodeURIComponent('Av. Libertador, Caracas'),
      );
    });

    it('Waze usa ll + navigate=yes con coordenadas', () => {
      expect(buildDeliveryWazeUrl(withCoords)).toBe(
        'https://waze.com/ul?ll=10.48,-66.9&navigate=yes',
      );
    });

    it('Waze cae en búsqueda por dirección sin coordenadas', () => {
      expect(buildDeliveryWazeUrl(withAddress)).toContain('https://waze.com/ul?q=');
    });
  });
});
