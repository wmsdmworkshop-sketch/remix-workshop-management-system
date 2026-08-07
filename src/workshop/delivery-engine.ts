import { VehicleDelivery } from "./delivery-models";

export class DeliveryEngine {
  static initiateDelivery(delivery: VehicleDelivery): VehicleDelivery {
    return { ...delivery, status: "READY_FOR_DELIVERY" };
  }

  static completeDelivery(delivery: VehicleDelivery): VehicleDelivery {
    if (!delivery.invoice_linked) {
      throw new Error("Cannot deliver vehicle without linked invoice");
    }
    if (delivery.payment_status !== "COMPLETED") {
      throw new Error("Cannot deliver vehicle without completed payment");
    }
    
    return { ...delivery, status: "DELIVERED", delivery_time: new Date().toISOString() };
  }
}
