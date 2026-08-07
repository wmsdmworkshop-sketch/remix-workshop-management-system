import React from "react";

/**
 * =============================================================================
 * DWIP Enterprise Platform — JobCardCustomerSection Component (WP-03 UI Refactoring)
 * Bounded Context: Workshop UI / Customer & Vehicle Info
 * =============================================================================
 */

export interface JobCardCustomerSectionProps {
  customerName: string;
  customerMobile: string;
  vehicleMake: string;
  vehicleModel: string;
  vehicleYear?: number;
  kmReading?: number;
}

export const JobCardCustomerSection: React.FC<JobCardCustomerSectionProps> = ({
  customerName,
  customerMobile,
  vehicleMake,
  vehicleModel,
  vehicleYear,
  kmReading
}) => {
  return (
    <section 
      className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-sm grid grid-cols-1 md:grid-cols-2 gap-4"
      aria-label="Customer and Vehicle Information"
    >
      <div>
        <h3 className="text-xs uppercase tracking-wider font-semibold text-slate-400 mb-2">
          👤 Customer Details
        </h3>
        <p className="text-sm font-medium text-slate-100">{customerName}</p>
        <p className="text-xs text-amber-400 font-mono mt-0.5">{customerMobile}</p>
      </div>

      <div>
        <h3 className="text-xs uppercase tracking-wider font-semibold text-slate-400 mb-2">
          🚛 Vehicle Specifications
        </h3>
        <p className="text-sm font-medium text-slate-100">
          {vehicleMake} {vehicleModel} {vehicleYear ? `(${vehicleYear})` : ""}
        </p>
        {kmReading !== undefined && (
          <p className="text-xs text-slate-400 font-mono mt-0.5">
            Odometer: <span className="text-slate-200">{kmReading.toLocaleString()} km</span>
          </p>
        )}
      </div>
    </section>
  );
};
