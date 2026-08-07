export interface Lift {
  lift_id: string;
  name: string;
  capacity_tons: number;
  preventive_maintenance_due: boolean;
  last_inspection_date: string;
  status: string; // FUNCTIONAL, OUT_OF_ORDER
}
