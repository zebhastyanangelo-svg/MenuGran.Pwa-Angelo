import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Sembrando datos de prueba...");

  // Crear Superadmin
  const superadmin = await prisma.user.upsert({
    where: { cedula: "00000001" },
    update: {},
    create: {
      name: "Angelo Superadmin",
      cedula: "00000001",
      role: "SUPERADMIN",
      phone: "04120000001",
      active: true,
    },
  });

  // Crear Admin de restaurante
  const admin = await prisma.user.upsert({
    where: { cedula: "12345678" },
    update: {},
    create: {
      name: "María Dueña",
      cedula: "12345678",
      role: "ADMIN",
      phone: "04121234567",
      active: true,
    },
  });

  // Crear Operador
  const operator = await prisma.user.upsert({
    where: { cedula: "23456789" },
    update: {},
    create: {
      name: "Carlos Operador",
      cedula: "23456789",
      role: "OPERATOR",
      phone: "04129876543",
      active: true,
    },
  });

  // Crear Repartidor
  const rider = await prisma.user.upsert({
    where: { cedula: "34567890" },
    update: {},
    create: {
      name: "Pedro Repartidor",
      cedula: "34567890",
      role: "RIDER",
      phone: "04121112233",
      active: true,
    },
  });

  // Crear Cliente
  const client = await prisma.user.upsert({
    where: { cedula: "11111111" },
    update: {},
    create: {
      name: "Juan Cliente",
      cedula: "11111111",
      role: "CLIENT",
      phone: "04141111111",
      active: true,
    },
  });

  // Crear Negocio
  const business = await prisma.business.create({
    data: {
      name: "Grupo Gastronómico Vargas",
      slug: "grupo-vargas",
      description: "Los mejores restaurantes de la ciudad",
    },
  });

  // Crear Restaurante
  const restaurant = await prisma.restaurant.create({
    data: {
      businessId: business.id,
      adminId: admin.id,
      name: "La Parrilla de Juan",
      address: "Av. Principal, Centro Comercial Plaza Mayor, Caracas",
      phone: "02125551234",
      lat: 10.4806,
      lng: -66.9036,
    },
  });

  // Crear Categorías
  const categorias = await Promise.all([
    prisma.menuCategory.create({
      data: { restaurantId: restaurant.id, name: "Entradas", order: 1 },
    }),
    prisma.menuCategory.create({
      data: { restaurantId: restaurant.id, name: "Platos Fuertes", order: 2 },
    }),
    prisma.menuCategory.create({
      data: { restaurantId: restaurant.id, name: "Bebidas", order: 3 },
    }),
    prisma.menuCategory.create({
      data: { restaurantId: restaurant.id, name: "Postres", order: 4 },
    }),
  ]);

  // Crear Platos
  await prisma.menuItem.createMany({
    data: [
      {
        restaurantId: restaurant.id,
        categoryId: categorias[0].id,
        name: "Tequeños",
        description: "Tequeños de queso llanero con salsa tártara (6 unidades)",
        price: 12.5,
        available: true,
      },
      {
        restaurantId: restaurant.id,
        categoryId: categorias[0].id,
        name: "Arepitas de Chicharrón",
        description: "Mini arepas con chicharrón y salsa criolla",
        price: 15.0,
        available: true,
      },
      {
        restaurantId: restaurant.id,
        categoryId: categorias[1].id,
        name: "Parrilla Mixta",
        description: "Carne, pollo, chorizo, morcilla con papas fritas y ensalada",
        price: 45.0,
        available: true,
      },
      {
        restaurantId: restaurant.id,
        categoryId: categorias[1].id,
        name: "Hamburguesa Clásica",
        description: "Doble carne, queso, lechuga, tomate y papas fritas",
        price: 28.0,
        available: true,
      },
      {
        restaurantId: restaurant.id,
        categoryId: categorias[2].id,
        name: "Refresco",
        description: "Coca-Cola, Pepsi, Malta (lata 355ml)",
        price: 3.5,
        available: true,
      },
      {
        restaurantId: restaurant.id,
        categoryId: categorias[3].id,
        name: "Torta Tres Leches",
        description: "Porción de torta tres leches casera",
        price: 8.0,
        available: true,
      },
    ],
  });

  console.log("✅ Datos de prueba creados:");
  console.log("   Superadmin:", superadmin.cedula);
  console.log("   Admin:", admin.cedula);
  console.log("   Operador:", operator.cedula);
  console.log("   Repartidor:", rider.cedula);
  console.log("   Cliente:", client.cedula);
  console.log("   Restaurante:", restaurant.name);
}

main()
  .catch((e) => {
    console.error("❌ Error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });