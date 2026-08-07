-- =============================================================================
-- Migration: 0009_core_master_entities
-- Requirement: Seed core master tables with bitemporal system versioning
-- Bounded Context: Master Data Governance
-- Idempotency: Enforced via CREATE TABLE IF NOT EXISTS
-- =============================================================================

--> statement-breakpoint
CREATE TABLE IF NOT EXISTS core_customers (
    customer_version_id INT AUTO_INCREMENT NOT NULL,
    customer_id INT NOT NULL,
    version_number INT NOT NULL,
    is_current BOOLEAN NOT NULL DEFAULT TRUE,
    valid_from DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    valid_to DATETIME NOT NULL DEFAULT '9999-12-31 23:59:59',
    canonical_name VARCHAR(255) NOT NULL,
    display_name VARCHAR(255) NULL,
    customer_type VARCHAR(50) NOT NULL,
    parent_customer_id INT NULL,
    contact_name VARCHAR(255) NULL,
    mobile_primary VARCHAR(20) NULL,
    mobile_secondary VARCHAR(20) NULL,
    email VARCHAR(255) NULL,
    address TEXT NULL,
    city VARCHAR(100) NULL,
    state VARCHAR(100) NULL,
    pincode VARCHAR(10) NULL,
    gst_number VARCHAR(15) NULL,
    pan_number VARCHAR(10) NULL,
    fleet_size INT DEFAULT 0,
    oracle_customer_id VARCHAR(100) NULL,
    source_system VARCHAR(100) NOT NULL,
    created_by INT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    record_status VARCHAR(50) DEFAULT 'CANONICAL',
    CONSTRAINT pk_core_customers PRIMARY KEY (customer_version_id)
);

--> statement-breakpoint
CREATE TABLE IF NOT EXISTS core_customer_aliases (
    alias_id INT AUTO_INCREMENT NOT NULL,
    customer_id INT NOT NULL,
    alias_value VARCHAR(255) NOT NULL,
    alias_type VARCHAR(50) NOT NULL,
    first_seen_batch_id INT NULL,
    created_by INT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT pk_core_customer_aliases PRIMARY KEY (alias_id)
);

--> statement-breakpoint
CREATE TABLE IF NOT EXISTS core_fleets (
    fleet_version_id INT AUTO_INCREMENT NOT NULL,
    fleet_id INT NOT NULL,
    version_number INT NOT NULL,
    is_current BOOLEAN NOT NULL DEFAULT TRUE,
    valid_from DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    valid_to DATETIME NOT NULL DEFAULT '9999-12-31 23:59:59',
    fleet_name VARCHAR(255) NOT NULL,
    company_registration_no VARCHAR(100) NULL,
    credit_limit DECIMAL(12,2) DEFAULT 0.00,
    authorized_vehicle_count INT DEFAULT 0,
    parent_fleet_id INT NULL,
    primary_contact_customer_id INT NULL,
    billing_address TEXT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT pk_core_fleets PRIMARY KEY (fleet_version_id)
);

--> statement-breakpoint
CREATE TABLE IF NOT EXISTS core_drivers (
    driver_version_id INT AUTO_INCREMENT NOT NULL,
    driver_id INT NOT NULL,
    version_number INT NOT NULL,
    is_current BOOLEAN NOT NULL DEFAULT TRUE,
    valid_from DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    valid_to DATETIME NOT NULL DEFAULT '9999-12-31 23:59:59',
    full_name VARCHAR(255) NOT NULL,
    license_number VARCHAR(50) NULL,
    license_expiry_date DATE NULL,
    mobile_no VARCHAR(20) NULL,
    safety_score DECIMAL(3,2) DEFAULT 5.00,
    active_vehicle_id INT NULL,
    source_system VARCHAR(100) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT pk_core_drivers PRIMARY KEY (driver_version_id)
);

--> statement-breakpoint
CREATE TABLE IF NOT EXISTS core_vehicles (
    vehicle_version_id INT AUTO_INCREMENT NOT NULL,
    vehicle_id INT NOT NULL,
    version_number INT NOT NULL,
    is_current BOOLEAN NOT NULL DEFAULT TRUE,
    valid_from DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    valid_to DATETIME NOT NULL DEFAULT '9999-12-31 23:59:59',
    vrn VARCHAR(20) NOT NULL,
    vrn_display VARCHAR(30) NULL,
    chassis_number VARCHAR(50) NULL,
    engine_number VARCHAR(50) NULL,
    vehicle_make VARCHAR(100) DEFAULT 'Tata Motors',
    vehicle_model VARCHAR(100) NULL,
    vehicle_year INT NULL,
    vehicle_category VARCHAR(50) NULL,
    fuel_type VARCHAR(50) NULL,
    current_owner_customer_id INT NULL,
    fleet_id INT NULL,
    oracle_vehicle_id VARCHAR(100) NULL,
    last_km_reading INT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT pk_core_vehicles PRIMARY KEY (vehicle_version_id)
);

--> statement-breakpoint
CREATE INDEX idx_customers_id ON core_customers (customer_id);
--> statement-breakpoint
CREATE INDEX idx_customers_name ON core_customers (canonical_name);
--> statement-breakpoint
CREATE INDEX idx_customer_aliases_val ON core_customer_aliases (alias_value);
--> statement-breakpoint
CREATE INDEX idx_fleets_id ON core_fleets (fleet_id);
--> statement-breakpoint
CREATE INDEX idx_drivers_id ON core_drivers (driver_id);
--> statement-breakpoint
CREATE INDEX idx_vehicles_id ON core_vehicles (vehicle_id);
--> statement-breakpoint
CREATE INDEX idx_vehicles_vrn ON core_vehicles (vrn);
