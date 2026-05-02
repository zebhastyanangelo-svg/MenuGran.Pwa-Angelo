'use server';

import prisma from '@/lib/db';
import { getUserByCedula, verifyPIN } from '@/lib/auth';

export async function loginWithCredentials(cedula: string, pin: string) {
  try {
    if (!cedula || !pin) {
      return { success: false, error: 'Cédula y PIN requeridos' };
    }

    const user = await getUserByCedula(cedula);

    if (!user) {
      return { success: false, error: 'Usuario no encontrado' };
    }

    if (!user.active) {
      return { success: false, error: 'Usuario inactivo' };
    }

    const pinValid = await verifyPIN(user.id, pin);
    if (!pinValid) {
      return { success: false, error: 'PIN incorrecto' };
    }

    return {
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        cedula: user.cedula,
        role: user.role,
      },
    };
  } catch (error) {
    console.error('[loginWithCredentials]', error);
    return { success: false, error: 'Error en el servidor' };
  }
}

export async function registerUser(data: {
  name: string;
  email: string;
  cedula: string;
  phone: string;
  role?: string;
  pin: string;
}) {
  try {
    const existingUser = await getUserByCedula(data.cedula);
    if (existingUser) {
      return { success: false, error: 'Cédula ya registrada' };
    }

    const user = await prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        cedula: data.cedula,
        phone: data.phone,
        pin: data.pin,
        role: data.role ? (data.role as any) : 'CLIENT',
      },
    });

    return { success: true, user };
  } catch (error) {
    console.error('[registerUser]', error);
    return { success: false, error: 'Error al registrar' };
  }
}
