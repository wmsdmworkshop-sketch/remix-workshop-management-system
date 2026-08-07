import { pool } from '../index';

export async function up() {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    console.log('Creating tbl_payments...');
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS tbl_payments (
        payment_id VARCHAR(50) PRIMARY KEY,
        job_id VARCHAR(50) NOT NULL,
        branch_id VARCHAR(50) NOT NULL,
        amount DECIMAL(10, 2) NOT NULL,
        payment_mode VARCHAR(50) NOT NULL,
        reference_number VARCHAR(255),
        cashier_id VARCHAR(50) NOT NULL,
        status VARCHAR(50) DEFAULT 'COMPLETED',
        recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_job_id (job_id),
        INDEX idx_branch_id (branch_id)
      )
    `);

    console.log('Creating tbl_credit_requests...');
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS tbl_credit_requests (
        credit_request_id VARCHAR(50) PRIMARY KEY,
        job_id VARCHAR(50) NOT NULL,
        branch_id VARCHAR(50) NOT NULL,
        amount DECIMAL(10, 2),
        reason TEXT NOT NULL,
        requested_by VARCHAR(50) NOT NULL,
        status VARCHAR(50) DEFAULT 'REQUESTED',
        gm_id VARCHAR(50),
        requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        decision_at TIMESTAMP NULL,
        INDEX idx_job_id (job_id),
        INDEX idx_branch_id (branch_id),
        INDEX idx_status (status)
      )
    `);

    console.log('Creating tbl_gate_pass...');
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS tbl_gate_pass (
        gate_pass_id VARCHAR(50) PRIMARY KEY,
        gate_pass_no VARCHAR(100) NOT NULL UNIQUE,
        job_id VARCHAR(50) NOT NULL,
        branch_id VARCHAR(50) NOT NULL,
        release_basis VARCHAR(50) NOT NULL,
        payment_id VARCHAR(50),
        credit_request_id VARCHAR(50),
        manual_gate_pass_request_id VARCHAR(50),
        is_manual_exception BOOLEAN DEFAULT FALSE,
        status VARCHAR(50) DEFAULT 'ISSUED',
        issued_by VARCHAR(50) NOT NULL,
        issued_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        revoked_by VARCHAR(50),
        revoked_at TIMESTAMP NULL,
        revoke_reason TEXT,
        INDEX idx_job_id (job_id),
        INDEX idx_branch_id (branch_id),
        INDEX idx_gate_pass_no (gate_pass_no)
      )
    `);

    console.log('Creating tbl_gate_out...');
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS tbl_gate_out (
        gate_out_id VARCHAR(50) PRIMARY KEY,
        gate_pass_id VARCHAR(50) NOT NULL,
        job_id VARCHAR(50) NOT NULL,
        branch_id VARCHAR(50) NOT NULL,
        security_operator_id VARCHAR(50) NOT NULL,
        evidence_id VARCHAR(50),
        capture_source VARCHAR(50) DEFAULT 'MANUAL_CAMERA',
        expected_vrn VARCHAR(50),
        detected_vrn VARCHAR(50),
        verification_result VARCHAR(50) DEFAULT 'VERIFIED',
        verified_by VARCHAR(50),
        gate_out_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_gate_pass_id (gate_pass_id),
        INDEX idx_job_id (job_id),
        INDEX idx_branch_id (branch_id)
      )
    `);

    console.log('Creating tbl_task_claims...');
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS tbl_task_claims (
        claim_id VARCHAR(50) PRIMARY KEY,
        job_id VARCHAR(50) NOT NULL,
        task_type VARCHAR(50) NOT NULL,
        owner_id VARCHAR(50) NOT NULL,
        claimed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_job_task (job_id, task_type)
      )
    `);

    await connection.commit();
    console.log('Phase 9 Gate Out tables created successfully.');
  } catch (error) {
    await connection.rollback();
    console.error('Migration failed, rolled back.', error);
    throw error;
  } finally {
    connection.release();
  }
}

export async function down() {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    await connection.execute('DROP TABLE IF EXISTS tbl_gate_out');
    await connection.execute('DROP TABLE IF EXISTS tbl_gate_pass');
    await connection.execute('DROP TABLE IF EXISTS tbl_credit_requests');
    await connection.execute('DROP TABLE IF EXISTS tbl_payments');
    await connection.execute('DROP TABLE IF EXISTS tbl_task_claims');
    await connection.commit();
    console.log('Phase 9 Gate Out tables dropped.');
  } catch (error) {
    await connection.rollback();
    console.error('Rollback failed.', error);
    throw error;
  } finally {
    connection.release();
  }
}
