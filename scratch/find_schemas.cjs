const fs = require('fs');

const content = fs.readFileSync('railway_dump.sql', 'utf8');
const regex = /CREATE TABLE `[^`]+` \((?:[^)(]+|\((?:[^)(]+|\([^)(]*\))*\))*\)/gi;
let match;
while ((match = regex.exec(content)) !== null) {
    const block = match[0];
    if (block.toLowerCase().includes('service_history') || block.toLowerCase().includes('invoices') || block.toLowerCase().includes('vehicle_master')) {
        console.log(block);
        console.log("=========================================\n");
    }
}
