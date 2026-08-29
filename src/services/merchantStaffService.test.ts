import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createEmployee,
  deleteStaff,
  fetchMerchantMetrics,
  getMerchantContext,
  listStaff,
  setStaffActive,
} from './merchantStaffService';
import type { EmployeeFormInput } from '../utils/staffPermissions';

const supabaseMocks = vi.hoisted(() => ({
  functionsInvoke: vi.fn(),
  from: vi.fn(),
}));

vi.mock('./supabase', () => ({
  supabase: {
    functions: { invoke: supabaseMocks.functionsInvoke },
    from: supabaseMocks.from,
  },
  TABLE_NAMES: {
    profiles: 'profiles',
    merchants: 'merchants',
    merchantStaff: 'merchant_staff',
    products: 'products',
    orders: 'orders',
  },
}));

interface Chain {
  select: ReturnType<typeof vi.fn>;
  insert: ReturnType<typeof vi.fn>;
  update: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
  eq: ReturnType<typeof vi.fn>;
  gte: ReturnType<typeof vi.fn>;
  order: ReturnType<typeof vi.fn>;
  maybeSingle: ReturnType<typeof vi.fn>;
  single: ReturnType<typeof vi.fn>;
}

function buildChain(): Chain {
  const chain: Chain = {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    eq: vi.fn(),
    gte: vi.fn(),
    order: vi.fn(),
    maybeSingle: vi.fn(),
    single: vi.fn(),
  };
  chain.select.mockReturnValue(chain);
  chain.insert.mockReturnValue({ select: chain.select });
  chain.update.mockReturnValue(chain);
  chain.delete.mockReturnValue(chain);
  chain.eq.mockReturnValue(chain);
  return chain;
}

const tables = new Map<string, Chain>();

function register(name: string): Chain {
  const chain = buildChain();
  tables.set(name, chain);
  return chain;
}

function buildValidInput(): EmployeeFormInput {
  return {
    fullName: 'Carlos Ruiz',
    email: 'carlos@pizzeria.com',
    password: 'Clave123',
    permissions: { can_manage_orders: true, can_manage_menu: false, can_manage_settings: false, can_view_metrics: false },
  };
}

describe('getMerchantContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    tables.clear();
    supabaseMocks.from.mockImplementation((t: string) => tables.get(t));
  });

  it('devuelve el negocio propio cuando el usuario es owner', async () => {
    const merchants = register('merchants');
    merchants.maybeSingle.mockResolvedValue({
      data: { id: 'm-1', name: 'La Pizzería' },
      error: null,
    });

    const context = await getMerchantContext('user-1');

    expect(context).toEqual({
      merchantId: 'm-1',
      merchantName: 'La Pizzería',
      isOwner: true,
    });
    expect(merchants.eq).toHaveBeenCalledWith('owner_id', 'user-1');
  });

  it('resuelve el merchant vía merchant_staff para empleados', async () => {
    const merchants = register('merchants');
    merchants.maybeSingle.mockResolvedValue({ data: null, error: null });
    const staff = register('merchant_staff');
    staff.maybeSingle.mockResolvedValue({
      data: { merchant_id: 'm-2', merchants: { id: 'm-2', name: 'Arepas' } },
      error: null,
    });

    const context = await getMerchantContext('user-2');

    expect(context).toEqual({
      merchantId: 'm-2',
      merchantName: 'Arepas',
      isOwner: false,
    });
  });

  it('devuelve null sin negocio asociado', async () => {
    register('merchants').maybeSingle.mockResolvedValue({
      data: null,
      error: null,
    });
    register('merchant_staff').maybeSingle.mockResolvedValue({
      data: null,
      error: null,
    });

    await expect(getMerchantContext('user-3')).resolves.toBeNull();
  });
});

describe('listStaff', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    tables.clear();
    supabaseMocks.from.mockImplementation((t: string) => tables.get(t));
  });

  it('mapea las filas con el perfil embebido', async () => {
    const staff = register('merchant_staff');
    staff.order.mockResolvedValue({
      data: [
        {
          id: 's-1',
          user_id: 'u-9',
          permissions: { can_manage_menu: true, can_view_orders: true },
          is_active: true,
          profiles: { email: 'carlos@pizzeria.com', full_name: 'Carlos Ruiz' },
        },
        {
          id: 's-2',
          user_id: 'u-10',
          permissions: { can_manage_menu: false, can_view_orders: true },
          is_active: false,
          profiles: null,
        },
      ],
      error: null,
    });

    const items = await listStaff('m-1');

    expect(staff.eq).toHaveBeenCalledWith('merchant_id', 'm-1');
    expect(items[0]).toMatchObject({
      id: 's-1',
      userId: 'u-9',
      fullName: 'Carlos Ruiz',
      email: 'carlos@pizzeria.com',
      isActive: true,
    });
    expect(items[1]).toMatchObject({
      fullName: 'Empleado de Staff',
      email: null,
      isActive: false,
    });
  });

  it('propaga el error de la consulta', async () => {
    register('merchant_staff').order.mockResolvedValue({
      data: null,
      error: { message: 'rls denied' },
    });

    await expect(listStaff('m-1')).rejects.toThrow(
      'Error al cargar los empleados: rls denied',
    );
  });
});

describe('createEmployee', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    supabaseMocks.functionsInvoke.mockResolvedValue({
      data: { staffId: 'staff-new' },
      error: null,
    });
  });

  it('valida el formulario antes de invocar el Edge Function', async () => {
    const input = buildValidInput();
    input.email = 'invalido';

    await expect(createEmployee('m-1', input)).rejects.toThrow(/email válido/i);
    expect(supabaseMocks.functionsInvoke).not.toHaveBeenCalled();
  });

  it('invoca create-employee con credenciales y permisos normalizados', async () => {
    await createEmployee('m-1', buildValidInput());

    expect(supabaseMocks.functionsInvoke).toHaveBeenCalledWith(
      'create-employee',
      {
        body: {
          merchantId: 'm-1',
          email: 'carlos@pizzeria.com',
          password: 'Clave123',
          fullName: 'Carlos Ruiz',
          permissions: {
            can_manage_menu: false,
            can_view_orders: true,
            can_manage_orders: true,
            can_manage_settings: false,
            can_view_metrics: false,
          },
        },
      },
    );
  });

  it('propaga el error del Edge Function', async () => {
    supabaseMocks.functionsInvoke.mockResolvedValue({
      data: null,
      error: new Error('email already registered'),
    });

    await expect(createEmployee('m-1', buildValidInput())).rejects.toThrow(
      'Error al crear el empleado: email already registered',
    );
  });
});

describe('setStaffActive / deleteStaff', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    tables.clear();
    supabaseMocks.from.mockImplementation((t: string) => tables.get(t));
  });

  it('revoca acceso con is_active en false', async () => {
    const staff = register('merchant_staff');
    staff.eq.mockResolvedValue({ data: null, error: null });

    await setStaffActive('s-1', false);

    expect(staff.update).toHaveBeenCalledWith({ is_active: false });
    expect(staff.eq).toHaveBeenCalledWith('id', 's-1');
  });

  it('elimina la relación del empleado', async () => {
    const staff = register('merchant_staff');
    staff.eq.mockResolvedValue({ data: null, error: null });

    await deleteStaff('s-1');

    expect(staff.delete).toHaveBeenCalled();
    expect(staff.eq).toHaveBeenCalledWith('id', 's-1');
  });

  it('propaga errores de actualización', async () => {
    const staff = register('merchant_staff');
    staff.eq.mockResolvedValue({
      data: null,
      error: { message: 'forbidden' },
    });

    await expect(setStaffActive('s-1', true)).rejects.toThrow(
      'Error al restaurar el acceso: forbidden',
    );
  });
});

describe('fetchMerchantMetrics', () => {
  /** Cadena thenable universal: cualquier método encadena y await resuelve. */
  function queryResult(result: { data?: unknown; error?: unknown; count?: number }) {
    const promise = Promise.resolve(result) as unknown as Record<string, unknown>;
    const proxy = new Proxy(promise, {
      get(target, prop: string | symbol) {
        if (prop === 'then') {
          return ((target.then) as Promise<unknown>['then']).bind(target);
        }
        if (prop === 'catch') {
          return ((target.catch) as Promise<unknown>['catch']).bind(target);
        }
        return () => proxy;
      },
    });
    return proxy;
  }

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('suma ventas, cuenta pedidos del día y platos activos', async () => {
    let ordersCall = 0;
    supabaseMocks.from.mockImplementation((table: string) => {
      if (table === 'orders') {
        ordersCall += 1;
        if (ordersCall === 1) {
          return queryResult({
            data: [{ total_amount: 100 }, { total_amount: 250.5 }],
            error: null,
          });
        }
        return queryResult({ count: 3, error: null });
      }
      return queryResult({ count: 7, error: null });
    });

    const metrics = await fetchMerchantMetrics('m-1');

    expect(metrics.totalSales).toBeCloseTo(350.5);
    expect(metrics.ordersToday).toBe(3);
    expect(metrics.activeProducts).toBe(7);
    expect(supabaseMocks.from).toHaveBeenCalledWith('products');
  });

  it('lanza error si alguna consulta falla', async () => {
    supabaseMocks.from.mockImplementation((table: string) => {
      if (table === 'products') {
        return queryResult({ count: 0, error: { message: 'boom' } });
      }
      return queryResult({ count: 0, error: null, data: [] });
    });

    await expect(fetchMerchantMetrics('m-1')).rejects.toThrow(
      'Error al calcular las métricas del comercio.',
    );
  });
});
