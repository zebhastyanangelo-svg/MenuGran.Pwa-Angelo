import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  attachDriverCustomerContact,
  fetchDriverCustomerContact,
  hydrateDriverCustomerContacts,
  mapDriverCustomerContact,
  needsCustomerContact,
} from './driverContactService';

const supabaseMocks = vi.hoisted(() => ({
  rpc: vi.fn(),
}));

vi.mock('./supabase', () => ({
  supabase: { rpc: supabaseMocks.rpc },
}));

const CONTACT = {
  customer_id: 'c-1',
  full_name: 'Ángelo Pérez',
  email: 'angelo@test.com',
  phone: '4142380573',
};

describe('mapDriverCustomerContact', () => {
  it('devuelve null cuando la RPC no devolvió filas', () => {
    expect(mapDriverCustomerContact(null)).toBeNull();
    expect(mapDriverCustomerContact(undefined)).toBeNull();
  });

  it('normaliza los espacios y conserva el teléfono tal cual llega', () => {
    expect(mapDriverCustomerContact(CONTACT)).toEqual({
      full_name: 'Ángelo Pérez',
      email: 'angelo@test.com',
      phone: '4142380573',
    });
  });

  it('convierte los textos vacíos en null para que no se pinten como datos', () => {
    expect(mapDriverCustomerContact({ full_name: '  ', email: null, phone: '' })).toEqual({
      full_name: null,
      email: null,
      phone: null,
    });
  });
});

describe('fetchDriverCustomerContact', () => {
  beforeEach(() => {
    supabaseMocks.rpc.mockReset();
  });

  it('no consulta cuando el pedido no trae id', async () => {
    await expect(fetchDriverCustomerContact('   ')).resolves.toBeNull();
    expect(supabaseMocks.rpc).not.toHaveBeenCalled();
  });

  it('pide el contacto del cliente a la RPC del pedido', async () => {
    supabaseMocks.rpc.mockResolvedValue({ data: [CONTACT], error: null });

    const contact = await fetchDriverCustomerContact('order-1');

    expect(supabaseMocks.rpc).toHaveBeenCalledWith('driver_customer_contact', {
      p_order_id: 'order-1',
    });
    expect(contact).toEqual({
      full_name: 'Ángelo Pérez',
      email: 'angelo@test.com',
      phone: '4142380573',
    });
  });

  it('devuelve null cuando la RPC no autoriza al repartidor del pedido', async () => {
    supabaseMocks.rpc.mockResolvedValue({ data: [], error: null });

    await expect(fetchDriverCustomerContact('order-1')).resolves.toBeNull();
  });

  it('propaga el error de Supabase', async () => {
    supabaseMocks.rpc.mockResolvedValue({ data: null, error: new Error('RLS denegado') });

    await expect(fetchDriverCustomerContact('order-1')).rejects.toThrow('RLS denegado');
  });
});

describe('needsCustomerContact', () => {
  it('exige el teléfono porque es lo que arma el botón de llamada', () => {
    expect(needsCustomerContact({ id: 'o-1', profiles: null })).toBe(true);
    expect(needsCustomerContact({ id: 'o-1', profiles: { full_name: 'A', email: null, phone: null } })).toBe(true);
    expect(needsCustomerContact({ id: 'o-1', profiles: { full_name: 'A', email: null, phone: '  ' } })).toBe(true);
    expect(
      needsCustomerContact({ id: 'o-1', profiles: { full_name: 'A', email: null, phone: '04121234567' } }),
    ).toBe(false);
  });
});

describe('attachDriverCustomerContact', () => {
  it('rellena el perfil del pedido que llegó sin contacto', () => {
    const order = { id: 'o-1', profiles: null };

    expect(attachDriverCustomerContact(order, { full_name: 'Ana', email: 'a@t.com', phone: '04121234567' })).toEqual({
      id: 'o-1',
      profiles: { full_name: 'Ana', email: 'a@t.com', phone: '04121234567' },
    });
  });

  it('no pisa los datos que ya trajo el JOIN', () => {
    const order = {
      id: 'o-1',
      profiles: { full_name: 'Ana', email: 'a@t.com', phone: null },
    };

    const merged = attachDriverCustomerContact(order, {
      full_name: 'Otro',
      email: 'otro@t.com',
      phone: '04121234567',
    });

    expect(merged.profiles).toEqual({
      full_name: 'Ana',
      email: 'a@t.com',
      phone: '04121234567',
    });
  });

  it('deja el pedido intacto cuando la RPC no devolvió contacto', () => {
    const order = { id: 'o-1', profiles: null };
    expect(attachDriverCustomerContact(order, null)).toBe(order);
  });
});

describe('hydrateDriverCustomerContacts', () => {
  beforeEach(() => {
    supabaseMocks.rpc.mockReset();
  });

  it('no consulta nada cuando todos los pedidos ya traen teléfono', async () => {
    const orders = [
      { id: 'o-1', profiles: { full_name: 'Ana', email: null, phone: '04121234567' } },
    ];

    await expect(hydrateDriverCustomerContacts(orders)).resolves.toEqual(orders);
    expect(supabaseMocks.rpc).not.toHaveBeenCalled();
  });

  it('completa el teléfono de los pedidos que el RLS dejó sin perfil', async () => {
    supabaseMocks.rpc.mockResolvedValue({ data: [CONTACT], error: null });
    const orders = [
      { id: 'o-1', profiles: null, status: 'on_the_way' },
      { id: 'o-2', profiles: { full_name: 'Ana', email: 'a@t.com', phone: '04121234567' } },
    ];

    const hydrated = await hydrateDriverCustomerContacts(orders);

    expect(supabaseMocks.rpc).toHaveBeenCalledTimes(1);
    expect(supabaseMocks.rpc).toHaveBeenCalledWith('driver_customer_contact', {
      p_order_id: 'o-1',
    });
    expect(hydrated[0]?.profiles?.phone).toBe('4142380573');
    expect(hydrated[0]?.status).toBe('on_the_way');
    expect(hydrated[1]).toBe(orders[1]);
  });

  it('mantiene la lista aunque la RPC falle', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    supabaseMocks.rpc.mockResolvedValue({ data: null, error: new Error('postgrest down') });

    const orders = [{ id: 'o-1', profiles: null }];
    const hydrated = await hydrateDriverCustomerContacts(orders);

    expect(hydrated).toEqual(orders);
    warnSpy.mockRestore();
  });
});
