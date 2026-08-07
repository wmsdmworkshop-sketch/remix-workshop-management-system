import { RoadTest } from "./roadtest-models";

export class RoadTestEngine {
  static passRoadTest(test: RoadTest, distance: number, observations: string): RoadTest {
    return {
      ...test,
      status: "PASSED",
      distance_km: distance,
      observations,
      end_time: new Date().toISOString(),
      repeat_repair_required: false
    };
  }

  static failRoadTest(test: RoadTest, distance: number, observations: string): RoadTest {
    return {
      ...test,
      status: "FAILED",
      distance_km: distance,
      observations,
      end_time: new Date().toISOString(),
      repeat_repair_required: true
    };
  }
}
