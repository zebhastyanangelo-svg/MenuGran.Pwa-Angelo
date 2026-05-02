import prisma from '@/lib/db';
import { calculateDistance, estimateDeliveryTime } from '@/lib/geo';

export async function updateRiderLocation(
  userId: string, // This is the rider's user ID
  latitude: number,
  longitude: number
) {
  try {
    const location = await prisma.location.upsert({
      where: { userId },
      update: { latitude, longitude },
      create: {
        userId,
        latitude,
        longitude,
      },
    });

    return { success: true, data: location };
  } catch (error) {
    console.error('[updateRiderLocation]', error);
    return { success: false, error: 'Error al actualizar ubicación' };
  }
}

export async function getRiderLocation(userId: string) {
  try {
    const location = await prisma.location.findUnique({
      where: { userId },
    });

    if (!location) {
      return { success: false, error: 'Ubicación no encontrada' };
    }

    return { success: true, data: location };
  } catch (error) {
    console.error('[getRiderLocation]', error);
    return { success: false, error: 'Error al obtener ubicación' };
  }
}

export async function findNearbyRiders(
  latitude: number,
  longitude: number,
  radiusKm: number = 5
) {
  try {
    const locations = await prisma.location.findMany({
      include: {
        user: {
          select: {
            id: true,
            name: true,
            phone: true,
          },
        },
      },
    });

    const nearby = locations.filter((l) => {
      const distance = calculateDistance(
        { latitude, longitude },
        { latitude: l.latitude, longitude: l.longitude }
      );
      return distance <= radiusKm;
    });

    return { success: true, data: nearby };
  } catch (error) {
    console.error('[findNearbyRiders]', error);
    return { success: false, error: 'Error al buscar repartidores' };
  }
}

export async function estimateDelivery(
  pickupLat: number,
  pickupLon: number,
  dropoffLat: number,
  dropoffLon: number
) {
  try {
    const distance = calculateDistance(
      { latitude: pickupLat, longitude: pickupLon },
      { latitude: dropoffLat, longitude: dropoffLon }
    );

    const estimatedMinutes = estimateDeliveryTime(distance);
    const costEstimate = distance * 5000; // $5000 per km (ejemplo)

    return {
      success: true,
      data: {
        distanceKm: distance,
        estimatedMinutes,
        costEstimate,
      },
    };
  } catch (error) {
    console.error('[estimateDelivery]', error);
    return { success: false, error: 'Error al estimar entrega' };
  }
}

