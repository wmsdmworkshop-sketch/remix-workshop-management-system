import React from "react";
import ServiceAdvisorWorkspace from "../components/ServiceAdvisorWorkspace";
import TechnicianWorkspace from "../components/TechnicianWorkspace";
import FloorSupervisorWorkspace from "../components/FloorSupervisorWorkspace";
import BillingWorkspace from "../components/BillingWorkspace";
import CashierWorkspace from "../components/CashierWorkspace";
import ReceptionistWorkspace from "../components/ReceptionistWorkspace";
import SecurityWorkspace from "../components/SecurityWorkspace";

// Mirrors App.tsx's own ROLE_ALIASES — kept as a small, self-contained copy
// here rather than extracting App.tsx's function-scoped consts to module
// scope, which would touch far more of that file for a 6-entry lookup table.
const ROLE_ALIASES: Record<string, string> = {
  electrician: "technician",
  mechanical_helper: "technician",
  wheel_alignment: "technician",
  biller: "billing",
  parts_picker: "parts",
  spare_parts_manager: "spares_manager",
};

const ROLE_TO_WORKSPACE: Record<string, React.ComponentType<any>> = {
  service_advisor: ServiceAdvisorWorkspace,
  technician: TechnicianWorkspace,
  floor_supervisor: FloorSupervisorWorkspace,
  floor_incharge: FloorSupervisorWorkspace,
  supervisor: FloorSupervisorWorkspace,
  billing: BillingWorkspace,
  cashier: CashierWorkspace,
  reception: ReceptionistWorkspace,
  receptionist: ReceptionistWorkspace,
  security_agent: SecurityWorkspace,
};

/**
 * My Workspace dispatcher. Individual-operator roles land on their own
 * dedicated, already-real workspace component instead of the generic
 * MyWorkspace.tsx fallback — same components, same props App.tsx already
 * passes to their (former) standalone tabs, just reached through the one
 * "My Workspace" nav entry now. Returns null for any role with no dedicated
 * component (manager-tier roles, parts_incharge, warranty_clerk, accounts,
 * dkam, dealer_principal, admin, developer, etc.) so the caller falls back
 * to the generic MyWorkspace.tsx.
 */
export function resolveMyWorkspaceComponent(role: unknown): React.ComponentType<any> | null {
  if (!role) return null;
  const key = String(role).toLowerCase().trim().replace(/[\s_]+/g, "_");
  return ROLE_TO_WORKSPACE[key] || ROLE_TO_WORKSPACE[ROLE_ALIASES[key]] || null;
}
