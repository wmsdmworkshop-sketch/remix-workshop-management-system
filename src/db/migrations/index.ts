/**
 * Migration Registry
 * 
 * All migrations must be imported and registered here.
 * The migration runner will execute them in version order.
 * 
 * To add a new migration:
 * 1. Create a new file in src/db/migrations/ (e.g., 003_my_change.ts)
 * 2. Import it here
 * 3. Add it to the `allMigrations` array
 */

import type { Migration } from "../migrate.ts";
import baseline from "./001_baseline.ts";
import authorizationEngine from "./002_authorization_engine.ts";
import rolePermissionsColumns from "./003_role_permissions_columns.ts";
import ensureRolePermissionsTable from "./004_ensure_role_permissions_table.ts";
import modulesMasterSeeding from "./005_modules_master_seeding.ts";
import dropRolePermissionsFkConstraints from "./006_drop_role_permissions_fk_constraints.ts";
import workforceEligibilityAttributes from "./007_workforce_eligibility_attributes.ts";
import billingTables from "./008_billing_tables.ts";
import gateOutTables from "./009_gate_out_tables.ts";
import qcRoadTests from "./010_qc_road_tests.ts";
import floorExecutionTables from "./011_floor_execution_tables.ts";
import leaveManagement from "./012_leave_management.ts";
import holidaysManagement from "./013_holidays_management.ts";
import trainingDevelopment from "./014_training_development.ts";
import grievanceManagement from "./015_grievance_management.ts";
import jobCardMasterEarlyCreation from "./016_job_card_master_early_creation.ts";
import repointJobFksToMaster from "./017_repoint_job_fks_to_master.ts";
import uniqueRevenuePerJob from "./018_unique_revenue_per_job.ts";
import revenueAutoincrementIds from "./019_revenue_autoincrement_ids.ts";
import realBayRoster from "./020_real_bay_roster.ts";
import retireLastInventedBays from "./021_retire_last_invented_bays.ts";
import iceBaysInBaysTable from "./022_ice_bays_in_bays_table.ts";
import closeCompletedManagerAssignments from "./023_close_completed_manager_assignments.ts";
import advisorPartsAtEstimation from "./024_advisor_parts_at_estimation.ts";
import ocrEvidenceUserMediaTypes from "./025_ocr_evidence_user_media_types.ts";
import qcModuleFloorAndManagers from "./026_qc_module_floor_and_managers.ts";
import mergeFloorRoles from "./027_merge_floor_roles.ts";
import handoffSlaMissingColumns from "./028_handoff_sla_missing_columns.ts";
import missingPermissionModules from "./029_missing_permission_modules.ts";
import evidenceGateoutColumns from "./030_evidence_gateout_columns.ts";
import saPreInvoiceModule from "./031_sa_pre_invoice_module.ts";
import loginHistoryRelaxFk from "./032_login_history_relax_fk.ts";
export const allMigrations: Migration[] = [
  baseline,
  modulesMasterSeeding,
  ensureRolePermissionsTable,
  authorizationEngine,
  rolePermissionsColumns,
  dropRolePermissionsFkConstraints,
  workforceEligibilityAttributes,
  billingTables,
  gateOutTables,
  qcRoadTests,
  floorExecutionTables,
  leaveManagement,
  holidaysManagement,
  trainingDevelopment,
  grievanceManagement,
  jobCardMasterEarlyCreation,
  repointJobFksToMaster,
  uniqueRevenuePerJob,
  revenueAutoincrementIds,
  realBayRoster,
  retireLastInventedBays,
  iceBaysInBaysTable,
  closeCompletedManagerAssignments,
  advisorPartsAtEstimation,
  ocrEvidenceUserMediaTypes,
  qcModuleFloorAndManagers,
  mergeFloorRoles,
  handoffSlaMissingColumns,
  missingPermissionModules,
  evidenceGateoutColumns,
  saPreInvoiceModule,
  loginHistoryRelaxFk
];
