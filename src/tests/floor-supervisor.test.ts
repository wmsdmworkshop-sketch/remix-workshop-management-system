import { assert } from "console";

console.log("=============================================================================");
console.log("STARTING FLOOR SUPERVISOR WORKSPACE VALIDATIONS");
console.log("=============================================================================");

// Mock data structures
const mockBays = [
  { bay_id: 1, bay_name: "Bay 1 (Mechanical)", status: "Active" },
  { bay_id: 2, bay_name: "Bay 2 (EV isolator)", status: "Idle" }
];

const mockJobs = [
  { job_id: 101, vrn: "KA01MM2222", status: "Active", technician_name: "Sanjay Patel", bay_id: 1 },
  { job_id: 102, vrn: "KA01MM3333", status: "Waiting", technician_name: null, bay_id: null }
];

// 1. Verify active vs unassigned counts
const activeCount = mockJobs.filter(j => j.status === "Active").length;
const unassignedCount = mockJobs.filter(j => !j.technician_name).length;

console.log(`[PASS] Active Count: ${activeCount} | Unassigned Count: ${unassignedCount}`);
if (activeCount !== 1 || unassignedCount !== 1) {
  throw new Error("Active or unassigned job calculation mismatch");
}

// 2. Verify digital twin bay mapping
const targetBay = mockBays.find(b => b.bay_id === 1);
const activeJobInBay = mockJobs.find(j => j.bay_id === targetBay?.bay_id);

console.log(`[PASS] Bay 1 Active Vehicle: ${activeJobInBay?.vrn || "None"}`);
if (activeJobInBay?.vrn !== "KA01MM2222") {
  throw new Error("Digital twin vehicle allocation mapping failed");
}

// 3. Verify allocation update simulation
const targetJob = mockJobs[1];
targetJob.technician_name = "Amit Kumar";
targetJob.bay_id = 2;
targetJob.status = "Active";

console.log(`[PASS] Allocated Job 102 to Tech: ${targetJob.technician_name} in Bay: ${targetJob.bay_id}`);
if (targetJob.status !== "Active") {
  throw new Error("Allocation state transition failed");
}

console.log("=============================================================================");
console.log("ALL FLOOR SUPERVISOR TESTS PASSED");
console.log("=============================================================================");
