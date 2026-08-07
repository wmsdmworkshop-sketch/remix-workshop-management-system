
CREATE TABLE \	bl_warranty_coverage_rules\ (
	\ule_id\ varchar(50) NOT NULL,
	\operation_type\ varchar(50) NOT NULL,
	\min_age_months\ int DEFAULT 0,
	\max_age_months\ int,
	\min_mileage\ int DEFAULT 0,
	\max_mileage\ int,
	\is_active\ int DEFAULT 1,
	CONSTRAINT \	bl_warranty_coverage_rules_rule_id\ PRIMARY KEY(\ule_id\)
);
--> statement-breakpoint
CREATE TABLE \	bl_warranty_claims\ (
	\claim_id\ varchar(50) NOT NULL,
	\job_id\ int NOT NULL,
	\in\ varchar(50) NOT NULL,
	\operation_type\ varchar(50) NOT NULL,
	\workflow_state\ varchar(50) DEFAULT 'CLAIM_CREATED',
	\	otal_claimed_amount\ decimal(10,2),
	\	otal_approved_amount\ decimal(10,2),
	\oem_claim_reference\ varchar(100),
	\created_at\ timestamp DEFAULT (now()),
	\updated_at\ timestamp DEFAULT (now()),
	CONSTRAINT \	bl_warranty_claims_claim_id\ PRIMARY KEY(\claim_id\)
);
--> statement-breakpoint
CREATE TABLE \	bl_warranty_claim_lines\ (
	\line_id\ varchar(50) NOT NULL,
	\claim_id\ varchar(50) NOT NULL,
	\line_type\ varchar(20) NOT NULL,
	\item_code\ varchar(50) NOT NULL,
	\quantity\ int DEFAULT 1,
	\unit_price\ decimal(10,2),
	\claimed_amount\ decimal(10,2),
	\pproved_amount\ decimal(10,2),
	\ejection_reason\ varchar(255),
	CONSTRAINT \	bl_warranty_claim_lines_line_id\ PRIMARY KEY(\line_id\)
);
--> statement-breakpoint
CREATE TABLE \	bl_warranty_oem_responses\ (
	\esponse_id\ varchar(50) NOT NULL,
	\claim_id\ varchar(50) NOT NULL,
	\status_code\ varchar(50),
	\aw_payload\ text,
	\eceived_at\ timestamp DEFAULT (now()),
	CONSTRAINT \	bl_warranty_oem_responses_response_id\ PRIMARY KEY(\esponse_id\)
);
--> statement-breakpoint
CREATE TABLE \	bl_warranty_attachments\ (
	\ttachment_id\ varchar(50) NOT NULL,
	\claim_id\ varchar(50) NOT NULL,
	\ile_url\ varchar(255) NOT NULL,
	\document_type\ varchar(50),
	CONSTRAINT \	bl_warranty_attachments_attachment_id\ PRIMARY KEY(\ttachment_id\)
);
--> statement-breakpoint
CREATE TABLE \	bl_warranty_settlement\ (
	\settlement_id\ varchar(50) NOT NULL,
	\claim_id\ varchar(50) NOT NULL,
	\settled_amount\ decimal(10,2),
	\settled_at\ timestamp DEFAULT (now()),
	CONSTRAINT \	bl_warranty_settlement_settlement_id\ PRIMARY KEY(\settlement_id\)
);
--> statement-breakpoint
CREATE TABLE \	bl_warranty_history\ (
	\history_id\ varchar(50) NOT NULL,
	\claim_id\ varchar(50) NOT NULL,
	\ction\ varchar(50),
	\details\ text,
	\	imestamp\ timestamp DEFAULT (now()),
	CONSTRAINT \	bl_warranty_history_history_id\ PRIMARY KEY(\history_id\)
);

