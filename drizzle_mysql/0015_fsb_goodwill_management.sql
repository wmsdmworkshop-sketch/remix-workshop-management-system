
CREATE TABLE \	bl_fsb_campaign\ (
	\campaign_id\ varchar(50) NOT NULL,
	\oem_campaign_number\ varchar(50),
	\campaign_name\ varchar(255) NOT NULL,
	\campaign_type\ varchar(50) NOT NULL,
	\start_date\ timestamp NOT NULL,
	\end_date\ timestamp,
	\priority\ varchar(50) DEFAULT 'MEDIUM',
	\status\ varchar(50) DEFAULT 'ACTIVE',
	\created_at\ timestamp DEFAULT (now()),
	CONSTRAINT \	bl_fsb_campaign_campaign_id\ PRIMARY KEY(\campaign_id\)
);
--> statement-breakpoint
CREATE TABLE \	bl_fsb_campaign_version\ (
	\ersion_id\ varchar(50) NOT NULL,
	\campaign_id\ varchar(50) NOT NULL,
	\ersion_number\ int NOT NULL,
	\description\ text,
	\pplicable_vehicle_categories\ text,
	\pplicable_models\ text,
	\pplicable_engine_families\ text,
	\is_active\ int DEFAULT 1,
	\created_at\ timestamp DEFAULT (now()),
	CONSTRAINT \	bl_fsb_campaign_version_version_id\ PRIMARY KEY(\ersion_id\)
);
--> statement-breakpoint
CREATE TABLE \	bl_fsb_vehicle_eligibility\ (
	\eligibility_id\ varchar(50) NOT NULL,
	\campaign_id\ varchar(50) NOT NULL,
	\in\ varchar(50) NOT NULL,
	\engine_number\ varchar(50),
	\chassis_number\ varchar(50),
	\eligibility_status\ varchar(50) DEFAULT 'ELIGIBLE',
	\eason\ text,
	\alidated_date\ timestamp DEFAULT (now()),
	CONSTRAINT \	bl_fsb_vehicle_eligibility_eligibility_id\ PRIMARY KEY(\eligibility_id\)
);
--> statement-breakpoint
CREATE TABLE \	bl_fsb_eligibility_snapshot\ (
	\snapshot_id\ varchar(50) NOT NULL,
	\eligibility_id\ varchar(50) NOT NULL,
	\previous_status\ varchar(50),
	\
ew_status\ varchar(50),
	\eason\ text,
	\snapshot_date\ timestamp DEFAULT (now()),
	CONSTRAINT \	bl_fsb_eligibility_snapshot_snapshot_id\ PRIMARY KEY(\snapshot_id\)
);
--> statement-breakpoint
CREATE TABLE \	bl_fsb_execution\ (
	\execution_id\ varchar(50) NOT NULL,
	\campaign_id\ varchar(50) NOT NULL,
	\job_id\ int NOT NULL,
	\in\ varchar(50) NOT NULL,
	\	echnician_id\ varchar(50),
	\workshop_id\ varchar(50),
	\execution_status\ varchar(50) DEFAULT 'STARTED',
	\ttempt_number\ int DEFAULT 1,
	\start_time\ timestamp,
	\completion_time\ timestamp,
	\parts_used\ decimal(10,2),
	\labour_used\ decimal(10,2),
	\
otes\ text,
	CONSTRAINT \	bl_fsb_execution_execution_id\ PRIMARY KEY(\execution_id\)
);
--> statement-breakpoint
CREATE TABLE \	bl_goodwill_request\ (
	\equest_id\ varchar(50) NOT NULL,
	\in\ varchar(50) NOT NULL,
	\customer_id\ varchar(50),
	\job_id\ int,
	\eason\ text,
	\category\ varchar(50),
	\equested_amount\ decimal(10,2),
	\dealer_share_pct\ decimal(5,2),
	\dealer_share_limit\ decimal(10,2),
	\oem_share_pct\ decimal(5,2),
	\oem_share_limit\ decimal(10,2),
	\customer_share_pct\ decimal(5,2),
	\workflow_state\ varchar(50) DEFAULT 'DRAFT',
	\created_at\ timestamp DEFAULT (now()),
	CONSTRAINT \	bl_goodwill_request_request_id\ PRIMARY KEY(\equest_id\)
);
--> statement-breakpoint
CREATE TABLE \	bl_goodwill_line\ (
	\line_id\ varchar(50) NOT NULL,
	\equest_id\ varchar(50) NOT NULL,
	\item_type\ varchar(50),
	\equested_amount\ decimal(10,2),
	\pproved_amount\ decimal(10,2),
	\ejected_amount\ decimal(10,2),
	\eason\ text,
	CONSTRAINT \	bl_goodwill_line_line_id\ PRIMARY KEY(\line_id\)
);
--> statement-breakpoint
CREATE TABLE \	bl_goodwill_approval\ (
	\pproval_id\ varchar(50) NOT NULL,
	\equest_id\ varchar(50) NOT NULL,
	\pprover_id\ varchar(50),
	\pproval_level\ varchar(50),
	\decision\ varchar(50),
	\emarks\ text,
	\	imestamp\ timestamp DEFAULT (now()),
	CONSTRAINT \	bl_goodwill_approval_approval_id\ PRIMARY KEY(\pproval_id\)
);
--> statement-breakpoint
CREATE TABLE \	bl_goodwill_settlement\ (
	\settlement_id\ varchar(50) NOT NULL,
	\equest_id\ varchar(50) NOT NULL,
	\oem_recovery\ decimal(10,2),
	\dealer_cost\ decimal(10,2),
	\customer_cost\ decimal(10,2),
	\payment_status\ varchar(50) DEFAULT 'PENDING',
	CONSTRAINT \	bl_goodwill_settlement_settlement_id\ PRIMARY KEY(\settlement_id\)
);
--> statement-breakpoint
CREATE TABLE \	bl_fsb_goodwill_history\ (
	\history_id\ varchar(50) NOT NULL,
	\eference_id\ varchar(50) NOT NULL,
	\domain\ varchar(50) NOT NULL,
	\ction\ varchar(50),
	\details\ text,
	\	imestamp\ timestamp DEFAULT (now()),
	CONSTRAINT \	bl_fsb_goodwill_history_history_id\ PRIMARY KEY(\history_id\)
);

