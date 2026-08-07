import React from "react";

/**
 * =============================================================================
 * DWIP Enterprise Platform — JobCardServiceDetails Component (WP-03 UI Refactoring)
 * Bounded Context: Workshop UI / Service & Allocation Info
 * =============================================================================
 */

export interface JobCardServiceDetailsProps {
  jobDescription: string;
  bayNo?: string | number | null;
  serviceAdvisor?: string;
  technicianName?: string;
  noOfLaborers?: number;
}

export const JobCardServiceDetails: React.FC<JobCardServiceDetailsProps> = ({
  jobDescription,
  bayNo,
  serviceAdvisor,
  technicianName,
  noOfLaborers
}) => {
  return (
    <section 
      className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-sm space-y-3"
      aria-label="Service Details and Workforce Allocation"
    >
      <div>
        <h3 className="text-xs uppercase tracking-wider font-semibold text-slate-400 mb-1">
          🔧 Service Scope & Job Description
        </h3>
        <p className="text-sm text-slate-200 leading-relaxed bg-slate-950/50 p-2.5 rounded-lg border border-slate-850">
          {jobDescription || "No detailed job instructions provided."}
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 pt-2 border-t border-slate-800/60 text-xs">
        <div>
          <span className="text-slate-400 block">Bay Assignment</span>
          <span className="font-semibold text-emerald-400 font-mono">
            {bayNo ? `Bay ${bayNo}` : "Queue"}
          </span>
        </div>

        <div>
          <span className="text-slate-400 block">Service Advisor</span>
          <span className="font-medium text-slate-200">
            {serviceAdvisor || "Unassigned"}
          </span>
        </div>

        <div>
          <span className="text-slate-400 block">Primary Technician</span>
          <span className="font-medium text-slate-200">
            {technicianName || "Unassigned"} {noOfLaborers ? `(${noOfLaborers} Techs)` : ""}
          </span>
        </div>
      </div>
    </section>
  );
};
