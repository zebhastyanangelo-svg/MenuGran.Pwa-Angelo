import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createMerchantAccount,
  listMerchantsWithOwners,
} from './superAdminService';
import type { CreateMerchantAccountInput } from '../utils/merchantRegistration';

interface TableChain {
  update: ReturnType<typeof vi.fn>;
  insert: ReturnType<typeof vi.fn>;
  select: ReturnType<typeof vi.fn>;
  eq: ReturnType<typeof vi.fn>;
  single: ReturnType<typeof vi.fn>;
  order: ReturnType<typeof vi.fn>;
}

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
  },
}));

const registeredTables = new Map<string, TableChain>();

function buildTableChain(): TableChain {
  const chain: TableChain = {
    update: vi.fn(),
    insert: vi.fn(),
    select: vi.fn(),
    eq: vi.fn(),
    single: vi.fn(),
    order: vi.fn(),
  };
  chain.update.mockReturnValue(chain);
  chain.eq.mockReturnValue({ single: chain.single });
  chain.insert.mockReturnValue({
    select: vi.fn().mockReturnValue({ single: chain.single }),
  });
  return chain;
}

/**
 * Registra el comportamiento de una tabla para la prueba actual.
 * - updateResult: respuesta de `update(...).eq(...).single()` (perfiles).
 * - insertResult: respuesta de `insert(...).select(...).single()` (merchants).
 * - selectResult: respuesta de `select(...).order(...)` (listado).
 */
function registerTable(
  tableName: string,
  options: {
    updateResult?: unknown;
    insertResult?: unknown;
    selectResult?: unknown;
  },
): TableChain {
  const chain = buildTableChain();
  if (options.updateResult !== undefined) {
    chain.single.mockResolvedValue(options.updateResult);
    chain.select.mockReturnValue({ single: chain.single });
  }
  if (options.insertResult !== undefined) {
    chain.single.mockResolvedValue(options.insertResult);
  }
  if (options.selectResult !== undefined) {
    chain.select.mockReturnValue({
      order: vi.fn().mockResolvedValue(options.selectResult),
    });
  }
  registeredTables.set(tableName, chain);
  return chain;
}

function getTable(tableName: string): TableChain {
  const chain = registeredTables.get(tableName);
  if (chain === undefined) {
    throw new Error(`Tabla no registrada en el mock: ${tableName}`);
  }
  return chain;
}

function buildValidInput(): CreateMerchantAccountInput {
  return {
    ownerFullName: 'María Pérez',
    ownerCi: 'V-12345678',
    ownerPhone: '04141234567',
    ownerEmail: 'maria@pizzeria.com',
    ownerPassword: 'ClaveInicial1',
    businessName: 'La Pizzería de María',
    businessRif: 'J-40123456-7',
  };
}

describe('createMerchantAccount', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    registeredTables.clear();
    supabaseMocks.from.mockImplementation(
      (table: string) => registeredTables.get(table),
    );
    supabaseMocks.functionsInvoke.mockResolvedValue({
      data: { userId: 'new-owner' },
      error: null,
    });
    registerTable('profiles', {
      updateResult: { data: null, error: null },
    });
    registerTable('merchants', {
      insertResult: { data: { id: 'merchant-9' }, error: null },
    });
  });

  it('valida el formulario antes de crear nada', async () => {
    const input = buildValidInput();
    input.ownerEmail = 'correo-invalido';

    await expect(createMerchantAccount(input)).rejects.toThrow(
      /email válido/i,
    );
    expect(supabaseMocks.functionsInvoke).not.toHaveBeenCalled();
    expect(getTable('merchants').insert).not.toHaveBeenCalled();
  });

  it('invoca el Edge Function create-merchant con las credenciales del formulario', async () => {
    await createMerchantAccount(buildValidInput());

    expect(supabaseMocks.functionsInvoke).toHaveBeenCalledWith(
      'create-merchant',
      {
        body: {
          email: 'maria@pizzeria.com',
          password: 'ClaveInicial1',
          fullName: 'María Pérez',
        },
      },
    );
  });

  it('actualiza el perfil del usuario creado asignando merchant_owner y su C.I.', async () => {
    await createMerchantAccount(buildValidInput());

    const profiles = getTable('profiles');
    expect(supabaseMocks.from).toHaveBeenCalledWith('profiles');
    expect(profiles.update).toHaveBeenCalledWith(
      expect.objectContaining({
        role: 'merchant_owner',
        full_name: 'María Pérez',
        ci: 'V-12345678',
      }),
    );
    expect(profiles.eq).toHaveBeenCalledWith('id', 'new-owner');
  });

  it('inserta un merchant activo vinculado al nuevo propietario con nombre y RIF públicos', async () => {
    const result = await createMerchantAccount(buildValidInput());

    const merchants = getTable('merchants');
    expect(merchants.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        owner_id: 'new-owner',
        name: 'La Pizzería de María',
        slug: 'la-pizzeria-de-maria',
        rif: 'J-40123456-7',
        status: 'active',
        is_active: true,
      }),
    );
    expect(result.merchantId).toBe('merchant-9');
    expect(result.userId).toBe('new-owner');
    expect(result.temporaryPassword).toBe('ClaveInicial1');
  });

  it('no manipula la sesión ni usa la API de Admin desde el frontend', async () => {
    await createMerchantAccount(buildValidInput());

    expect(supabaseMocks.functionsInvoke).toHaveBeenCalledTimes(1);
  });

  it('propaga el error cuando el Edge Function falla y no crea el merchant', async () => {
    supabaseMocks.functionsInvoke.mockResolvedValue({
      data: null,
      error: new Error('email already registered'),
    });

    await expect(createMerchantAccount(buildValidInput())).rejects.toThrow(
      'Error al crear la cuenta del propietario: email already registered',
    );
    expect(getTable('profiles').update).not.toHaveBeenCalled();
    expect(getTable('merchants').insert).not.toHaveBeenCalled();
  });

  it('propaga el error cuando la inserción del merchant falla', async () => {
    registerTable('merchants', {
      insertResult: { data: null, error: { message: 'duplicate slug' } },
    });

    await expect(createMerchantAccount(buildValidInput())).rejects.toThrow(
      'Error al crear el comercio: duplicate slug',
    );
  });
});

describe('listMerchantsWithOwners', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    registeredTables.clear();
    supabaseMocks.from.mockImplementation(
      (table: string) => registeredTables.get(table),
    );
  });

  it('mapea las filas incluyendo los datos del propietario embebido', async () => {
    const merchants = registerTable('merchants', {
      selectResult: {
        data: [
          {
            id: 'm-1',
            name: 'La Pizzería de María',
            rif: 'J-40123456-7',
            status: 'active',
            is_active: true,
            created_at: '2026-08-21T00:00:00.000Z',
            profiles: {
              email: 'maria@pizzeria.com',
              full_name: 'María Pérez',
            },
          },
          {
            id: 'm-2',
            name: 'Arepas El Güero',
            rif: 'J-40987654-3',
            status: 'pending_approval',
            is_active: false,
            created_at: '2026-08-20T00:00:00.000Z',
            profiles: null,
          },
        ],
        error: null,
      },
    });

    const items = await listMerchantsWithOwners();

    expect(merchants.select).toHaveBeenCalledWith(
      'id, name, rif, status, is_active, created_at, profiles(email, full_name)',
    );
    expect(items).toHaveLength(2);
    expect(items[0]).toMatchObject({
      id: 'm-1',
      name: 'La Pizzería de María',
      owner_email: 'maria@pizzeria.com',
      owner_full_name: 'María Pérez',
    });
    expect(items[1]).toMatchObject({
      id: 'm-2',
      owner_email: null,
      owner_full_name: null,
    });
  });

  it('propaga el error cuando la consulta falla', async () => {
    registerTable('merchants', {
      selectResult: { data: null, error: { message: 'row level security' } },
    });

    await expect(listMerchantsWithOwners()).rejects.toThrow(
      'Error al listar los comercios: row level security',
    );
  });
});
