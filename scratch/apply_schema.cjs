const mysql = require('mysql2/promise');

const gcpDbConfig = {
    host: '35.200.150.167',
    port: 3306,
    user: 'root',
    password: 'WmsSecureMySQL2026!',
    database: 'railway',
    connectTimeout: 30000,
};

async function execWithRetry(sql, label, retries = 3) {
    for (let attempt = 1; attempt <= retries; attempt++) {
        let conn;
        try {
            conn = await mysql.createConnection(gcpDbConfig);
            await conn.execute(sql);
            await conn.end();
            console.log(`  ✅ ${label}`);
            return;
        } catch (e) {
            if (conn) try { await conn.end(); } catch (_) {}
            if (attempt < retries && (e.code === 'ECONNRESET' || e.code === 'ETIMEDOUT' || e.code === 'PROTOCOL_CONNECTION_LOST')) {
                console.log(`  ⚠️  ${label} — attempt ${attempt} failed (${e.code}), retrying in 3s...`);
                await new Promise(r => setTimeout(r, 3000));
            } else {
                throw e;
            }
        }
    }
}

const TABLES = [
    {
        name: 'service_history',
        sql: `CREATE TABLE IF NOT EXISTS service_history (
    sh_no                   VARCHAR(50)   NOT NULL,
    chassis_no              VARCHAR(50)   NOT NULL,
    registration_no         VARCHAR(30)   DEFAULT NULL,
    account                 VARCHAR(200)  DEFAULT NULL,
    sr_no                   VARCHAR(50)   DEFAULT NULL,
    service_datetime        DATETIME      DEFAULT NULL,
    other_service_center    VARCHAR(150)  DEFAULT NULL,
    serviced_at_other_src   TINYINT(1)    DEFAULT 0,
    job_card_open_date      DATE          DEFAULT NULL,
    odometer_reading        INT           DEFAULT NULL,
    sr_type                 VARCHAR(50)   DEFAULT NULL,
    summary                 TEXT          DEFAULT NULL,
    survey_customer         TINYINT(1)    DEFAULT 0,
    revisit                 TINYINT(1)    DEFAULT 0,
    service_request         TEXT          DEFAULT NULL,
    contact_full_name       VARCHAR(200)  DEFAULT NULL,
    created_at              TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (sh_no),
    CONSTRAINT fk_sh_chassis
        FOREIGN KEY (chassis_no) REFERENCES vehicle_master (chassis_no)
        ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
    },
    {
        name: 'invoices',
        sql: `CREATE TABLE IF NOT EXISTS invoices (
    invoice_no              VARCHAR(50)   NOT NULL,
    chassis_no              VARCHAR(50)   NOT NULL,
    registration_no         VARCHAR(30)   DEFAULT NULL,
    sr_assigned_to          VARCHAR(150)  DEFAULT NULL,
    invoice_date            DATE          DEFAULT NULL,
    account                 VARCHAR(200)  DEFAULT NULL,
    invoice_type            VARCHAR(50)   DEFAULT NULL,
    invoice_format          VARCHAR(50)   DEFAULT NULL,
    invoice_status          VARCHAR(30)   DEFAULT NULL,
    final_labour_amount     DECIMAL(12,2) DEFAULT 0.00,
    final_spares_amount     DECIMAL(12,2) DEFAULT 0.00,
    final_consolidated_amt  DECIMAL(12,2) DEFAULT 0.00,
    order_no                VARCHAR(50)   DEFAULT NULL,
    sr_no                   VARCHAR(50)   DEFAULT NULL,
    cancellation_reason     TEXT          DEFAULT NULL,
    created_at              TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (invoice_no),
    CONSTRAINT fk_inv_chassis
        FOREIGN KEY (chassis_no) REFERENCES vehicle_master (chassis_no)
        ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
    }
];

const INDEXES = [
    // vehicle_master indexes
    { name: 'idx_vm_reg_no', sql: 'CREATE UNIQUE INDEX idx_vm_reg_no ON vehicle_master (registration_no)' },
    { name: 'idx_vm_warranty_composite', sql: 'CREATE INDEX idx_vm_warranty_composite ON vehicle_master (warranty_expiry_date, chassis_no, registration_no, status)' },
    { name: 'idx_vm_next_service', sql: 'CREATE INDEX idx_vm_next_service ON vehicle_master (next_service_date, next_service_type)' },
    { name: 'idx_vm_owner_account', sql: 'CREATE INDEX idx_vm_owner_account ON vehicle_master (owner_account_name)' },
    // service_history indexes
    { name: 'idx_sh_chassis', sql: 'CREATE INDEX idx_sh_chassis ON service_history (chassis_no)' },
    { name: 'idx_sh_reg_no', sql: 'CREATE INDEX idx_sh_reg_no ON service_history (registration_no)' },
    { name: 'idx_sh_sr_no', sql: 'CREATE INDEX idx_sh_sr_no ON service_history (sr_no)' },
    { name: 'idx_sh_service_date', sql: 'CREATE INDEX idx_sh_service_date ON service_history (service_datetime)' },
    { name: 'idx_sh_chassis_date', sql: 'CREATE INDEX idx_sh_chassis_date ON service_history (chassis_no, service_datetime DESC)' },
    // invoices indexes
    { name: 'idx_inv_chassis', sql: 'CREATE INDEX idx_inv_chassis ON invoices (chassis_no)' },
    { name: 'idx_inv_reg_no', sql: 'CREATE INDEX idx_inv_reg_no ON invoices (registration_no)' },
    { name: 'idx_inv_sr_no', sql: 'CREATE INDEX idx_inv_sr_no ON invoices (sr_no)' },
    { name: 'idx_inv_date_status', sql: 'CREATE INDEX idx_inv_date_status ON invoices (invoice_date, invoice_status)' },
    { name: 'idx_inv_type_date', sql: 'CREATE INDEX idx_inv_type_date ON invoices (invoice_type, invoice_date)' },
];

async function run() {
    try {
        // Step 1: Create remaining tables (vehicle_master already exists from prior run)
        console.log('Creating tables (with per-statement reconnect + retry)...');
        for (const t of TABLES) {
            await execWithRetry(t.sql, t.name);
        }

        // Step 2: Apply indexes
        console.log('\nApplying indexes...');
        for (const idx of INDEXES) {
            try {
                await execWithRetry(idx.sql, idx.name);
            } catch (e) {
                if (e.code === 'ER_DUP_KEYNAME') {
                    console.log(`  ⏭️  ${idx.name} (already exists)`);
                } else {
                    throw e;
                }
            }
        }

        // Step 3: Verify
        console.log('\nVerifying all 3 tables...');
        const conn = await mysql.createConnection(gcpDbConfig);
        for (const name of ['vehicle_master', 'service_history', 'invoices']) {
            const [rows] = await conn.query(`SHOW TABLES LIKE '${name}'`);
            console.log(`  ${name}: ${rows.length > 0 ? '✅' : '❌'}`);
        }
        await conn.end();

        console.log('\n🎉 Schema migration complete!');
    } catch (e) {
        console.error('❌ Migration failed:', e);
    }
}

run();
