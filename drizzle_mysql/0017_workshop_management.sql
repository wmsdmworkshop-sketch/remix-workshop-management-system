
CREATE TABLE \	bl_gate_entry\ (
	\gate_entry_id\ varchar(50) NOT NULL,
	\in\ varchar(50) NOT NULL,
	\customer_id\ varchar(50),
	\rrival_time\ timestamp DEFAULT (now()),
	\source\ varchar(50),
	\ppointment_id\ varchar(50),
	\reakdown_id\ varchar(50),
	\dvisor_id\ varchar(50),
	\odometer\ int,
	\uel_level\ int,
	\driver_details\ text,
	\initial_remarks\ text,
	\status\ varchar(50),
	CONSTRAINT \	bl_gate_entry_gate_entry_id\ PRIMARY KEY(\gate_entry_id\)
);
--> statement-breakpoint
CREATE TABLE \	bl_workshop_appointment\ (
	\ppointment_id\ varchar(50) NOT NULL,
	\in\ varchar(50) NOT NULL,
	\customer_id\ varchar(50),
	\preferred_date\ timestamp,
	\service_type\ varchar(50),
	\dvisor_id\ varchar(50),
	\status\ varchar(50),
	CONSTRAINT \	bl_workshop_appointment_appointment_id\ PRIMARY KEY(\ppointment_id\)
);
--> statement-breakpoint
CREATE TABLE \	bl_job_card\ (
	\job_card_id\ varchar(50) NOT NULL,
	\gate_entry_id\ varchar(50),
	\reakdown_id\ varchar(50),
	\ppointment_id\ varchar(50),
	\warranty_id\ varchar(50),
	\mc_id\ varchar(50),
	\sb_id\ varchar(50),
	\service_type\ varchar(50),
	\dvisor_id\ varchar(50),
	\customer_complaint\ text,
	\workflow_state\ varchar(50) DEFAULT 'JOB_CARD_CREATED',
	\operational_state\ varchar(50),
	\created_at\ timestamp DEFAULT (now()),
	CONSTRAINT \	bl_job_card_job_card_id\ PRIMARY KEY(\job_card_id\)
);
--> statement-breakpoint
CREATE TABLE \	bl_job_card_revision\ (
	\evision_id\ varchar(50) NOT NULL,
	\job_card_id\ varchar(50) NOT NULL,
	\ersion\ int,
	\changes_summary\ text,
	\evised_by\ varchar(50),
	\	imestamp\ timestamp DEFAULT (now()),
	CONSTRAINT \	bl_job_card_revision_revision_id\ PRIMARY KEY(\evision_id\)
);
--> statement-breakpoint
CREATE TABLE \	bl_job_operation\ (
	\operation_id\ varchar(50) NOT NULL,
	\job_card_id\ varchar(50) NOT NULL,
	\operation_code\ varchar(50),
	\description\ text,
	\standard_hours\ decimal(10,2),
	\ctual_hours\ decimal(10,2),
	\	echnician_id\ varchar(50),
	\ay_id\ varchar(50),
	\status\ varchar(50),
	\start_time\ timestamp,
	\end_time\ timestamp,
	\pause_time_minutes\ int DEFAULT 0,
	\waiting_time_minutes\ int DEFAULT 0,
	\ework_count\ int DEFAULT 0,
	CONSTRAINT \	bl_job_operation_operation_id\ PRIMARY KEY(\operation_id\)
);
--> statement-breakpoint
CREATE TABLE \	bl_workshop_estimate\ (
	\estimate_id\ varchar(50) NOT NULL,
	\job_card_id\ varchar(50) NOT NULL,
	\	otal_labour\ decimal(10,2),
	\	otal_parts\ decimal(10,2),
	\status\ varchar(50),
	\current_version\ int DEFAULT 1,
	\created_at\ timestamp DEFAULT (now()),
	CONSTRAINT \	bl_workshop_estimate_estimate_id\ PRIMARY KEY(\estimate_id\)
);
--> statement-breakpoint
CREATE TABLE \	bl_workshop_estimate_revision\ (
	\evision_id\ varchar(50) NOT NULL,
	\estimate_id\ varchar(50) NOT NULL,
	\ersion\ int,
	\	otal_amount\ decimal(10,2),
	\customer_remarks\ text,
	\	imestamp\ timestamp DEFAULT (now()),
	CONSTRAINT \	bl_workshop_estimate_revision_revision_id\ PRIMARY KEY(\evision_id\)
);
--> statement-breakpoint
CREATE TABLE \	bl_bay_master\ (
	\ay_id\ varchar(50) NOT NULL,
	\workshop_id\ varchar(50),
	\ay_type\ varchar(50),
	\status\ varchar(50),
	CONSTRAINT \	bl_bay_master_bay_id\ PRIMARY KEY(\ay_id\)
);
--> statement-breakpoint
CREATE TABLE \	bl_bay_allocation\ (
	\llocation_id\ varchar(50) NOT NULL,
	\job_card_id\ varchar(50) NOT NULL,
	\ay_id\ varchar(50),
	\llocated_time\ timestamp DEFAULT (now()),
	\eleased_time\ timestamp,
	CONSTRAINT \	bl_bay_allocation_allocation_id\ PRIMARY KEY(\llocation_id\)
);
--> statement-breakpoint
CREATE TABLE \	bl_quality_inspection\ (
	\inspection_id\ varchar(50) NOT NULL,
	\job_card_id\ varchar(50) NOT NULL,
	\inspection_stage\ varchar(50),
	\inspector_id\ varchar(50),
	\status\ varchar(50),
	\	imestamp\ timestamp DEFAULT (now()),
	CONSTRAINT \	bl_quality_inspection_inspection_id\ PRIMARY KEY(\inspection_id\)
);
--> statement-breakpoint
CREATE TABLE \	bl_vehicle_delivery\ (
	\delivery_id\ varchar(50) NOT NULL,
	\job_card_id\ varchar(50) NOT NULL,
	\delivery_time\ timestamp DEFAULT (now()),
	\status\ varchar(50),
	CONSTRAINT \	bl_vehicle_delivery_delivery_id\ PRIMARY KEY(\delivery_id\)
);
--> statement-breakpoint
CREATE TABLE \	bl_workshop_timeline\ (
	\	imeline_id\ varchar(50) NOT NULL,
	\eference_id\ varchar(50) NOT NULL,
	\event_type\ varchar(50),
	\description\ text,
	\performed_by\ varchar(50),
	\	imestamp\ timestamp DEFAULT (now()),
	CONSTRAINT \	bl_workshop_timeline_timeline_id\ PRIMARY KEY(\	imeline_id\)
);

