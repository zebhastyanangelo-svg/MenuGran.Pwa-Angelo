import bcrypt from "bcryptjs";

const SALT_ROUNDS = 10;

export async function hashPin(pin: string): Promise<string> {
  return bcrypt.hash(pin, SALT_ROUNDS);
}

export async function verifyPin(pin: string, hash: string): Promise<boolean> {
  if (!hash) return false;
  // El PIN debe tener exactamente 4 dígitos
  if (typeof pin !== "string" || pin.length !== 4 || !/^\d{4}$/.test(pin)) {
    return false;
  }
  return bcrypt.compare(pin, hash);
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  if (!hash || !password) return false;
  return bcrypt.compare(password, hash);
}

export function maskPhone(phone: string | null | undefined): string {
  if (!phone) return "No registrado";
  if (phone.length < 4) return "*".repeat(phone.length);
  return "*".repeat(phone.length - 4) + phone.slice(-4);
}
