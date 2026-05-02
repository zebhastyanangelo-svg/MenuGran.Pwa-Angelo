import { z } from 'zod';

export const PINSchema = z
  .string()
  .min(4, 'PIN debe tener 4 dígitos')
  .max(4, 'PIN máximo 4 dígitos')
  .regex(/^\d+$/, 'PIN solo debe contener números');

export const CedulaSchema = z
  .string()
  .min(8, 'Cédula muy corta')
  .max(12, 'Cédula muy larga')
  .regex(/^\d+$/, 'Cédula solo debe contener números');

export function generateRandomPIN(): string {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

export function validatePIN(pin: string): boolean {
  return PINSchema.safeParse(pin).success;
}

export function validateCedula(cedula: string): boolean {
  return CedulaSchema.safeParse(cedula).success;
}
