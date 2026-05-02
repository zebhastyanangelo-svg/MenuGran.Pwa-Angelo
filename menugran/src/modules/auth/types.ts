export interface AuthUser {
  id: string;
  email: string | null;
  name: string;
  role: 'CLIENT' | 'OPERATOR' | 'ADMIN' | 'RIDER' | 'SUPERADMIN';
  cedula?: string;
  phone?: string;
  image?: string;
  active: boolean;
}

export interface LoginResponse {
  success: boolean;
  message: string;
  user?: AuthUser;
  token?: string;
}

export interface RegisterInput {
  name: string;
  email: string;
  cedula: string;
  phone: string;
  role?: string;
}

export interface PINLoginInput {
  cedula: string;
  pin: string;
}
