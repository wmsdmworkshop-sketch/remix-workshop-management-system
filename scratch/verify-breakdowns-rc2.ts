import * as dotenv from "dotenv";
dotenv.config();

const PORT = process.env.PORT || 3001;
const BASE_URL = `http://localhost:${PORT}`;

async function runTests() {
  console.log("=== RUNNING SPRINT RC2 BREAKDOWN SYSTEM VERIFICATION ===");

  try {
    // 0. Login to retrieve JWT
    console.log("\n[TEST 0] Logging in as developer...");
    const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: "developer",
        password: "developer"
      })
    });
    if (!loginRes.ok) throw new Error(`Login failed with status ${loginRes.status}`);
    const { token } = await loginRes.json();
    console.log("Login successful. Obtained JWT.");

    const headers = {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`
    };

    // 1. Create a QRT Squad
    console.log("\n[TEST 1] Creating QRT Squad...");
    const qrtRes = await fetch(`${BASE_URL}/api/qrt_teams`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        team_name: "QRT Omega Verification Team",
        technician_id: 1,
        assistant_id: 2,
        vehicle_no: "MH-12-Q-9999",
        phone_numbers: "9876543299"
      })
    });
    
    if (!qrtRes.ok) {
      const errText = await qrtRes.text();
      throw new Error(`Failed to create QRT Team: Status ${qrtRes.status} - ${errText}`);
    }
    const qrtData = await qrtRes.json();
    console.log("QRT Team Created:", qrtData);
    const qrtId = qrtData.qrt_id;

    // 2. Fetch Vehicle Health Card
    console.log("\n[TEST 2] Auto-fetching Vehicle Health Card for VRN MH12AB1234...");
    const healthRes = await fetch(`${BASE_URL}/api/vehicles/MH12AB1234/health-card`, { headers });
    if (!healthRes.ok) throw new Error("Failed to fetch vehicle health card");
    const healthCard = await healthRes.json();
    console.log("Vehicle Health Card:", healthCard);

    // 3. Log a Breakdown Complaint
    console.log("\n[TEST 3] Logging Roadside Breakdown Complaint...");
    const bdRes = await fetch(`${BASE_URL}/api/breakdowns`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        vehicle_number: "MH12AB1234",
        priority: "P1 - Vehicle Off Road (VOR)",
        complaint: "Front axle lock bypass fail",
        driver_name: "Ramesh Sharma",
        driver_mobile: "9876543210",
        fleet_owner: "Tata Logistics Ltd",
        preferred_workshop_id: 1,
        gps_latitude: 18.5204,
        gps_longitude: 73.8567,
        gps_address: "Pune Highway Toll Plaza"
      })
    });

    if (!bdRes.ok) {
      const errText = await bdRes.text();
      throw new Error(`Failed to log breakdown: Status ${bdRes.status} - ${errText}`);
    }
    const bdData = await bdRes.json();
    console.log("Breakdown Incident Logged:", bdData);
    const bdId = bdData.breakdown_id;

    // 4. Dispatch and Assign QRT Squad
    console.log("\n[TEST 4] Assigning QRT Squad to Breakdown...");
    const assignRes = await fetch(`${BASE_URL}/api/breakdowns/${bdId}/assign`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        qrt_id: qrtId,
        assigned_advisor_id: 1,
        expected_eta: new Date(Date.now() + 60 * 60000).toISOString().slice(0, 19).replace('T', ' '), // 1 hour from now
        assigned_workshop_id: 1
      })
    });
    if (!assignRes.ok) throw new Error("Failed to assign QRT team");
    console.log("QRT Team Assigned successfully.");

    // 5. Update Incident Lifecycle Status
    console.log("\n[TEST 5] Updating incident status to QRT Dispatched...");
    const status1 = await fetch(`${BASE_URL}/api/breakdowns/${bdId}/status`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        status: "QRT Dispatched",
        remarks: "Squad Omega dispatched from depot 1",
        responsible_employee_id: 1
      })
    });
    if (!status1.ok) throw new Error("Failed to update status to Dispatched");
    console.log("Status updated to QRT Dispatched.");

    // 6. Log Communication Alert
    console.log("\n[TEST 6] Logging Customer Dispatch Alert Communication...");
    const commRes = await fetch(`${BASE_URL}/api/breakdowns/${bdId}/communication`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        communication_type: "SMS",
        sender_id: 1,
        recipient_role: "Customer",
        message: "QRT Omega is enroute to your location. Expected ETA: 60 mins."
      })
    });
    if (!commRes.ok) throw new Error("Failed to log communication");
    console.log("Customer SMS log recorded.");

    // 7. Auto-convert to Gate Entry / Job Card
    console.log("\n[TEST 7] Auto-converting breakdown to Workshop Job Card...");
    const convertRes = await fetch(`${BASE_URL}/api/breakdowns/${bdId}/convert`, { method: "POST", headers });
    if (!convertRes.ok) throw new Error("Failed to convert breakdown");
    const convertData = await convertRes.json();
    console.log("Converted successfully. Created Job Card:", convertData.job_card_no);

    // 8. Fetch Breakdown Analytics Dashboard
    console.log("\n[TEST 8] Fetching Dashboard Analytics...");
    const analRes = await fetch(`${BASE_URL}/api/breakdowns/analytics/dashboard`, { headers });
    if (!analRes.ok) throw new Error("Failed to load dashboard metrics");
    const analData = await analRes.json();
    console.log("Breakdown Analytics Dashboard:", analData);

    // 9. Clean up created QRT team
    console.log("\n[TEST 9] Cleaning up Verification QRT team...");
    const deleteQrtRes = await fetch(`${BASE_URL}/api/qrt_teams/${qrtId}`, { method: "DELETE", headers });
    if (!deleteQrtRes.ok) throw new Error("Failed to delete QRT team");
    console.log("Verification team cleared.");

    console.log("\n=== ALL BREAKDOWN INCIDENT DISPATCH TESTS PASSED SUCCESSFULLY! ===");
  } catch (err: any) {
    console.error("\n*** VERIFICATION TEST FAILED! ***");
    console.error(err.message || err);
    process.exit(1);
  }
}

runTests();
