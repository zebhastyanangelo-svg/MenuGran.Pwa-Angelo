import prisma from '@/lib/db';

export async function getRestaurantMenu(restaurantId: string) {
  try {
    const categories = await prisma.menuCategory.findMany({
      where: { restaurantId },
      include: {
        items: {
          where: { available: true },
        },
      },
    });

    return { success: true, data: categories };
  } catch (error) {
    console.error('[getRestaurantMenu]', error);
    return { success: false, error: 'Error al obtener menú' };
  }
}

export async function getMenuItems(restaurantId: string, categoryId?: string) {
  try {
    const where: any = { restaurantId, available: true };
    if (categoryId) {
      where.categoryId = categoryId;
    }

    const items = await prisma.menuItem.findMany({ where });
    return { success: true, data: items };
  } catch (error) {
    console.error('[getMenuItems]', error);
    return { success: false, error: 'Error al obtener items' };
  }
}

export async function getRestaurantById(id: string) {
  try {
    const restaurant = await prisma.restaurant.findUnique({
      where: { id },
      include: {
        admin: {
          select: { name: true, email: true },
        },
      },
    });

    return { success: true, data: restaurant };
  } catch (error) {
    console.error('[getRestaurantById]', error);
    return { success: false, error: 'Error al obtener restaurante' };
  }
}

export async function searchRestaurants(query: string) {
  try {
    const restaurants = await prisma.restaurant.findMany({
      where: {
        active: true,
        OR: [{ name: { contains: query, mode: 'insensitive' } }],
      },
      take: 10,
    });

    return { success: true, data: restaurants };
  } catch (error) {
    console.error('[searchRestaurants]', error);
    return { success: false, error: 'Error en búsqueda' };
  }
}
