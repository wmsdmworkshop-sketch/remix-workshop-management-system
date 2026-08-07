import React from "react";
import { JobCardHeader, JobCardHeaderProps } from "./JobCardHeader";
import { JobCardCustomerSection, JobCardCustomerSectionProps } from "./JobCardCustomerSection";
import { JobCardServiceDetails, JobCardServiceDetailsProps } from "./JobCardServiceDetails";
import { JobCardActionToolbar, JobCardActionToolbarProps } from "./JobCardActionToolbar";
import { JobCardTimeline, JobCardTimelineProps } from "./JobCardTimeline";

export * from "./JobCardHeader";
export * from "./JobCardCustomerSection";
export * from "./JobCardServiceDetails";
export * from "./JobCardActionToolbar";
export * from "./JobCardTimeline";

export interface ModularJobCardProps {
  header: JobCardHeaderProps;
  customer: JobCardCustomerSectionProps;
  service: JobCardServiceDetailsProps;
  actions?: JobCardActionToolbarProps;
  timeline?: JobCardTimelineProps;
}

export const ModularJobCard: React.FC<ModularJobCardProps> = ({
  header,
  customer,
  service,
  actions,
  timeline
}) => {
  return (
    <article className="max-w-4xl mx-auto space-y-4 p-4 rounded-2xl bg-slate-950 border border-slate-850 shadow-2xl text-slate-100 font-sans">
      <JobCardHeader {...header} />
      <JobCardCustomerSection {...customer} />
      <JobCardServiceDetails {...service} />
      {actions && <JobCardActionToolbar {...actions} />}
      {timeline && <JobCardTimeline {...timeline} />}
    </article>
  );
};
