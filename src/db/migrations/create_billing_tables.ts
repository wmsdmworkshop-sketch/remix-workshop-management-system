/**
 * AIVAAHAN-ROLE-OPS-IMPL-008 — Phase 8 Migration
 * CRM Billing Evidence & Manual Gate Pass Governance
 *
 * Tables created:
 *  - tbl_pre_invoice          (header — one per job billing cycle)
 *  - tbl_pre_invoice_version  (immutable versioned commercial snapshots)
 *  - tbl_pre_invoice_confirmation (customer confirmation evidence)
 *  - tbl_crm_billing_evidence (CRM invoice PDF capture)
 *  - tbl_manual_gate_pass_request (exception authorization)
 *
 * Additive alteration:
 *  - tbl_handoff_sla: ADD eod_deadline DATETIME NULL, target_sla_minutes INT NULL
 *
 * All idempotent (CREATE TABLE IF NOT EXISTS / ADD COLUMN IF NOT EXISTS).
 * No destructive operations. No Phase 1–7 table modifications.
 * Existing engines (InvoiceEngine, GSTEngine, etc.) NOT invoked — RESERVED.
 */

import { pool } from '../../db/index';

async function runMigration() {
  const conn = await (pool as any).getConnection();
  try {
    await conn.beginTransaction();

    // ─────────────────────────────────────────────────────────────────────
    // 1. tbl_pre_invoice — header, one per job billing cycle
    // ─────────────────────────────────────────────────────────────────────
    await conn.execute(`
      CREATE TABLE IF NOT EXISTS tbl_pre_invoice (
        pre_invoice_id        INT AUTO_INCREMENT PRIMARY KEY,
        job_id                INT NOT NULL,
        job_card_no           VARCHAR(50) NOT NULL,
        branch_id             INT NOT NULL,
        vrn                   VARCHAR(30),
        customer_name         VARCHAR(255),
        service_advisor_id    INT,
        service_advisor_name  VARCHAR(100),
        current_version       INT NOT NULL DEFAULT 1,
        status                ENUM(
                                'DRAFT','DISCOUNT_PENDING','SA_REVIEWED',
                                'SENT_TO_CUSTOMER','CUSTOMER_CONFIRMED',
                                'BILLING_HANDED_OFF','RETURNED_TO_SA',
                                'BILLING_IN_PROGRESS','BILLING_COMPLETED'
                              ) NOT NULL DEFAULT 'DRAFT',
        return_reason_code    VARCHAR(50)  NULL,
        return_remarks        TEXT         NULL,
        returned_by           INT          NULL,
        returned_by_name      VARCHAR(100) NULL,
        returned_at           DATETIME     NULL,
        billing_acknowledged_by   INT      NULL,
        billing_acknowledged_at   DATETIME NULL,
        billing_validated_at      DATETIME NULL,
        invoice_posting_status ENUM('NOT_APPLICABLE','DRAFT','POSTED','PENDING_ACCOUNTING')
                                NOT NULL DEFAULT 'NOT_APPLICABLE',
        crm_evidence_id       INT NULL,
        created_at            TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at            TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
                                ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_pi_job       (job_id),
        INDEX idx_pi_branch    (branch_id),
        INDEX idx_pi_status    (status),
        INDEX idx_pi_sa        (service_advisor_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    console.log('✓ tbl_pre_invoice');

    // ─────────────────────────────────────────────────────────────────────
    // 2. tbl_pre_invoice_version — immutable commercial snapshot per version
    // ─────────────────────────────────────────────────────────────────────
    await conn.execute(`
      CREATE TABLE IF NOT EXISTS tbl_pre_invoice_version (
        piv_id                INT AUTO_INCREMENT PRIMARY KEY,
        pre_invoice_id        INT NOT NULL,
        version               INT NOT NULL,
        previous_version_id   INT NULL,
        compiled_by           INT NOT NULL,
        compiled_by_name      VARCHAR(100),
        compiled_at           DATETIME NOT NULL,
        change_reason         VARCHAR(255) NULL,
        labour_total          DECIMAL(12,2) NOT NULL DEFAULT 0,
        parts_total           DECIMAL(12,2) NOT NULL DEFAULT 0,
        requested_discount    DECIMAL(12,2) NOT NULL DEFAULT 0,
        authorized_discount   DECIMAL(12,2) NOT NULL DEFAULT 0,
        discount_status       ENUM('NOT_REQUESTED','APPROVED_AUTO','APPROVED_MANUAL','PENDING_AUTHORIZATION')
                                NOT NULL DEFAULT 'NOT_REQUESTED',
        discount_approval_ref VARCHAR(100) NULL,
        taxable_amount        DECIMAL(12,2) NOT NULL DEFAULT 0,
        gst_rate              DECIMAL(5,2)  NOT NULL DEFAULT 18.00,
        gst_source            VARCHAR(50)   NOT NULL DEFAULT 'CONFIG_DEFAULT',
        cgst                  DECIMAL(12,2) NOT NULL DEFAULT 0,
        sgst                  DECIMAL(12,2) NOT NULL DEFAULT 0,
        igst                  DECIMAL(12,2) NOT NULL DEFAULT 0,
        grand_total           DECIMAL(12,2) NOT NULL DEFAULT 0,
        lines_snapshot_json   JSON,
        is_locked             TINYINT(1)    NOT NULL DEFAULT 0,
        created_at            TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uk_piv_version (pre_invoice_id, version),
        INDEX idx_piv_pi      (pre_invoice_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    console.log('✓ tbl_pre_invoice_version');

    // ─────────────────────────────────────────────────────────────────────
    // 3. tbl_pre_invoice_confirmation — customer evidence, version-bound
    // ─────────────────────────────────────────────────────────────────────
    await conn.execute(`
      CREATE TABLE IF NOT EXISTS tbl_pre_invoice_confirmation (
        confirmation_id       INT AUTO_INCREMENT PRIMARY KEY,
        pre_invoice_id        INT NOT NULL,
        pre_invoice_version   INT NOT NULL,
        confirmation_type     ENUM(
                                'VERBAL_SA_RECORDED','WHATSAPP','SMS',
                                'SIGNED_HARDCOPY','VOICE_RECORDING',
                                'MANAGER_RECORDED','DIGITAL_APPROVAL'
                              ) NOT NULL,
        confirmed_by_name     VARCHAR(150) NOT NULL,
        confirmed_by_contact  VARCHAR(100) NULL,
        captured_by_id        INT NOT NULL,
        captured_by_name      VARCHAR(100),
        confirmed_at          DATETIME NOT NULL,
        evidence_ref          VARCHAR(255) NULL,
        digital_approval_ref  VARCHAR(100) NULL,
        remarks               TEXT NULL,
        grand_total_confirmed DECIMAL(12,2) NOT NULL,
        is_superseded         TINYINT(1) NOT NULL DEFAULT 0,
        created_at            TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_pic_pi      (pre_invoice_id),
        INDEX idx_pic_version (pre_invoice_id, pre_invoice_version)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    console.log('✓ tbl_pre_invoice_confirmation');

    // ─────────────────────────────────────────────────────────────────────
    // 4. tbl_crm_billing_evidence — CRM invoice PDF capture
    // ─────────────────────────────────────────────────────────────────────
    await conn.execute(`
      CREATE TABLE IF NOT EXISTS tbl_crm_billing_evidence (
        crm_evidence_id           INT AUTO_INCREMENT PRIMARY KEY,
        pre_invoice_id            INT NOT NULL,
        job_id                    INT NOT NULL,
        job_card_no               VARCHAR(50),
        branch_id                 INT NOT NULL,
        crm_invoice_number        VARCHAR(100) NOT NULL,
        crm_invoice_date          DATE NOT NULL,
        crm_invoice_amount        DECIMAL(12,2) NOT NULL,
        crm_dms_reference         VARCHAR(100) NULL,
        invoice_pdf_evidence_id   VARCHAR(255) NOT NULL,
        ocr_suggested_invoice_no  VARCHAR(100) NULL,
        ocr_suggested_date        DATE NULL,
        ocr_suggested_amount      DECIMAL(12,2) NULL,
        ocr_confidence            INT NULL,
        human_confirmed           TINYINT(1) NOT NULL DEFAULT 0,
        human_confirmed_by        INT NULL,
        human_confirmed_by_name   VARCHAR(100) NULL,
        human_confirmed_at        DATETIME NULL,
        dms_invoices_match_ref    VARCHAR(100) NULL,
        amount_variance           DECIMAL(12,2) NULL,
        amount_variance_percent   DECIMAL(5,2) NULL,
        variance_acknowledged     TINYINT(1) NOT NULL DEFAULT 0,
        source                    VARCHAR(50) NOT NULL DEFAULT 'CRM_DMS',
        status                    ENUM('UPLOADED','VALIDATED','REJECTED') NOT NULL DEFAULT 'UPLOADED',
        rejection_reason          TEXT NULL,
        is_retrospective          TINYINT(1) NOT NULL DEFAULT 0,
        manual_gate_pass_ref      INT NULL,
        uploaded_by               INT NOT NULL,
        uploaded_by_name          VARCHAR(100),
        created_at                TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at                TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
                                    ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_cbe_pi          (pre_invoice_id),
        INDEX idx_cbe_job         (job_id),
        INDEX idx_cbe_invoice_no  (crm_invoice_number),
        INDEX idx_cbe_branch      (branch_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    console.log('✓ tbl_crm_billing_evidence');

    // ─────────────────────────────────────────────────────────────────────
    // 5. tbl_manual_gate_pass_request — exception authorization
    // ─────────────────────────────────────────────────────────────────────
    await conn.execute(`
      CREATE TABLE IF NOT EXISTS tbl_manual_gate_pass_request (
        mgp_id                        INT AUTO_INCREMENT PRIMARY KEY,
        job_id                        INT NOT NULL,
        job_card_no                   VARCHAR(50),
        vrn                           VARCHAR(30) NOT NULL,
        customer_name                 VARCHAR(255),
        branch_id                     INT NOT NULL,
        pre_invoice_id                INT NULL,
        requested_by_id               INT NOT NULL,
        requested_by_name             VARCHAR(100),
        requestor_role                ENUM('SERVICE_MANAGER','WORKS_MANAGER') NOT NULL,
        requested_at                  DATETIME NOT NULL,
        reason_code                   ENUM(
                                        'CRM_SYSTEM_DOWN','NETWORK_OUTAGE',
                                        'DMS_BILLING_DELAYED','CUSTOMER_EMERGENCY_RELEASE',
                                        'FLEET_OPERATIONAL_URGENCY','TECHNICAL_ERROR_CRM',
                                        'EOD_PROCESSING_DELAY','OTHER_WITH_JUSTIFICATION'
                                      ) NOT NULL,
        justification                 TEXT NOT NULL,
        crm_invoice_availability      ENUM('NOT_GENERATED','SYSTEM_DOWN','PROCESSING_DELAYED','UNKNOWN') NOT NULL,
        crm_gate_pass_availability    ENUM('NOT_AVAILABLE','SYSTEM_DOWN','PROCESSING_DELAYED','UNKNOWN') NOT NULL,
        expected_billing_resolution   TEXT NOT NULL,
        supporting_evidence_ref       VARCHAR(255) NULL,
        approval_request_id           VARCHAR(100) NULL,
        status                        ENUM(
                                        'PENDING_GM_APPROVAL','APPROVED',
                                        'REJECTED','RETURNED_FOR_CLARIFICATION'
                                      ) NOT NULL DEFAULT 'PENDING_GM_APPROVAL',
        approved_by_id                INT NULL,
        approved_by_name              VARCHAR(100) NULL,
        approved_by_role              VARCHAR(50) NULL,
        approved_at                   DATETIME NULL,
        gm_remarks                    TEXT NULL,
        mgp_number                    VARCHAR(50) NULL,
        billing_liability_assigned_to INT NULL,
        billing_liability_assigned_at DATETIME NULL,
        eod_deadline                  DATETIME NULL,
        sla_status                    ENUM('OPEN','BREACHED','RESOLVED') NOT NULL DEFAULT 'OPEN',
        crm_invoice_reconciled_at     DATETIME NULL,
        crm_evidence_id               INT NULL,
        created_at                    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at                    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
                                        ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_mgp_job             (job_id),
        INDEX idx_mgp_branch          (branch_id),
        INDEX idx_mgp_status          (status),
        INDEX idx_mgp_sla             (sla_status)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    console.log('✓ tbl_manual_gate_pass_request');

    // ─────────────────────────────────────────────────────────────────────
    // 6. ALTER tbl_handoff_sla — additive columns only
    //    Non-destructive: IF NOT EXISTS guards; existing rows stay NULL
    // ─────────────────────────────────────────────────────────────────────
    const [cols] = await conn.execute(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tbl_handoff_sla'`
    ) as any[];
    const existingCols = (cols as any[]).map((c: any) => c.COLUMN_NAME.toLowerCase());

    if (!existingCols.includes('eod_deadline')) {
      await conn.execute(`ALTER TABLE tbl_handoff_sla ADD COLUMN eod_deadline DATETIME NULL`);
      console.log('✓ tbl_handoff_sla.eod_deadline added');
    } else {
      console.log('  tbl_handoff_sla.eod_deadline already exists — skip');
    }
    if (!existingCols.includes('target_sla_minutes')) {
      await conn.execute(`ALTER TABLE tbl_handoff_sla ADD COLUMN target_sla_minutes INT NULL`);
      console.log('✓ tbl_handoff_sla.target_sla_minutes added');
    } else {
      console.log('  tbl_handoff_sla.target_sla_minutes already exists — skip');
    }

    // ─────────────────────────────────────────────────────────────────────
    // 7. Seed dealer_configurations EOD alias if not present
    //    workdayEnd is the authoritative key (already exists = '18:00')
    //    We do NOT hardcode midnight. EOD = workdayEnd.
    // ─────────────────────────────────────────────────────────────────────
    const [eodRow] = await conn.execute(
      `SELECT config_value FROM dealer_configurations WHERE config_key = 'workdayEnd'`
    ) as any[];
    if ((eodRow as any[]).length > 0) {
      console.log(`✓ dealer_configurations.workdayEnd = '${(eodRow as any[])[0].config_value}' (branch EOD source)`);
    } else {
      // No workdayEnd configured — insert default but warn
      await conn.execute(
        `INSERT IGNORE INTO dealer_configurations (config_key, config_value) VALUES ('workdayEnd', '18:00')`
      );
      console.log('⚠ workdayEnd not found — inserted default 18:00. UPDATE to branch-specific EOD.');
    }

    await conn.commit();
    console.log('\n✓ Phase 8 migration completed successfully');

  } catch (err: any) {
    await conn.rollback();
    console.error('✗ Migration FAILED — rolled back:', err.message);
    process.exit(1);
  } finally {
    conn.release();
    process.exit(0);
  }
}

runMigration();
