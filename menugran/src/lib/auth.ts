import prisma from './db';

export async function updateUserSession(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      image: true,
      phone: true,
      cedula: true,
      active: true,
    },
  });
  return user;
}

export async function getUserByEmail(email: string) {
  return prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      image: true,
      cedula: true,
      pin: true,
      active: true,
    },
  });
}

export async function getUserByCedula(cedula: string) {
  return prisma.user.findUnique({
    where: { cedula },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      image: true,
      cedula: true,
      phone: true,
      active: true,
    },
  });
}

export async function verifyPIN(userId: string, pin: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { pin: true },
  });
  return user?.pin === pin;
}

export function canAccessAdminPanel(role: string): boolean {
  return ['ADMIN', 'SUPERADMIN'].includes(role);
}

export function canAccessOperatorPanel(role: string): boolean {
  return ['OPERATOR', 'ADMIN', 'SUPERADMIN'].includes(role);
}

export function canAccessRiderPanel(role: string): boolean {
  return ['RIDER', 'ADMIN', 'SUPERADMIN'].includes(role);
}

export function canAccessClientPanel(role: string): boolean {
  return ['CLIENT', 'ADMIN', 'SUPERADMIN'].includes(role);
}


