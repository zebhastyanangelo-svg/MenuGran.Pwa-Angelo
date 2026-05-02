export interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  image?: string;
  categoryId: string;
  available: boolean;
  restaurantId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface MenuCategory {
  id: string;
  name: string;
  description?: string;
  restaurantId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Restaurant {
  id: string;
  name: string;
  description?: string;
  address: string;
  phone: string;
  image?: string;
  businessId: string;
  adminId: string;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}
