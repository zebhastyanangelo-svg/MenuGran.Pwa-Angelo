// Tipos para la aplicación MenuGran

export type UserRole = "CLIENT" | "OPERATOR" | "ADMIN" | "RIDER" | "SUPERADMIN";

export type OrderStatus = 
  | "PENDING" 
  | "CONFIRMED" 
  | "PREPARING" 
  | "READY" 
  | "DELIVERING" 
  | "DELIVERED" 
  | "CANCELLED";

export interface User {
  id: string;
  email: string;
  name: string;
  phone?: string;
  role: UserRole;
  avatar?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  image?: string;
  available: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Order {
  id: string;
  clientId: string;
  client?: User;
  status: OrderStatus;
  items: OrderItem[];
  totalPrice: number;
  deliveryAddress: string;
  lat?: number;
  lng?: number;
  estimatedDelivery?: Date;
  rideId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface OrderItem {
  id: string;
  orderId: string;
  menuItemId: string;
  menuItem?: MenuItem;
  quantity: number;
  price: number;
}

export interface Location {
  lat: number;
  lng: number;
  timestamp: Date;
}

export interface Business {
  id: string;
  name: string;
  description?: string;
  logo?: string;
  address: string;
  lat: number;
  lng: number;
  phone: string;
  createdAt: Date;
  updatedAt: Date;
}

export type ApiResponse<T> =
  | {
      success: true;
      data: T;
    }
  | {
      success: false;
      error: string;
      code?: string;
    };
