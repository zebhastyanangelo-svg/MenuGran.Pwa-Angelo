import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { withAuth } from "@/lib/api-auth";
import { auth } from "@/lib/auth-next";
import { OrderStatus, Prisma } from "@prisma/client";
import { CreateOrderSchema, formatZodErrors } from "@/modules/orders/schemas";

// --- Helpers ---

const isPrivileged = (role: string) =>
  role === "ADMIN" || role === "EMPLOYEE" || role === "SUPER_ADMIN";

// --- GET /api/orders ---

export async function GET(request: NextRequest) {
  const session = await withAuth();
  if (session instanceof NextResponse) return session;

  try {
    const { searchParams } = new URL(request.url);
    const requestedUserId = searchParams.get("userId");
    const role = session.user.role;

    // Seguridad IDOR: solo roles privilegiados pueden filtrar por otro userId
    const userId =
      requestedUserId && isPrivileged(role)
        ? requestedUserId
        : session.user.id;

    const orders = await prisma.order.findMany({
      where: { clientId: userId },
      include: {
        client: {
          select: { id: true, name: true, phone: true },
        },
        restaurant: {
          select: { id: true, name: true },
        },
        items: {
          include: {
            menuItem: {
              select: { id: true, name: true, price: true },
            },
          },
        },
        table: {
          select: { number: true },
        },
        rider: {
          select: { id: true, name: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Formatear para el frontend
    const formattedOrders = orders.map((order) => {
      const itemCount = order.items.reduce(
        (sum, item) => sum + item.quantity,
        0
      );

      return {
        id: order.id,
        number: `#${order.id.slice(-4).toUpperCase()}`,
        type: order.deliveryAddress ? 'DELIVERY' : 'LOCAL',
        status: order.status,
        total: order.totalPrice,
        paymentMethod: order.paymentMethod,
        paymentStatus:
          order.status === "PENDING" ||
          order.status === "CANCELLED"
            ? "pending"
            : "confirmed",
        clientName: order.client.name || "Sin nombre",
        clientPhone: order.client.phone || "Sin telefono",
        address:
          order.deliveryAddress ||
          (order.table ? `Mesa ${order.table.number}` : "Mesa"),
        tableNumber: order.table?.number ?? null,
        lat: order.lat,
        lng: order.lng,
        items: itemCount,
        createdAt: order.createdAt.toISOString(),
        riderId: order.riderId,
        riderName: order.rider?.name ?? null,
      };
    });

    return NextResponse.json({ success: true, data: formattedOrders });
  } catch (error) {
    console.error("[GET /api/orders]", error);
    return NextResponse.json(
      { error: "Error al cargar pedidos" },
      { status: 500 }
    );
  }
}

// --- POST /api/orders ---

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    const body = await req.json();

    const parsed = CreateOrderSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Formato inválido en el body",
          details: formatZodErrors(parsed.error),
        },
        { status: 400 }
      );
    }

    const {
      restaurantId,
      items,
      serviceType,
      tableNumber,
      lat,
      lng,
      deliveryAddress,
      paymentMethod,
      clientId: requestedClientId,
    } = parsed.data;

    // Seguridad: clientId nunca proviene del body del cliente normal
    const clientId =
      requestedClientId && isPrivileged(session?.user?.role ?? "")
        ? requestedClientId
        : session?.user?.id;

    if (!clientId) {
      return NextResponse.json(
        { error: "Debes iniciar sesion" },
        { status: 401 }
      );
    }

    const service = serviceType;

    // Validacion temprana: MESA requiere tableNumber
    if (service === "MESA" && !tableNumber) {
      return NextResponse.json(
        {
          error: "Formato inválido en el campo 'tableNumber'",
          details: { tableNumber: ["tableNumber es requerido para servicio MESA"] },
        },
        { status: 400 }
      );
    }

    // Validacion temprana: DELIVERY requiere deliveryAddress
    if (service === "DELIVERY" && !deliveryAddress) {
      return NextResponse.json(
        {
          error: "Formato inválido en el campo 'deliveryAddress'",
          details: { deliveryAddress: ["deliveryAddress es requerido para servicio DELIVERY"] },
        },
        { status: 400 }
      );
    }

    // Batch query en vez de N+1
    const menuItems = await prisma.menuItem.findMany({
      where: {
        id: { in: items.map((i) => i.menuItemId) },
        restaurantId,
      },
      select: { id: true, price: true, available: true },
    });

    const itemMap = new Map(menuItems.map((m) => [m.id, m]));

    // Precio server-side (nunca del body) + validacion de stock
    const orderItems = items
      .map((i) => {
        const m = itemMap.get(i.menuItemId);
        if (!m || !m.available) return null;
        return {
          menuItemId: m.id,
          quantity: i.quantity,
          price: m.price,
        };
      })
      .filter(Boolean) as {
      menuItemId: string;
      quantity: number;
      price: Prisma.Decimal | number;
    }[];

    if (orderItems.length !== items.length) {
      const missing = items.filter((i) => {
        const m = itemMap.get(i.menuItemId);
        return !m || !m.available;
      });
      return NextResponse.json(
        {
          error: "Algunos items no estan disponibles",
          unavailable: missing.map((i) => i.menuItemId),
        },
        { status: 400 }
      );
    }

    const totalPrice = orderItems.reduce(
      (s, i) => s + Number(i.price) * i.quantity,
      0
    );

    // Transaccion para consistencia
    const order = await prisma.$transaction(async (tx) => {
      // Mesa: reutilizar o crear
      let tableId: string | undefined;
      if (service === "MESA" && tableNumber) {
        const existing = await tx.table.findUnique({
          where: {
            restaurantId_number: { restaurantId, number: tableNumber },
          },
        });
        if (existing) {
          tableId = existing.id;
        } else {
          const created = await tx.table.create({
            data: { restaurantId, number: tableNumber },
          });
          tableId = created.id;
        }
      }

      return tx.order.create({
        data: {
          clientId,
          restaurantId,
          totalPrice,
          serviceType: service,
          tableId: tableId ?? null,
          deliveryAddress:
            service === "DELIVERY" ? (deliveryAddress ?? null) : null,
          lat: service === "DELIVERY" ? (lat ?? null) : null,
          lng: service === "DELIVERY" ? (lng ?? null) : null,
          status: OrderStatus.PENDING,
          paymentMethod,
          items: {
            create: orderItems,
          },
        },
        include: {
          client: { select: { name: true, phone: true } },
          restaurant: { select: { name: true } },
          table: { select: { number: true } },
          items: {
            include: {
              menuItem: { select: { name: true, price: true } },
            },
          },
        },
      });
    });

    return NextResponse.json({ success: true, data: order }, { status: 201 });
  } catch (error) {
    console.error("[POST /api/orders]", error);
    return NextResponse.json(
      { error: "Error al crear pedido" },
      { status: 500 }
    );
  }
}