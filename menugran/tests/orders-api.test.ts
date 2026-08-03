import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';

const { mockAuth, mockPrisma } = vi.hoisted(() => ({
  mockAuth: vi.fn(),
  mockPrisma: {
    menuItem: { findMany: vi.fn() },
    order: { findMany: vi.fn() },
    table: { findUnique: vi.fn(), create: vi.fn() },
    $transaction: vi.fn(),
  },
}));

vi.mock('@/lib/auth-next', () => ({
  auth: mockAuth,
}));

vi.mock('@/lib/db', () => ({
  prisma: mockPrisma,
  default: mockPrisma,
}));

import { GET, POST } from '@/app/api/orders/route';

const validBody = {
  restaurantId: 'r1',
  items: [{ menuItemId: 'm1', quantity: 2 }],
};

const clientSession = { user: { id: 'client-1', role: 'CUSTOMER', name: 'X' } };
const adminSession = { user: { id: 'admin-1', role: 'ADMIN', name: 'X' } };

function jsonRequest(
  url: string,
  init?: ConstructorParameters<typeof NextRequest>[1]
): NextRequest {
  return new NextRequest(url, init);
}

interface MockTx {
  table: {
    findUnique: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
  };
  order: {
    create: ReturnType<typeof vi.fn>;
  };
}

function mockTx(): MockTx {
  return {
    table: {
      findUnique: vi.fn().mockResolvedValueOnce(null),
      create: vi.fn().mockResolvedValueOnce({ id: 't1' }),
    },
    order: {
      create: vi.fn().mockImplementationOnce(async ({ data }: { data: unknown }) => ({
        id: 'order-1',
        ...(data as object),
      })),
    },
  };
}

describe('POST /api/orders', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('devuelve 401 sin sesión', async () => {
    mockAuth.mockResolvedValueOnce(null);
    const req = jsonRequest('http://localhost/api/orders', {
      method: 'POST',
      body: JSON.stringify(validBody),
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it('devuelve 400 con detalles por campo cuando el body es inválido', async () => {
    mockAuth.mockResolvedValueOnce(clientSession);
    const req = jsonRequest('http://localhost/api/orders', {
      method: 'POST',
      body: JSON.stringify({
        restaurantId: '',
        items: [{ menuItemId: 'm1', quantity: 1.5 }],
      }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain('Formato inválido');
    expect(json.details['restaurantId']).toBeDefined();
    expect(json.details['items.0.quantity']).toBeDefined();
  });

  it('devuelve 400 si MESA no trae tableNumber', async () => {
    mockAuth.mockResolvedValueOnce(clientSession);
    const req = jsonRequest('http://localhost/api/orders', {
      method: 'POST',
      body: JSON.stringify(validBody),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain("campo 'tableNumber'");
  });

  it('devuelve 400 con items no disponibles', async () => {
    mockAuth.mockResolvedValueOnce(clientSession);
    mockPrisma.menuItem.findMany.mockResolvedValueOnce([
      { id: 'm1', price: 10, available: false },
    ]);
    const req = jsonRequest('http://localhost/api/orders', {
      method: 'POST',
      body: JSON.stringify({
        ...validBody,
        serviceType: 'MESA',
        tableNumber: 3,
      }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain('no estan disponibles');
    expect(json.unavailable).toContain('m1');
  });

  it('crea el pedido con precio server-side (201)', async () => {
    mockAuth.mockResolvedValueOnce(clientSession);
    mockPrisma.menuItem.findMany.mockResolvedValueOnce([
      { id: 'm1', price: 10, available: true },
    ]);
    const tx = mockTx();
    mockPrisma.$transaction.mockImplementationOnce(
      async (fn: (t: MockTx) => Promise<unknown>) => fn(tx)
    );

    const req = jsonRequest('http://localhost/api/orders', {
      method: 'POST',
      body: JSON.stringify({
        ...validBody,
        serviceType: 'MESA',
        tableNumber: 3,
        items: [{ menuItemId: 'm1', quantity: 2, price: 999 }],
      }),
    });
    const res = await POST(req);
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.data.totalPrice).toBe(20);
    expect(json.data.clientId).toBe('client-1');
    expect(json.data.status).toBe('PENDING');
  });

  it('permite clientId del body solo a roles privilegiados', async () => {
    mockAuth.mockResolvedValueOnce(adminSession);
    mockPrisma.menuItem.findMany.mockResolvedValueOnce([
      { id: 'm1', price: 5, available: true },
    ]);
    const tx = mockTx();
    mockPrisma.$transaction.mockImplementationOnce(
      async (fn: (t: MockTx) => Promise<unknown>) => fn(tx)
    );

    const req = jsonRequest('http://localhost/api/orders', {
      method: 'POST',
      body: JSON.stringify({
        ...validBody,
        serviceType: 'MESA',
        tableNumber: 5,
        clientId: 'client-99',
      }),
    });
    const res = await POST(req);
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.data.clientId).toBe('client-99');
  });
});

describe('GET /api/orders', () => {
  it('devuelve 401 sin sesión', async () => {
    mockAuth.mockResolvedValueOnce(null);
    const req = jsonRequest('http://localhost/api/orders');
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it('filtra por userId propio si el rol no es privilegiado', async () => {
    mockAuth.mockResolvedValueOnce(clientSession);
    mockPrisma.order.findMany.mockResolvedValueOnce([]);
    const req = jsonRequest('http://localhost/api/orders?userId=someone-else');
    const res = await GET(req);
    expect(res.status).toBe(200);
    expect(mockPrisma.order.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { clientId: 'client-1' } })
    );
  });

  it('permite filtrar por otro userId si el rol es privilegiado', async () => {
    mockAuth.mockResolvedValueOnce(adminSession);
    mockPrisma.order.findMany.mockResolvedValueOnce([]);
    const req = jsonRequest('http://localhost/api/orders?userId=client-99');
    const res = await GET(req);
    expect(res.status).toBe(200);
    expect(mockPrisma.order.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { clientId: 'client-99' } })
    );
  });
});
