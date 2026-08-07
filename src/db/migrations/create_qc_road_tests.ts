import { pool } from '../index.ts';

const sql = `
CREATE TABLE IF NOT EXISTS qc_road_tests (
  road_test_id    INT AUTO_INCREMENT PRIMARY KEY,
  job_id          INT NOT NULL,
  qc_checklist_ref INT NULL COMMENT 'rpt_qc_checklists.qc_checklist_id for this QC attempt',
  branch_id       INT NOT NULL,
  tester_id       INT NOT NULL,
  tester_name     VARCHAR(100) NOT NULL,
  requirement_status ENUM('REQUIRED','NOT_REQUIRED') NOT NULL,
  requirement_set_by INT NOT NULL,
  requirement_set_by_name VARCHAR(100) NOT NULL,
  requirement_set_at DATETIME NOT NULL,
  status ENUM('REQUIRED','NOT_REQUIRED','IN_PROGRESS','PASSED','FAILED') NOT NULL,
  start_odometer  INT NULL,
  end_odometer    INT NULL,
  started_at      DATETIME NULL,
  completed_at    DATETIME NULL,
  remarks         TEXT NULL,
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_job_id (job_id),
  INDEX idx_branch_id (branch_id)
) ENGINE=InnoDB
`;

pool.execute(sql)
  .then(() => console.log('✅ qc_road_tests table created'))
  .catch((e: any) => { console.error('❌', e.message); process.exit(1); })
  .finally(() => process.exit(0));
