export interface DeliveryLocation {
  id: string;
  riderId: string;
  latitude: number;
  longitude: number;
  accuracy?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface RiderStatus {
  id: string;
  riderId: string;
  status: 'AVAILABLE' | 'BUSY' | 'INACTIVE';
  currentOrderId?: string;
  latitude: number;
  longitude: number;
  updatedAt: Date;
}

export interface DeliveryEstimate {
  distanceKm: number;
  estimatedMinutes: number;
  costEstimate: number;
}
