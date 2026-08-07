export interface BreakdownLocation {
  latitude: number;
  longitude: number;
  google_maps_link: string;
  
  nearest_dealer_id?: string;
  nearest_workshop_id?: string;
  nearest_qrt_id?: string;
  
  distance_to_workshop_km?: number;
  
  region?: string;
  state?: string;
  district?: string;
  highway?: string;
  landmark?: string;
}
