const fs = require('fs');

const content = fs.readFileSync('workshop_db.json', 'utf8');
const db = JSON.parse(content);
const alertLogs = db.alertLogs || [];
console.log("Total alertLogs in json:", alertLogs.length);
if (alertLogs.length > 0) {
    console.log("Sample alert log keys:", Object.keys(alertLogs[0]));
    const hasTargetRoles = alertLogs.filter(a => a.target_roles);
    console.log("Alert logs with target_roles count:", hasTargetRoles.length);
    if (hasTargetRoles.length > 0) {
        console.log("Sample alert log with target_roles:", hasTargetRoles[0]);
    }
}
