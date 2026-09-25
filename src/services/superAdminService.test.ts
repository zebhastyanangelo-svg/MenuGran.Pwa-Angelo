import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createMerchantAccount,
  deleteMerchant,
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
  getSession: vi.fn(),
}));

vi.mock('./supabase', () => ({
  supabase: {
    auth: { getSession: supabaseMocks.getSession },
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
    supabaseMocks.getSession.mockResolvedValue({
      data: { session: { access_token: 'access-token' } },
      error: null,
    });
    supabaseMocks.functionsInvoke.mockResolvedValue({
      data: { userId: 'new-owner', merchantId: 'merchant-9' },
      error: null,
    });
  });

  it('valida el formulario antes de leer la sesión', async () => {
    const input = buildValidInput();
    input.ownerEmail = 'correo-invalido';

    await expect(createMerchantAccount(input)).rejects.toThrow(/email válido/i);
    expect(supabaseMocks.getSession).not.toHaveBeenCalled();
    expect(supabaseMocks.functionsInvoke).not.toHaveBeenCalled();
  });

  it('invoca create-merchant con JWT explícito y todos los datos del alta', async () => {
    await createMerchantAccount(buildValidInput());

    expect(supabaseMocks.functionsInvoke).toHaveBeenCalledWith(
      'create-merchant',
      {
        headers: { Authorization: 'Bearer access-token' },
        body: {
          email: 'maria@pizzeria.com',
          password: 'ClaveInicial1',
          fullName: 'María Pérez',
          ownerCi: 'V-12345678',
          ownerPhone: '04141234567',
          businessName: 'La Pizzería de María',
          businessRif: 'J-40123456-7',
        },
      },
    );
  });

  it('devuelve los identificadores creados por el servidor', async () => {
    const result = await createMerchantAccount(buildValidInput());

    expect(result).toEqual({
      userId: 'new-owner',
      merchantId: 'merchant-9',
      temporaryPassword: 'ClaveInicial1',
    });
    expect(supabaseMocks.from).not.toHaveBeenCalled();
  });

  it('muestra el error JSON de la Edge Function', async () => {
    supabaseMocks.functionsInvoke.mockResolvedValue({
      data: null,
      error: new Error('Edge Function returned a non-2xx status code'),
      response: { json: vi.fn().mockResolvedValue({ error: 'Sesión inválida o expirada.' }) },
    });

    await expect(createMerchantAccount(buildValidInput())).rejects.toThrow(
      'Error al crear la cuenta del propietario: Sesión inválida o expirada.',
    );
  });

  it('falla de forma clara cuando no existe una sesión activa', async () => {
    supabaseMocks.getSession.mockResolvedValue({
      data: { session: null },
      error: null,
    });

    await expect(createMerchantAccount(buildValidInput())).rejects.toThrow(
      'Tu sesión no está disponible. Inicia sesión nuevamente.',
    );
    expect(supabaseMocks.functionsInvoke).not.toHaveBeenCalled();
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
            owner_id: 'owner-1',
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
            owner_id: null,
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
      'id, owner_id, name, rif, status, is_active, created_at, profiles(email, full_name)',
    );
    expect(items).toHaveLength(2);
    expect(items[0]).toMatchObject({
      id: 'm-1',
      name: 'La Pizzería de María',
      owner_id: 'owner-1',
      owner_email: 'maria@pizzeria.com',
      owner_full_name: 'María Pérez',
    });
    expect(items[1]).toMatchObject({
      id: 'm-2',
      owner_id: null,
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

describe('deleteMerchant', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    supabaseMocks.getSession.mockResolvedValue({
      data: { session: { access_token: 'access-token' } },
      error: null,
    });
    supabaseMocks.functionsInvoke.mockResolvedValue({
      data: { deleted: true },
      error: null,
    });
  });

  it('invoca el Edge Function delete-merchant con merchantId y ownerId', async () => {
    await deleteMerchant('merchant-9', 'new-owner');

    expect(supabaseMocks.functionsInvoke).toHaveBeenCalledWith(
      'delete-merchant',
      {
        headers: { Authorization: 'Bearer access-token' },
        body: { merchantId: 'merchant-9', ownerId: 'new-owner' },
      },
    );
  });

  it('rechaza sin invocar la función cuando faltan identificadores', async () => {
    await expect(deleteMerchant('', '')).rejects.toThrow(
      'Se requiere el identificador del comercio y del propietario.',
    );
    expect(supabaseMocks.functionsInvoke).not.toHaveBeenCalled();
  });

  it('propaga el error cuando el Edge Function falla', async () => {
    supabaseMocks.functionsInvoke.mockResolvedValue({
      data: null,
      error: new Error('row level security'),
    });

    await expect(deleteMerchant('merchant-9', 'new-owner')).rejects.toThrow(
      'Error al eliminar el comercio: row level security',
    );
  });
});
