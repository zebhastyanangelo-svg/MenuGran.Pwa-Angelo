import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log(" Sembrando datos de prueba...");

  // ──────────────────────────────────────
  // USUARIOS CON PIN
  // ──────────────────────────────────────

  const superadmin = await prisma.user.upsert({
    where: { cedula: "00000001" },
    update: {},
    create: {
      name: "Angelo Superadmin",
      cedula: "00000001",
      pin: "1111",
      role: "SUPERADMIN",
      phone: "04120000001",
      active: true,
    },
  });

  const admin = await prisma.user.upsert({
    where: { cedula: "12345678" },
    update: {},
    create: {
      name: "María Dueña",
      cedula: "12345678",
      pin: "2222",
      role: "ADMIN",
      phone: "04121234567",
      active: true,
    },
  });

  const operator = await prisma.user.upsert({
    where: { cedula: "23456789" },
    update: {},
    create: {
      name: "Carlos Operador",
      cedula: "23456789",
      pin: "3333",
      role: "OPERATOR",
      phone: "04129876543",
      active: true,
    },
  });

  const rider = await prisma.user.upsert({
    where: { cedula: "34567890" },
    update: {},
    create: {
      name: "Pedro Repartidor",
      cedula: "34567890",
      pin: "4444",
      role: "RIDER",
      phone: "04121112233",
      active: true,
    },
  });

  const client1 = await prisma.user.upsert({
    where: { cedula: "11111111" },
    update: {},
    create: {
      name: "Juan Cliente",
      cedula: "11111111",
      pin: "5555",
      role: "CLIENT",
      phone: "04141111111",
      active: true,
    },
  });

  const client2 = await prisma.user.upsert({
    where: { cedula: "22222222" },
    update: {},
    create: {
      name: "Ana García",
      cedula: "22222222",
      pin: "6666",
      role: "CLIENT",
      phone: "04142222222",
      active: true,
    },
  });

  // ──────────────────────────────────────
  // NEGOCIO
  // ──────────────────────────────────────

  const business = await prisma.business.upsert({
    where: { slug: "grupo-vargas" },
    update: {},
    create: {
      name: "Grupo Gastronómico Vargas",
      slug: "grupo-vargas",
      description: "Los mejores restaurantes de la ciudad",
    },
  });

  // ──────────────────────────────────────
  // RESTAURANTE 1: La Parrilla de Juan
  // ──────────────────────────────────────

  const r1 = await prisma.restaurant.create({
    data: {
      businessId: business.id,
      adminId: admin.id,
      name: "La Parrilla de Juan",
      address: "Av. Principal, CC Plaza Mayor, Caracas",
      phone: "02125551234",
      lat: 10.4806,
      lng: -66.9036,
    },
  });

  const cat1_1 = await prisma.menuCategory.create({ data: { restaurantId: r1.id, name: "Entradas", order: 1 } });
  const cat1_2 = await prisma.menuCategory.create({ data: { restaurantId: r1.id, name: "Platos Fuertes", order: 2 } });
  const cat1_3 = await prisma.menuCategory.create({ data: { restaurantId: r1.id, name: "Bebidas", order: 3 } });
  const cat1_4 = await prisma.menuCategory.create({ data: { restaurantId: r1.id, name: "Postres", order: 4 } });

  await prisma.menuItem.createMany({
    data: [
      { restaurantId: r1.id, categoryId: cat1_1.id, name: "Tequeños", description: "Queso llanero con salsa tártara (6 unidades)", price: 12.5, available: true },
      { restaurantId: r1.id, categoryId: cat1_1.id, name: "Arepitas de Chicharrón", description: "Mini arepas con chicharrón y salsa criolla", price: 15.0, available: true },
      { restaurantId: r1.id, categoryId: cat1_2.id, name: "Parrilla Mixta", description: "Carne, pollo, chorizo, morcilla con papas fritas y ensalada", price: 45.0, available: true },
      { restaurantId: r1.id, categoryId: cat1_2.id, name: "Hamburguesa Clásica", description: "Doble carne, queso, lechuga, tomate y papas fritas", price: 28.0, available: true },
      { restaurantId: r1.id, categoryId: cat1_3.id, name: "Refresco", description: "Coca-Cola, Pepsi, Malta (lata 355ml)", price: 3.5, available: true },
      { restaurantId: r1.id, categoryId: cat1_3.id, name: "Jugo Natural", description: "Naranja, fresa, mango", price: 5.0, available: true },
      { restaurantId: r1.id, categoryId: cat1_4.id, name: "Torta Tres Leches", description: "Porción de torta tres leches casera", price: 8.0, available: true },
      { restaurantId: r1.id, categoryId: cat1_4.id, name: "Marquesa de Chocolate", description: "Postre frío de chocolate y galletas", price: 9.0, available: true },
    ],
  });

  console.log("    Restaurante 1: La Parrilla de Juan");

  // ──────────────────────────────────────
  // RESTAURANTE 2: Arepas Doña Rosa
  // ──────────────────────────────────────

  const r2 = await prisma.restaurant.create({
    data: {
      businessId: business.id,
      adminId: admin.id,
      name: "Arepas Doña Rosa",
      address: "Calle 72 #10-34, Maracaibo",
      phone: "02615559876",
      lat: 10.6427,
      lng: -71.6125,
    },
  });

  const cat2_1 = await prisma.menuCategory.create({ data: { restaurantId: r2.id, name: "Arepas", order: 1 } });
  const cat2_2 = await prisma.menuCategory.create({ data: { restaurantId: r2.id, name: "Platos", order: 2 } });
  const cat2_3 = await prisma.menuCategory.create({ data: { restaurantId: r2.id, name: "Bebidas", order: 3 } });
  const cat2_4 = await prisma.menuCategory.create({ data: { restaurantId: r2.id, name: "Postres", order: 4 } });

  await prisma.menuItem.createMany({
    data: [
      { restaurantId: r2.id, categoryId: cat2_1.id, name: "Arepa Pelúa", description: "Carne mechada con queso amarillo", price: 18.0, available: true },
      { restaurantId: r2.id, categoryId: cat2_1.id, name: "Arepa Reina Pepiada", description: "Pollo, aguacate y mayonesa", price: 20.0, available: true },
      { restaurantId: r2.id, categoryId: cat2_1.id, name: "Arepa de Pabellón", description: "Carne mechada, caraotas, queso y plátano", price: 22.0, available: true },
      { restaurantId: r2.id, categoryId: cat2_2.id, name: "Pabellón Criollo", description: "Carne mechada, arroz, caraotas y plátano frito", price: 35.0, available: true },
      { restaurantId: r2.id, categoryId: cat2_2.id, name: "Cachapa con Queso", description: "Cachapa de maíz tierno con queso de mano", price: 15.0, available: true },
      { restaurantId: r2.id, categoryId: cat2_3.id, name: "Papelón con Limón", description: "Bebida tradicional venezolana", price: 4.0, available: true },
      { restaurantId: r2.id, categoryId: cat2_3.id, name: "Chicha Andina", description: "Chicha de arroz con canela y leche condensada", price: 6.0, available: true },
      { restaurantId: r2.id, categoryId: cat2_4.id, name: "Dulce de Lechosa", description: "Dulce típico de papaya verde", price: 7.0, available: true },
      { restaurantId: r2.id, categoryId: cat2_4.id, name: "Quesillo", description: "Flan venezolano tradicional", price: 8.0, available: true },
    ],
  });

  console.log("    Restaurante 2: Arepas Doña Rosa");

  // ──────────────────────────────────────
  // RESTAURANTE 3: Sushi Express
  // ──────────────────────────────────────

  const r3 = await prisma.restaurant.create({
    data: {
      businessId: business.id,
      adminId: admin.id,
      name: "Sushi Express",
      address: "Av. Libertador, CC Sambil, Caracas",
      phone: "02124443322",
      lat: 10.4960,
      lng: -66.8800,
    },
  });

  const cat3_1 = await prisma.menuCategory.create({ data: { restaurantId: r3.id, name: "Rolls", order: 1 } });
  const cat3_2 = await prisma.menuCategory.create({ data: { restaurantId: r3.id, name: "Nigiris", order: 2 } });
  const cat3_3 = await prisma.menuCategory.create({ data: { restaurantId: r3.id, name: "Bebidas", order: 3 } });
  const cat3_4 = await prisma.menuCategory.create({ data: { restaurantId: r3.id, name: "Postres", order: 4 } });

  await prisma.menuItem.createMany({
    data: [
      { restaurantId: r3.id, categoryId: cat3_1.id, name: "California Roll", description: "Cangrejo, aguacate, pepino (8 piezas)", price: 25.0, available: true },
      { restaurantId: r3.id, categoryId: cat3_1.id, name: "Dragon Roll", description: "Tempura de camarón, aguacate, salsa eel (8 piezas)", price: 30.0, available: true },
      { restaurantId: r3.id, categoryId: cat3_1.id, name: "Philadelphia Roll", description: "Salmón, queso crema, pepino (8 piezas)", price: 28.0, available: true },
      { restaurantId: r3.id, categoryId: cat3_2.id, name: "Nigiri de Salmón", description: "2 piezas de salmón fresco sobre arroz", price: 18.0, available: true },
      { restaurantId: r3.id, categoryId: cat3_2.id, name: "Nigiri de Atún", description: "2 piezas de atún rojo sobre arroz", price: 20.0, available: true },
      { restaurantId: r3.id, categoryId: cat3_3.id, name: "Té Verde", description: "Té verde japonés caliente", price: 4.0, available: true },
      { restaurantId: r3.id, categoryId: cat3_3.id, name: "Ramune", description: "Refresco japonés sabor fresa o melón", price: 7.0, available: true },
      { restaurantId: r3.id, categoryId: cat3_4.id, name: "Mochi", description: "Helado japonés envuelto en masa de arroz (2 unidades)", price: 10.0, available: true },
      { restaurantId: r3.id, categoryId: cat3_4.id, name: "Helado de Té Matcha", description: "Helado artesanal de té verde matcha", price: 8.0, available: true },
    ],
  });

  console.log("   Restaurante 3: Sushi Express");

  // ──────────────────────────────────────
  // RESUMEN
  // ──────────────────────────────────────

  console.log("\n DATOS DE PRUEBA CREADOS:");
  console.log("    Superadmin: 00000001 / 1111");
  console.log("    Admin:      12345678 / 2222");
  console.log("    Operador:   23456789 / 3333");
  console.log("    Repartidor: 34567890 / 4444");
  console.log("    Cliente 1:  11111111 / 5555");
  console.log("    Cliente 2:  22222222 / 6666");
  console.log("   Negocio:    Grupo Gastronómico Vargas");
  console.log("     Restaurantes: 3");
  console.log("    Platos: 25+");
}

main()
  .catch((e) => {
    console.error(" Error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });