export interface OrderItem {
  id: string;
  orderId: string;
  menuItemId: string;
  quantity: number;
  price: number;
  observations?: string;
}

export interface Order {
  id: string;
  clientId: string;
  restaurantId: string;
  riderId?: string;
  status: 'PENDING' | 'CONFIRMED' | 'PREPARING' | 'READY' | 'DELIVERING' | 'DELIVERED' | 'CANCELLED';
  total: number;
  paymentMethod: 'CASH' | 'MOBILE_PAYMENT' | 'TRANSFER';
  items: OrderItem[];
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateOrderInput {
  restaurantId: string;
  items: Array<{
    menuItemId: string;
    quantity: number;
    observations?: string;
  }>;
  paymentMethod: string;
}
