-- ============================================================
-- DWIP Workforce v1.1 — Master Database Schema
-- Engine: SQLite 3.x
-- Generated: 2026-07-10
-- Status: DRAFT — awaiting user approval
-- ============================================================
-- Convention:
--   Dimensions  → dim_*
--   Facts       → fact_*
--   Staging     → stg_*
--   Audit       → audit_*
-- ============================================================

PRAGMA foreign_keys = ON;
PRAGMA journal_mode = WAL;
PRAGMA synchronous  = NORMAL;

-- ============================================================
-- LAYER 0: AUDIT / LINEAGE
-- Every field in every master record is traceable here.
-- ============================================================

CREATE TABLE IF NOT EXISTS audit_lineage (
    lineage_id          INTEGER PRIMARY KEY AUTOINCREMENT,
    target_table        TEXT    NOT NULL,   -- e.g. 'fact_service_event'
    target_pk           TEXT    NOT NULL,   -- value of the PK in that table
    field_name          TEXT    NOT NULL,   -- which field was set
    value_used          TEXT,               -- the actual value stored
    source_file         TEXT    NOT NULL,   -- filename
    source_header       TEXT    NOT NULL,   -- original CSV column header
    source_row          INTEGER NOT NULL,   -- 1-based row number in source file
    merge_rule          TEXT    NOT NULL,   -- 'Direct Import' / 'Derived Fallback' / etc.
    confidence_score    REAL    NOT NULL DEFAULT 0.0,
    validation_status   TEXT    NOT NULL DEFAULT 'VALID',
    created_at          TEXT    NOT NULL DEFAULT (datetime('now','localtime'))
);

CREATE INDEX IF NOT EXISTS idx_lineage_target ON audit_lineage(target_table, target_pk);
CREATE INDEX IF NOT EXISTS idx_lineage_source  ON audit_lineage(source_file, source_row);

-- ============================================================
-- LAYER 1: RAW STAGING (one table per dataset type)
-- Stores original values exactly as read from CSV.
-- Never updated after insert.
-- ============================================================

CREATE TABLE IF NOT EXISTS stg_raw_invoice (
    raw_id              INTEGER PRIMARY KEY AUTOINCREMENT,
    source_file         TEXT    NOT NULL,
    source_row          INTEGER NOT NULL,
    ingest_timestamp    TEXT    NOT NULL DEFAULT (datetime('now','localtime')),
    invoice_date_raw    TEXT,
    invoice_no_raw      TEXT,
    job_card_no_raw     TEXT,
    vrn_raw             TEXT,
    customer_name_raw   TEXT,
    labour_raw          TEXT,
    spares_raw          TEXT,
    total_raw           TEXT,
    advisor_raw         TEXT,
    jc_type_raw         TEXT,
    mech_raw            TEXT,
    tec1_raw            TEXT,
    ele1_raw            TEXT,
    tec2_raw            TEXT,
    ele2_raw            TEXT,
    add_tech_raw        TEXT,
    add_elec_raw        TEXT,
    extra_fields_json   TEXT    -- catch-all for any additional columns
);

CREATE TABLE IF NOT EXISTS stg_raw_service_history (
    raw_id              INTEGER PRIMARY KEY AUTOINCREMENT,
    source_file         TEXT    NOT NULL,
    source_row          INTEGER NOT NULL,
    ingest_timestamp    TEXT    NOT NULL DEFAULT (datetime('now','localtime')),
    job_card_no_raw     TEXT,
    vrn_raw             TEXT,
    sr_type_raw         TEXT,
    odometer_raw        TEXT,
    sr_assigned_to_raw  TEXT,
    complaint_raw       TEXT,
    service_date_raw    TEXT,
    customer_name_raw   TEXT,
    extra_fields_json   TEXT
);

CREATE TABLE IF NOT EXISTS stg_raw_vehicle_master (
    raw_id              INTEGER PRIMARY KEY AUTOINCREMENT,
    source_file         TEXT    NOT NULL,
    source_row          INTEGER NOT NULL,
    ingest_timestamp    TEXT    NOT NULL DEFAULT (datetime('now','localtime')),
    vrn_raw             TEXT,
    chassis_no_raw      TEXT,
    engine_no_raw       TEXT,
    manufacturer_raw    TEXT,
    model_raw           TEXT,
    product_line_raw    TEXT,
    fuel_type_raw       TEXT,
    original_sale_date_raw TEXT,
    color_raw           TEXT,
    customer_name_raw   TEXT,
    extra_fields_json   TEXT
);

CREATE TABLE IF NOT EXISTS stg_raw_customer (
    raw_id              INTEGER PRIMARY KEY AUTOINCREMENT,
    source_file         TEXT    NOT NULL,
    source_row          INTEGER NOT NULL,
    ingest_timestamp    TEXT    NOT NULL DEFAULT (datetime('now','localtime')),
    vrn_raw             TEXT,
    customer_name_raw   TEXT,
    phone_raw           TEXT,
    address_raw         TEXT,
    extra_fields_json   TEXT
);

-- ============================================================
-- LAYER 2: DIMENSIONS
-- ============================================================

CREATE TABLE IF NOT EXISTS dim_vehicle (
    vrn                 TEXT    PRIMARY KEY,   -- KA32AB1234 normalized
    manufacturer        TEXT,
    model               TEXT,
    fuel_type           TEXT,
    year_of_build       INTEGER,
    original_sale_date  TEXT,                  -- DD-MM-YYYY
    chassis_no          TEXT,
    engine_no           TEXT,
    color               TEXT,
    is_sold_by_us       INTEGER NOT NULL DEFAULT 0,  -- 0=No, 1=Yes
    last_odometer       REAL,
    last_odometer_date  TEXT,
    -- Lineage: which source gave us each key attribute
    src_file_model      TEXT,
    src_row_model       INTEGER,
    src_file_chassis    TEXT,
    src_row_chassis     INTEGER,
    src_file_saledate   TEXT,
    src_row_saledate    INTEGER,
    -- Meta
    confidence_score    REAL    NOT NULL DEFAULT 0.0,
    validation_status   TEXT    NOT NULL DEFAULT 'VALID',
    merge_rule          TEXT,
    created_at          TEXT    NOT NULL DEFAULT (datetime('now','localtime')),
    updated_at          TEXT    NOT NULL DEFAULT (datetime('now','localtime'))
);

CREATE TABLE IF NOT EXISTS dim_customer (
    customer_id         INTEGER PRIMARY KEY AUTOINCREMENT,
    vrn                 TEXT    NOT NULL,  -- last vehicle associated
    customer_name       TEXT    NOT NULL,
    customer_name_raw   TEXT,
    phone               TEXT,
    address             TEXT,
    as_of_date          TEXT,              -- DD-MM-YYYY of latest record
    source_file         TEXT,
    source_row          INTEGER,
    confidence_score    REAL    NOT NULL DEFAULT 0.0,
    created_at          TEXT    NOT NULL DEFAULT (datetime('now','localtime')),
    FOREIGN KEY (vrn) REFERENCES dim_vehicle(vrn)
);

CREATE INDEX IF NOT EXISTS idx_customer_vrn ON dim_customer(vrn);

CREATE TABLE IF NOT EXISTS dim_employee (
    employee_id         INTEGER PRIMARY KEY AUTOINCREMENT,
    employee_name       TEXT    NOT NULL,   -- normalized title-case
    employee_name_raw   TEXT,               -- exactly as found in CSV
    employee_code       TEXT,               -- e.g. RS1_100B210 if code-style
    is_code_only        INTEGER NOT NULL DEFAULT 0,  -- 1 if no human name resolved
    default_role        TEXT,   -- ADVISOR / MECHANIC / TECHNICIAN / ELECTRICIAN
    source_file         TEXT,
    created_at          TEXT    NOT NULL DEFAULT (datetime('now','localtime'))
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_employee_name ON dim_employee(employee_name);

CREATE TABLE IF NOT EXISTS dim_service_type (
    sr_type_id          INTEGER PRIMARY KEY AUTOINCREMENT,
    raw_value           TEXT    NOT NULL UNIQUE, -- exactly as in CSV
    canonical           TEXT    NOT NULL,        -- standardized output name
    category            TEXT    NOT NULL,        -- REPAIR/WARRANTY/FREE_SERVICE/AMC/BREAKDOWN/PAID_SERVICE/OTHER
    is_approved         INTEGER NOT NULL DEFAULT 0,  -- 1 = user-confirmed
    mapped_by           TEXT    NOT NULL DEFAULT 'AUTO',  -- AUTO / USER_CONFIRMED
    created_at          TEXT    NOT NULL DEFAULT (datetime('now','localtime'))
);

-- ============================================================
-- LAYER 3: FACTS
-- ============================================================

CREATE TABLE IF NOT EXISTS fact_service_event (
    service_event_id        INTEGER PRIMARY KEY AUTOINCREMENT,
    -- Keys
    vrn                     TEXT    NOT NULL,
    customer_id             INTEGER,
    sr_type_id              INTEGER,
    job_card_no             TEXT    NOT NULL UNIQUE,  -- JC- prefix enforced
    invoice_no              TEXT,                     -- may be NULL (15 records)
    -- Dates
    service_date            TEXT,    -- DD-MM-YYYY from Invoice Date
    -- Odometer
    odometer_reading        REAL,
    odometer_status         TEXT     NOT NULL DEFAULT 'BLANK',
                            -- VALID / ZERO / BLANK / NEGATIVE / CONFLICT
    odometer_source         TEXT,
    -- Billing (from Invoice CSV)
    labour_amount           REAL     NOT NULL DEFAULT 0.0,
    spares_amount           REAL     NOT NULL DEFAULT 0.0,
    total_bill              REAL     NOT NULL DEFAULT 0.0,
    total_bill_source       TEXT,    -- which column/file provided total_bill
    -- Service details (from Service History, fallback Invoice)
    complaint_description   TEXT,
    service_advisor         TEXT,
    service_advisor_source  TEXT,    -- 'service_history' / 'invoice_fallback'
    -- JC Filter
    jc_filter_passed        INTEGER  NOT NULL DEFAULT 0,  -- 1=passed, 0=rejected
    -- Quality
    validation_status       TEXT     NOT NULL DEFAULT 'VALID',
    confidence_score        REAL     NOT NULL DEFAULT 0.0,
    -- Lineage
    merge_rule              TEXT,
    source_file             TEXT     NOT NULL,
    source_row              INTEGER  NOT NULL,
    merge_timestamp         TEXT     NOT NULL DEFAULT (datetime('now','localtime')),
    -- Foreign keys
    FOREIGN KEY (vrn)          REFERENCES dim_vehicle(vrn),
    FOREIGN KEY (customer_id)  REFERENCES dim_customer(customer_id),
    FOREIGN KEY (sr_type_id)   REFERENCES dim_service_type(sr_type_id)
);

CREATE INDEX IF NOT EXISTS idx_event_vrn       ON fact_service_event(vrn);
CREATE INDEX IF NOT EXISTS idx_event_date      ON fact_service_event(service_date);
CREATE INDEX IF NOT EXISTS idx_event_jcno      ON fact_service_event(job_card_no);
CREATE INDEX IF NOT EXISTS idx_event_jc_passed ON fact_service_event(jc_filter_passed);

CREATE TABLE IF NOT EXISTS fact_service_technician (
    tech_assignment_id  INTEGER PRIMARY KEY AUTOINCREMENT,
    service_event_id    INTEGER NOT NULL,
    employee_id         INTEGER NOT NULL,
    role                TEXT    NOT NULL,  -- MECHANIC / TECHNICIAN / ELECTRICIAN
    slot                TEXT    NOT NULL,  -- PRIMARY / SECONDARY / ADDITIONAL
    source_column       TEXT    NOT NULL,  -- MECH / TEC / ELE / TEC.1 / ELE.1 / etc.
    source_file         TEXT    NOT NULL,
    source_row          INTEGER NOT NULL,
    FOREIGN KEY (service_event_id) REFERENCES fact_service_event(service_event_id),
    FOREIGN KEY (employee_id)      REFERENCES dim_employee(employee_id)
);

CREATE INDEX IF NOT EXISTS idx_tech_event ON fact_service_technician(service_event_id);
CREATE INDEX IF NOT EXISTS idx_tech_emp   ON fact_service_technician(employee_id);

-- ============================================================
-- LAYER 4: REPORT STAGING TABLES
-- Written by ETL; read by API + Power BI exports
-- ============================================================

CREATE TABLE IF NOT EXISTS rpt_duplicate (
    dup_id              INTEGER PRIMARY KEY AUTOINCREMENT,
    dataset_type        TEXT    NOT NULL,  -- invoice / service_history / vehicle_master
    vrn                 TEXT,
    job_card_no         TEXT,
    invoice_no          TEXT,
    source_file         TEXT,
    source_row          INTEGER,
    confidence_score    REAL,
    unselected_reason   TEXT,
    created_at          TEXT    NOT NULL DEFAULT (datetime('now','localtime'))
);

CREATE TABLE IF NOT EXISTS rpt_conflict (
    conflict_id         INTEGER PRIMARY KEY AUTOINCREMENT,
    conflict_type       TEXT    NOT NULL,   -- ODOMETER_CONFLICT / BILLING_MISMATCH
    vrn                 TEXT    NOT NULL,
    service_date        TEXT,
    field_name          TEXT    NOT NULL,
    value_a             TEXT,
    value_b             TEXT,
    source_file_a       TEXT,
    source_row_a        INTEGER,
    source_file_b       TEXT,
    source_row_b        INTEGER,
    resolution          TEXT    NOT NULL DEFAULT 'UNRESOLVED',
    created_at          TEXT    NOT NULL DEFAULT (datetime('now','localtime'))
);

CREATE TABLE IF NOT EXISTS rpt_validation (
    validation_id       INTEGER PRIMARY KEY AUTOINCREMENT,
    rule_id             TEXT    NOT NULL,   -- V001..V018
    severity            TEXT    NOT NULL,   -- CRITICAL / WARNING / INFO
    vrn                 TEXT,
    job_card_no         TEXT,
    field_name          TEXT,
    raw_value           TEXT,
    description         TEXT    NOT NULL,
    source_file         TEXT,
    source_row          INTEGER,
    created_at          TEXT    NOT NULL DEFAULT (datetime('now','localtime'))
);

CREATE TABLE IF NOT EXISTS rpt_rejected (
    rejected_id         INTEGER PRIMARY KEY AUTOINCREMENT,
    reason              TEXT    NOT NULL,   -- JC_PREFIX_FAIL / SR_RECORD / DRAFT / etc.
    job_card_no         TEXT,
    vrn                 TEXT,
    source_file         TEXT    NOT NULL,
    source_row          INTEGER NOT NULL,
    raw_data_json       TEXT,               -- full row preserved
    created_at          TEXT    NOT NULL DEFAULT (datetime('now','localtime'))
);

CREATE TABLE IF NOT EXISTS rpt_merge_log (
    log_id              INTEGER PRIMARY KEY AUTOINCREMENT,
    phase               TEXT    NOT NULL,   -- LOAD / NORMALIZE / VALIDATE / MERGE / EXPORT
    action              TEXT    NOT NULL,
    details             TEXT,
    record_count        INTEGER,
    created_at          TEXT    NOT NULL DEFAULT (datetime('now','localtime'))
);

-- ============================================================
-- LAYER 5: MASTER VIEW — Vehicle History Screen
-- This VIEW is what the DWIP application queries.
-- Joins are resolved here; application queries this view only.
-- ============================================================

CREATE VIEW IF NOT EXISTS v_vehicle_history AS
SELECT
    fse.job_card_no                     AS timeline_title,
    fse.service_date                    AS service_date,
    dst.canonical                       AS service_classification,
    dst.category                        AS service_category,
    fse.odometer_reading                AS mileage_reading,
    fse.odometer_status                 AS mileage_status,
    fse.service_advisor                 AS service_advisor,
    fse.service_advisor_source          AS advisor_source,
    fse.complaint_description           AS job_description,
    fse.labour_amount                   AS labour_amount,
    fse.spares_amount                   AS spares_amount,
    fse.total_bill                      AS total_bill,
    fse.total_bill_source               AS bill_source,
    fse.invoice_no                      AS invoice_no,
    -- Vehicle profile
    dv.vrn                              AS vrn,
    dv.manufacturer                     AS manufacturer,
    dv.model                            AS model,
    dv.fuel_type                        AS fuel_type,
    dv.year_of_build                    AS year_of_build,
    dv.original_sale_date               AS original_sale_date,
    dv.chassis_no                       AS chassis_no,
    dv.engine_no                        AS engine_no,
    dv.is_sold_by_us                    AS is_sold_by_us,
    -- Customer
    dc.customer_name                    AS customer_name,
    -- Quality
    fse.validation_status               AS validation_status,
    fse.confidence_score                AS confidence_score,
    fse.merge_rule                      AS merge_rule,
    fse.source_file                     AS source_file,
    fse.merge_timestamp                 AS merge_timestamp
FROM fact_service_event fse
JOIN  dim_vehicle       dv  ON fse.vrn         = dv.vrn
LEFT JOIN dim_customer  dc  ON fse.customer_id = dc.customer_id
LEFT JOIN dim_service_type dst ON fse.sr_type_id = dst.sr_type_id
WHERE fse.jc_filter_passed = 1
ORDER BY fse.service_date DESC, fse.job_card_no DESC;

-- Useful analytical views

CREATE VIEW IF NOT EXISTS v_vehicle_profile AS
SELECT
    dv.*,
    dc.customer_name    AS current_customer,
    dc.phone            AS customer_phone,
    dc.address          AS customer_address,
    COUNT(fse.service_event_id) AS total_service_visits,
    MAX(fse.service_date)       AS last_service_date,
    SUM(fse.total_bill)         AS lifetime_spend
FROM dim_vehicle dv
LEFT JOIN dim_customer dc
    ON dv.vrn = dc.vrn
   AND dc.customer_id = (
       SELECT customer_id FROM dim_customer
       WHERE vrn = dv.vrn
       ORDER BY as_of_date DESC LIMIT 1
   )
LEFT JOIN fact_service_event fse
    ON dv.vrn = fse.vrn AND fse.jc_filter_passed = 1
GROUP BY dv.vrn;

CREATE VIEW IF NOT EXISTS v_technician_productivity AS
SELECT
    de.employee_name,
    de.default_role,
    fst.role            AS assigned_role,
    fst.slot            AS slot,
    COUNT(*)            AS job_count,
    MIN(fse.service_date) AS first_job_date,
    MAX(fse.service_date) AS last_job_date
FROM fact_service_technician fst
JOIN dim_employee de        ON fst.employee_id      = de.employee_id
JOIN fact_service_event fse ON fst.service_event_id = fse.service_event_id
WHERE fse.jc_filter_passed = 1
GROUP BY de.employee_id, fst.role, fst.slot
ORDER BY job_count DESC;
