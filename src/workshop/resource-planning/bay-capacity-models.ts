export interface BayCapacity {
  workshop_id: string;
  total_bays: number;
  occupied: number;
  reserved: number;
  maintenance: number;
  idle: number;
  available: number;
  
  bay_type_breakdown: {
    pit: number;
    lift: number;
    quick_service: number;
    alignment: number;
    electrical: number;
    engine: number;
    transmission: number;
  };
  
  expected_release_times: { bay_id: string; expected_release: string }[];
}
