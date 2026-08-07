import { Forecast } from "./forecast-models";

export class ForecastEngine {
  static generateForecast(workshopId: string, date: string, historicalAverage: number): Forecast {
    return {
      forecast_id: `FC-${Math.floor(Math.random() * 10000)}`,
      workshop_id: workshopId,
      target_date: date,
      expected_incoming_vehicles: Math.floor(historicalAverage * 1.1), // 10% growth mock
      expected_labour_hours: historicalAverage * 2.5,
      expected_parts_consumption: historicalAverage * 1.5,
      expected_bay_occupancy: 80,
      expected_revenue: historicalAverage * 5000,
      expected_technician_load: 85
    };
  }
}
