import fs from 'fs';

const dbPath = './workshop_db.json';

if (fs.existsSync(dbPath)) {
  const content = fs.readFileSync(dbPath, 'utf-8');
  const data = JSON.parse(content);
  
  if (data.jobCards && Array.isArray(data.jobCards)) {
    data.jobCards.forEach(j => {
      j.vehicle_make = "Tata Motors";
      
      // Map bay_id to a default bay_no string if empty
      if (j.bay_no === undefined || j.bay_no === null) {
        j.bay_no = j.bay_id ? String(j.bay_id) : "Queue";
      }
      
      if (j.service_advisor === undefined || j.service_advisor === null) {
        j.service_advisor = "Jane Smith";
      }
      
      if (j.technician_name === undefined || j.technician_name === null) {
        j.technician_name = "Alex Carter";
      }
      
      if (j.no_of_laborers === undefined || j.no_of_laborers === null) {
        j.no_of_laborers = 1;
      }
      
      if (j.actual_time_taken === undefined || j.actual_time_taken === null) {
        j.actual_time_taken = null;
      }
    });
    
    fs.writeFileSync(dbPath, JSON.stringify(data, null, 2), 'utf-8');
    console.log(`Successfully updated ${data.jobCards.length} job cards in workshop_db.json.`);
  } else {
    console.log('No jobCards array found in database.');
  }
} else {
  console.log('workshop_db.json not found.');
}
