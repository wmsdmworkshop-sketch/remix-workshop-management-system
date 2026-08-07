import { Wash } from "./wash-models";

export class WashEngine {
  static startWash(wash: Wash): Wash {
    return { ...wash, status: "IN_PROGRESS", start_time: new Date().toISOString() };
  }

  static completeWash(wash: Wash): Wash {
    return { ...wash, status: "COMPLETED", end_time: new Date().toISOString() };
  }
}
