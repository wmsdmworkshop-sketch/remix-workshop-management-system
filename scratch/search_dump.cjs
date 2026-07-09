const fs = require('fs');

const content = fs.readFileSync('railway_dump.sql', 'utf8');
const lines = content.split('\n');
let capturing = false;
let tableSchema = [];
let targetTables = ['employees', 'employee_master', 'users', 'user_access_master'];

lines.forEach((line, idx) => {
    const match = line.match(/CREATE TABLE `([^`]+)`/);
    if (match) {
        if (targetTables.includes(match[1])) {
            capturing = true;
            tableSchema = [line];
            return;
        }
    }
    if (capturing) {
        tableSchema.push(line);
        if (line.includes('ENGINE=') || line.includes(';')) {
            capturing = false;
            console.log(`--- Schema for ${tableSchema[0].match(/CREATE TABLE `([^`]+)`/)[1]} ---`);
            console.log(tableSchema.join('\n'));
            console.log('\n');
        }
    }
});
