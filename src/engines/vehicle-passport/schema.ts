import { pool as db } from "../../db/index.ts";

/**
 * Automates creation of all 10 normalized schema tables for the Vehicle Passport™ system.
 * Designed to run safe migrations if tables do not exist.
 */
export async function ensureVehiclePassportSchema(): Promise<void> {
  console.log("[DB-MIGRATE] Ensuring Vehicle Passport™ schema tables...");

  // 1. vehicle_passports
  await db.execute(`
    CREATE TABLE IF NOT EXISTS vehicle_passports (
      passport_id VARCHAR(255) PRIMARY KEY,
      vehicle_id VARCHAR(255) UNIQUE NOT NULL,
      vin VARCHAR(255) UNIQUE NOT NULL,
      engine_no VARCHAR(255),
      registration_no VARCHAR(255),
      make VARCHAR(255),
      model VARCHAR(255),
      year_of_manufacture INT,
      fuel_type VARCHAR(255),
      body_type VARCHAR(255),
      passport_status VARCHAR(50) DEFAULT 'ACTIVE',
      passport_score DECIMAL(5,2) DEFAULT 100.00,
      health_score DECIMAL(5,2) DEFAULT 100.00,
      trust_score DECIMAL(5,2) DEFAULT 100.00,
      total_events INT DEFAULT 0,
      verified_events INT DEFAULT 0,
      dealer_id VARCHAR(255),
      branch_id VARCHAR(255),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB;
  `);

  // 2. vehicle_events
  await db.execute(`
    CREATE TABLE IF NOT EXISTS vehicle_events (
      event_id VARCHAR(255) PRIMARY KEY,
      passport_id VARCHAR(255) NOT NULL,
      event_type VARCHAR(100) NOT NULL,
      event_source VARCHAR(50) NOT NULL,
      event_date TIMESTAMP NOT NULL,
      odometer_km INT DEFAULT 0,
      description TEXT,
      verification_level INT DEFAULT 1,
      verified_by VARCHAR(255),
      dealer_id VARCHAR(255),
      branch_id VARCHAR(255),
      ai_analysis JSON,
      metadata JSON,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (passport_id) REFERENCES vehicle_passports(passport_id) ON DELETE CASCADE
    ) ENGINE=InnoDB;
  `);

  // 3. vehicle_documents
  await db.execute(`
    CREATE TABLE IF NOT EXISTS vehicle_documents (
      document_id VARCHAR(255) PRIMARY KEY,
      passport_id VARCHAR(255) NOT NULL,
      event_id VARCHAR(255),
      document_type VARCHAR(100) NOT NULL,
      provider VARCHAR(255),
      verification_status VARCHAR(50) DEFAULT 'PENDING',
      ocr_score DECIMAL(5,2) DEFAULT 0.00,
      authenticity_score DECIMAL(5,2) DEFAULT 0.00,
      tampering_score DECIMAL(5,2) DEFAULT 0.00,
      ai_confidence DECIMAL(5,2) DEFAULT 0.00,
      verification_level INT DEFAULT 1,
      storage_reference TEXT,
      document_hash VARCHAR(255) NOT NULL,
      extracted_fields JSON,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (passport_id) REFERENCES vehicle_passports(passport_id) ON DELETE CASCADE
    ) ENGINE=InnoDB;
  `);

  // 4. vehicle_modifications
  await db.execute(`
    CREATE TABLE IF NOT EXISTS vehicle_modifications (
      modification_id VARCHAR(255) PRIMARY KEY,
      passport_id VARCHAR(255) NOT NULL,
      event_id VARCHAR(255) NOT NULL,
      modification_type VARCHAR(100) NOT NULL,
      description TEXT,
      vendor VARCHAR(255),
      cost DECIMAL(12,2) DEFAULT 0.00,
      verification_level INT DEFAULT 1,
      modification_date TIMESTAMP NOT NULL,
      FOREIGN KEY (passport_id) REFERENCES vehicle_passports(passport_id) ON DELETE CASCADE,
      FOREIGN KEY (event_id) REFERENCES vehicle_events(event_id) ON DELETE CASCADE
    ) ENGINE=InnoDB;
  `);

  // 5. vehicle_repairs
  await db.execute(`
    CREATE TABLE IF NOT EXISTS vehicle_repairs (
      repair_id VARCHAR(255) PRIMARY KEY,
      passport_id VARCHAR(255) NOT NULL,
      event_id VARCHAR(255) NOT NULL,
      repair_type VARCHAR(100) NOT NULL,
      severity VARCHAR(50) NOT NULL,
      description TEXT,
      workshop_name VARCHAR(255),
      workshop_type VARCHAR(50) NOT NULL,
      labour_cost DECIMAL(12,2) DEFAULT 0.00,
      parts_cost DECIMAL(12,2) DEFAULT 0.00,
      total_cost DECIMAL(12,2) DEFAULT 0.00,
      verification_level INT DEFAULT 1,
      repair_date TIMESTAMP NOT NULL,
      FOREIGN KEY (passport_id) REFERENCES vehicle_passports(passport_id) ON DELETE CASCADE,
      FOREIGN KEY (event_id) REFERENCES vehicle_events(event_id) ON DELETE CASCADE
    ) ENGINE=InnoDB;
  `);

  // 6. vehicle_accidents
  await db.execute(`
    CREATE TABLE IF NOT EXISTS vehicle_accidents (
      accident_id VARCHAR(255) PRIMARY KEY,
      passport_id VARCHAR(255) NOT NULL,
      event_id VARCHAR(255) NOT NULL,
      severity VARCHAR(50) NOT NULL,
      description TEXT,
      insurance_claim_no VARCHAR(255),
      claim_status VARCHAR(100),
      claim_amount DECIMAL(12,2) DEFAULT 0.00,
      verification_level INT DEFAULT 1,
      accident_date TIMESTAMP NOT NULL,
      FOREIGN KEY (passport_id) REFERENCES vehicle_passports(passport_id) ON DELETE CASCADE,
      FOREIGN KEY (event_id) REFERENCES vehicle_events(event_id) ON DELETE CASCADE
    ) ENGINE=InnoDB;
  `);

  // 7. vehicle_parts_history
  await db.execute(`
    CREATE TABLE IF NOT EXISTS vehicle_parts_history (
      part_id VARCHAR(255) PRIMARY KEY,
      passport_id VARCHAR(255) NOT NULL,
      event_id VARCHAR(255) NOT NULL,
      part_name VARCHAR(255) NOT NULL,
      part_number VARCHAR(100),
      part_type VARCHAR(100),
      brand VARCHAR(255),
      cost DECIMAL(12,2) DEFAULT 0.00,
      warranty_months INT DEFAULT 0,
      verification_level INT DEFAULT 1,
      installed_date TIMESTAMP NOT NULL,
      FOREIGN KEY (passport_id) REFERENCES vehicle_passports(passport_id) ON DELETE CASCADE,
      FOREIGN KEY (event_id) REFERENCES vehicle_events(event_id) ON DELETE CASCADE
    ) ENGINE=InnoDB;
  `);

  // 8. vehicle_ownership_history
  await db.execute(`
    CREATE TABLE IF NOT EXISTS vehicle_ownership_history (
      ownership_id VARCHAR(255) PRIMARY KEY,
      passport_id VARCHAR(255) NOT NULL,
      owner_name VARCHAR(255) NOT NULL,
      owner_type VARCHAR(50) NOT NULL,
      contact VARCHAR(255),
      ownership_start TIMESTAMP NOT NULL,
      ownership_end TIMESTAMP NULL,
      transfer_method VARCHAR(100),
      verification_level INT DEFAULT 1,
      FOREIGN KEY (passport_id) REFERENCES vehicle_passports(passport_id) ON DELETE CASCADE
    ) ENGINE=InnoDB;
  `);

  // 9. vehicle_certificates
  await db.execute(`
    CREATE TABLE IF NOT EXISTS vehicle_certificates (
      certificate_id VARCHAR(255) PRIMARY KEY,
      passport_id VARCHAR(255) NOT NULL,
      certificate_type VARCHAR(100) NOT NULL,
      certificate_status VARCHAR(50) DEFAULT 'VALID',
      qr_code VARCHAR(255) UNIQUE NOT NULL,
      digital_signature TEXT NOT NULL,
      certificate_hash VARCHAR(255) UNIQUE NOT NULL,
      health_snapshot JSON NOT NULL,
      trust_snapshot JSON NOT NULL,
      passport_score_at_generation DECIMAL(5,2) NOT NULL,
      generated_by VARCHAR(255) NOT NULL,
      tier VARCHAR(50) DEFAULT 'FREE',
      generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      expires_at TIMESTAMP NULL,
      revoked_at TIMESTAMP NULL,
      view_specific_data JSON,
      FOREIGN KEY (passport_id) REFERENCES vehicle_passports(passport_id) ON DELETE CASCADE
    ) ENGINE=InnoDB;
  `);

  console.log("[DB-MIGRATE] Schema verification complete.");
}
