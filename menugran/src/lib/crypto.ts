import bcrypt from "bcryptjs";

const SALT_ROUNDS = 10;

export async function hashPin(pin: string): Promise<string> {
  return bcrypt.hash(pin, SALT_ROUNDS);
}

export async function verifyPin(pin: string, hash: string): Promise<boolean> {
  if (!hash) return false;
  return bcrypt.compare(pin, hash);
}

export function maskPhone(phone: string | null | undefined): string {
  if (!phone) return "No registrado";
  if (phone.length < 4) return "*".repeat(phone.length);
  return "*".repeat(phone.length - 4) + phone.slice(-4);
}
