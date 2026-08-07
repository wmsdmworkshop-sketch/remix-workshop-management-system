-- =============================================================================
-- Migration: 0010_role_permission_master
-- Scope: Sprint 1 Role, Permission, Module and User Master Cleanup
-- Governing Document: EAR-001 Section 3
-- =============================================================================

--> statement-breakpoint
CREATE TABLE IF NOT EXISTS modules (
    module_id INT AUTO_INCREMENT PRIMARY KEY,
    module_name VARCHAR(100) NOT NULL UNIQUE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

--> statement-breakpoint
INSERT IGNORE INTO modules (module_name) VALUES 
('Dashboard'),
('Bay Queue'),
('Job Cards'),
('Revenue'),
('Ledger'),
('Warranty'),
('FSB'),
('Query'),
('Billing'),
('DMS Import'),
('User Management'),
('Breakdowns');

--> statement-breakpoint
-- Seed canonical roles if not already present
INSERT IGNORE INTO roles (role_name, permission_level) VALUES
('admin', 'full'),
('dealer_principal', 'full'),
('gm_service', 'full'),
('workshop_manager', 'full'),
('service_advisor', 'limited'),
('floor_supervisor', 'limited'),
('technician', 'limited'),
('quality_check', 'limited'),
('reception', 'read'),
('security_agent', 'limited'),
('billing', 'limited'),
('cashier', 'limited'),
('spares_manager', 'limited'),
('breakdown', 'limited'),
('warranty_manager', 'limited'),
('dkam', 'limited'),
('developer', 'full');

--> statement-breakpoint
-- Map old user roles to standard lowercase roles
UPDATE users SET role = 'quality_check' WHERE role = 'qc_inspector';
UPDATE users SET role = 'security_agent' WHERE role = 'gate_personnel';
UPDATE users SET role = 'floor_supervisor' WHERE role = 'supervisor';

--> statement-breakpoint
-- Alter users to add role_id and populate it
ALTER TABLE users ADD COLUMN role_id INT NULL;

--> statement-breakpoint
UPDATE users u JOIN roles r ON r.role_name = u.role SET u.role_id = r.role_id;

--> statement-breakpoint
-- Set fallback for developer/admin accounts if role was not matched
UPDATE users SET role_id = (SELECT role_id FROM roles WHERE role_name = 'developer' LIMIT 1) WHERE role_id IS NULL AND username = 'developer';
UPDATE users SET role_id = (SELECT role_id FROM roles WHERE role_name = 'admin' LIMIT 1) WHERE role_id IS NULL AND (username = 'admin' OR username = 'workshop_admin');

--> statement-breakpoint
-- For any remaining mismatched role, default to reception
UPDATE users u JOIN roles r ON r.role_name = 'reception' SET u.role_id = r.role_id WHERE u.role_id IS NULL;

--> statement-breakpoint
ALTER TABLE users MODIFY COLUMN role_id INT NOT NULL;

--> statement-breakpoint
ALTER TABLE users ADD CONSTRAINT fk_users_role FOREIGN KEY (role_id) REFERENCES roles (role_id);

--> statement-breakpoint
-- Migrate role_permissions to structured role_id and module_id
RENAME TABLE role_permissions TO role_permissions_old;

--> statement-breakpoint
CREATE TABLE role_permissions (
    permission_id INT AUTO_INCREMENT PRIMARY KEY,
    role_id INT NOT NULL,
    module_id INT NOT NULL,
    can_view TINYINT(1) DEFAULT 0,
    can_edit TINYINT(1) DEFAULT 0,
    can_comment TINYINT(1) DEFAULT 0,
    updated_by INT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_role_permissions_role FOREIGN KEY (role_id) REFERENCES roles (role_id) ON DELETE CASCADE,
    CONSTRAINT fk_role_permissions_module FOREIGN KEY (module_id) REFERENCES modules (module_id) ON DELETE CASCADE,
    UNIQUE KEY uq_role_module (role_id, module_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

--> statement-breakpoint
-- Map old permissions based on matching strings
INSERT IGNORE INTO role_permissions (role_id, module_id, can_view, can_edit, can_comment, updated_by, updated_at)
SELECT r.role_id, m.module_id, rp.can_view, rp.can_edit, rp.can_comment, rp.updated_by, rp.updated_at
FROM role_permissions_old rp
JOIN roles r ON r.role_name = rp.role_name
JOIN modules m ON m.module_name = rp.module_name;

--> statement-breakpoint
DROP TABLE role_permissions_old;
