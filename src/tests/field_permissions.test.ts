import { resolveFieldPermission, enforceFieldPermissions } from "../core/security/field-permissions.ts";

const rules: any = [
  { role: "ANY", workflow_stage: "ANY", field_name: "system_job_card_no", permission_level: "LOCKED" },
  { role: "service_advisor", workflow_stage: "Draft", field_name: "odometer", permission_level: "EDIT" },
  { role: "service_advisor", workflow_stage: "Work In Progress", field_name: "odometer", permission_level: "LOCKED" },
  { role: "technician", workflow_stage: "Work In Progress", field_name: "odometer", permission_level: "LOCKED" },
  { role: "gm", workflow_stage: "ANY", field_name: "odometer", permission_level: "OVERRIDE" },
  { role: "service_advisor", workflow_stage: "Work In Progress", field_name: "goodwill", permission_level: "REQUIRES_APPROVAL" },
];

let fail = 0;
const eq = (label: string, got: any, want: any) => {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (!ok) { fail++; console.log(`FAIL ${label}: got ${JSON.stringify(got)} want ${JSON.stringify(want)}`); }
  else console.log(`ok   ${label}`);
};

eq("advisor draft odometer -> EDIT", resolveFieldPermission(rules, "service_advisor", "Draft", "odometer"), "EDIT");
eq("advisor WIP odometer -> LOCKED", resolveFieldPermission(rules, "service_advisor", "Work In Progress", "odometer"), "LOCKED");
eq("TITLE-CASE role normalises", resolveFieldPermission(rules, "Service Advisor", "Work In Progress", "odometer"), "LOCKED");
eq("gm_service aliases to gm", resolveFieldPermission(rules, "gm_service", "Work In Progress", "odometer"), "OVERRIDE");
eq("ANY/ANY applies to all", resolveFieldPermission(rules, "admin", "Draft", "system_job_card_no"), "LOCKED");
eq("no rule -> undefined", resolveFieldPermission(rules, "technician", "Draft", "remarks"), undefined);

const v = enforceFieldPermissions(rules, "service_advisor", "Work In Progress",
  { odometer: 999, goodwill: 500, remarks: "x" }, { odometer: 100, goodwill: 0, remarks: "old" });
eq("locked collected", v.locked, ["odometer"]);
eq("approval collected", v.needsApproval, ["goodwill"]);
eq("free field allowed", v.allowed, { remarks: "x" });

const u = enforceFieldPermissions(rules, "service_advisor", "Work In Progress",
  { odometer: 100 }, { odometer: 100 });
eq("unchanged locked field passes", u.locked, []);


// READ_ONLY and HIDDEN are two of the six ENUM values. An unhandled level
// resolves to "no rule", which means ALLOWED — a silent fail-open.
const extra: any = [
  { role: "technician", workflow_stage: "ANY", field_name: "discount", permission_level: "READ_ONLY" },
  { role: "technician", workflow_stage: "ANY", field_name: "basic_salary", permission_level: "HIDDEN" },
];
const v2 = enforceFieldPermissions(extra, "technician", "ANY",
  { discount: 10, basic_salary: 1 }, { discount: 0, basic_salary: 0 });
eq("READ_ONLY refused", v2.locked.includes("discount"), true);
eq("HIDDEN refused", v2.locked.includes("basic_salary"), true);
eq("nothing allowed through", Object.keys(v2.allowed), []);
console.log(fail === 0 ? "\nALL PASS" : `\n${fail} FAILED`);
process.exit(fail === 0 ? 0 : 1);
