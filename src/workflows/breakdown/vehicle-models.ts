export interface BreakdownVehicle {
  vin: string;
  registration_number: string;
  make: string;
  model: string;
  year: number;
  color?: string;
}

export interface BreakdownCustomer {
  customer_id: string;
  name: string;
  phone: string;
  is_vip: boolean;
}
