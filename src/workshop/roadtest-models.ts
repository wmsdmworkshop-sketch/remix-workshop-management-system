export interface RoadTest {
  road_test_id: string;
  job_card_id: string;
  driver_id: string;
  
  distance_km: number;
  observations: string;
  
  status: string; // PASSED, FAILED
  repeat_repair_required: boolean;
  
  start_time: string;
  end_time: string;
}
