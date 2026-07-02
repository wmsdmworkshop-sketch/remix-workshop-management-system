const mysql = require('mysql2');
const conn = mysql.createConnection({
    host: 'thomas.proxy.rlwy.net',
    port: 50733,
    user: 'root',
    password: 'mjzwCcYkEYSYRAADKjnyAiEZGGrtwAri',
    database: 'railway'
});

const bays = [
    [1, 'Bay 1', 'Express'],
    [2, 'Bay 2', 'Express'],
    [3, 'Bay 3', 'General'],
    [4, 'Bay 4', 'General'],
    [5, 'Bay 5', 'General'],
    [6, 'Bay 6', 'General'],
    [7, 'Bay 7', 'Wheel Alignment'],
    [8, 'Bay 8', 'Aggregate Jobs'],
    [9, 'Bay 9', 'Major Failure']
];

(async () => {
    for (const [num, name, type] of bays) {
        await new Promise((res) => {
            conn.query(
                `UPDATE bay_master 
         SET bay_name = ?, bay_type = ? 
         WHERE bay_number = ?`,
                [name, type, num],
                (e, r) => {
                    if (e) console.log(`ERROR Bay ${num}:`, e.message);
                    else console.log(`✅ Bay ${num} → ${name} (${type}) updated!`);
                    res();
                }
            );
        });
    }
    conn.end();
})();