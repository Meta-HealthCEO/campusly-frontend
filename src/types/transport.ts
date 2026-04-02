// ============================================================
// Transport Types
// ============================================================

export interface TransportRoute {
  id: string;
  name: string;
  description: string;
  driverId: string;
  driverName: string;
  driverPhone: string;
  vehicleReg: string;
  stops: TransportStop[];
  studentIds: string[];
  isActive: boolean;
}

export interface TransportStop {
  id: string;
  name: string;
  address: string;
  time: string;
  order: number;
}
