
CREATE TABLE \	bl_amc_product\ (
	\product_id\ varchar(50) NOT NULL,
	\product_name\ varchar(100) NOT NULL,
	\ase_price\ decimal(10,2) NOT NULL,
	\duration_months\ int NOT NULL,
	\km_limit\ int NOT NULL,
	\service_count_limit\ int NOT NULL,
	\is_active\ int DEFAULT 1,
	CONSTRAINT \	bl_amc_product_product_id\ PRIMARY KEY(\product_id\)
);
--> statement-breakpoint
CREATE TABLE \	bl_amc_contract\ (
	\contract_id\ varchar(50) NOT NULL,
	\product_id\ varchar(50) NOT NULL,
	\customer_id\ varchar(50) NOT NULL,
	\contract_type\ varchar(50) NOT NULL,
	\start_date\ timestamp NOT NULL,
	\expiry_date\ timestamp NOT NULL,
	\workflow_state\ varchar(50) DEFAULT 'DRAFT',
	\payment_status\ varchar(50) DEFAULT 'PENDING',
	\	otal_value\ decimal(10,2),
	\created_at\ timestamp DEFAULT (now()),
	\updated_at\ timestamp DEFAULT (now()),
	CONSTRAINT \	bl_amc_contract_contract_id\ PRIMARY KEY(\contract_id\)
);
--> statement-breakpoint
CREATE TABLE \	bl_amc_contract_vehicles\ (
	\mapping_id\ varchar(50) NOT NULL,
	\contract_id\ varchar(50) NOT NULL,
	\in\ varchar(50) NOT NULL,
	\is_active\ int DEFAULT 1,
	CONSTRAINT \	bl_amc_contract_vehicles_mapping_id\ PRIMARY KEY(\mapping_id\)
);
--> statement-breakpoint
CREATE TABLE \	bl_amc_coverage\ (
	\coverage_id\ varchar(50) NOT NULL,
	\product_id\ varchar(50) NOT NULL,
	\item_type\ varchar(50) NOT NULL,
	\item_code\ varchar(50),
	\coverage_percentage\ decimal(5,2) NOT NULL,
	\is_active\ int DEFAULT 1,
	CONSTRAINT \	bl_amc_coverage_coverage_id\ PRIMARY KEY(\coverage_id\)
);
--> statement-breakpoint
CREATE TABLE \	bl_amc_consumption_ledger\ (
	\ledger_id\ varchar(50) NOT NULL,
	\contract_id\ varchar(50) NOT NULL,
	\in\ varchar(50) NOT NULL,
	\job_id\ int NOT NULL,
	\	ransaction_type\ varchar(50) NOT NULL,
	\mount\ decimal(10,2),
	\service_count\ int,
	\km_reading\ int,
	\details\ text,
	\	imestamp\ timestamp DEFAULT (now()),
	CONSTRAINT \	bl_amc_consumption_ledger_ledger_id\ PRIMARY KEY(\ledger_id\)
);
--> statement-breakpoint
CREATE TABLE \	bl_amc_claim\ (
	\claim_id\ varchar(50) NOT NULL,
	\contract_id\ varchar(50) NOT NULL,
	\job_id\ int NOT NULL,
	\	otal_claim_amount\ decimal(10,2),
	\status\ varchar(50) DEFAULT 'PENDING',
	\created_at\ timestamp DEFAULT (now()),
	CONSTRAINT \	bl_amc_claim_claim_id\ PRIMARY KEY(\claim_id\)
);
--> statement-breakpoint
CREATE TABLE \	bl_amc_claim_line\ (
	\line_id\ varchar(50) NOT NULL,
	\claim_id\ varchar(50) NOT NULL,
	\item_type\ varchar(50) NOT NULL,
	\item_code\ varchar(50) NOT NULL,
	\mount\ decimal(10,2),
	\coverage_applied\ decimal(5,2),
	\customer_share\ decimal(10,2),
	\provider_share\ decimal(10,2),
	CONSTRAINT \	bl_amc_claim_line_line_id\ PRIMARY KEY(\line_id\)
);
--> statement-breakpoint
CREATE TABLE \	bl_amc_history\ (
	\history_id\ varchar(50) NOT NULL,
	\contract_id\ varchar(50) NOT NULL,
	\ction\ varchar(50),
	\details\ text,
	\	imestamp\ timestamp DEFAULT (now()),
	CONSTRAINT \	bl_amc_history_history_id\ PRIMARY KEY(\history_id\)
);

