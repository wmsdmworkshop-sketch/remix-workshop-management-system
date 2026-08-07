
CREATE TABLE \	bl_breakdown_case\ (
	\case_id\ varchar(50) NOT NULL,
	\customer_id\ varchar(50),
	\in\ varchar(50) NOT NULL,
	\egistration_number\ varchar(50),
	\current_odometer\ int,
	\reakdown_type\ varchar(50),
	\severity\ varchar(50),
	\priority\ varchar(50) DEFAULT 'NORMAL',
	\complaint\ text,
	\location_address\ text,
	\latitude\ decimal(10,7),
	\longitude\ decimal(10,7),
	\source\ varchar(50),
	\workflow_state\ varchar(50) DEFAULT 'REPORTED',
	\created_at\ timestamp DEFAULT (now()),
	CONSTRAINT \	bl_breakdown_case_case_id\ PRIMARY KEY(\case_id\)
);
--> statement-breakpoint
CREATE TABLE \	bl_breakdown_dispatch\ (
	\dispatch_id\ varchar(50) NOT NULL,
	\case_id\ varchar(50) NOT NULL,
	\workshop_id\ varchar(50),
	\qrt_team_id\ varchar(50),
	\	echnician_id\ varchar(50),
	\mobile_van_id\ varchar(50),
	\dispatch_status\ varchar(50),
	\dispatch_time\ timestamp,
	\estimated_arrival_time\ timestamp,
	\ctual_arrival_time\ timestamp,
	\completion_time\ timestamp,
	CONSTRAINT \	bl_breakdown_dispatch_dispatch_id\ PRIMARY KEY(\dispatch_id\)
);
--> statement-breakpoint
CREATE TABLE \	bl_breakdown_dispatch_history\ (
	\history_id\ varchar(50) NOT NULL,
	\dispatch_id\ varchar(50) NOT NULL,
	\previous_technician_id\ varchar(50),
	\
ew_technician_id\ varchar(50),
	\eason\ text,
	\eassigned_at\ timestamp DEFAULT (now()),
	CONSTRAINT \	bl_breakdown_dispatch_history_history_id\ PRIMARY KEY(\history_id\)
);
--> statement-breakpoint
CREATE TABLE \	bl_breakdown_tracking\ (
	\	racking_id\ varchar(50) NOT NULL,
	\dispatch_id\ varchar(50) NOT NULL,
	\latitude\ decimal(10,7),
	\longitude\ decimal(10,7),
	\speed_kmh\ int,
	\distance_remaining_km\ decimal(10,2),
	\eta_minutes\ int,
	\	imestamp\ timestamp DEFAULT (now()),
	CONSTRAINT \	bl_breakdown_tracking_tracking_id\ PRIMARY KEY(\	racking_id\)
);
--> statement-breakpoint
CREATE TABLE \	bl_breakdown_geo_snapshot\ (
	\snapshot_id\ varchar(50) NOT NULL,
	\case_id\ varchar(50) NOT NULL,
	\event_type\ varchar(50),
	\latitude\ decimal(10,7),
	\longitude\ decimal(10,7),
	\	imestamp\ timestamp DEFAULT (now()),
	CONSTRAINT \	bl_breakdown_geo_snapshot_snapshot_id\ PRIMARY KEY(\snapshot_id\)
);
--> statement-breakpoint
CREATE TABLE \	bl_breakdown_activity\ (
	\ctivity_id\ varchar(50) NOT NULL,
	\case_id\ varchar(50) NOT NULL,
	\ctivity_type\ varchar(50),
	\description\ text,
	\performed_by\ varchar(50),
	\	imestamp\ timestamp DEFAULT (now()),
	CONSTRAINT \	bl_breakdown_activity_activity_id\ PRIMARY KEY(\ctivity_id\)
);
--> statement-breakpoint
CREATE TABLE \	bl_breakdown_diagnosis\ (
	\diagnosis_id\ varchar(50) NOT NULL,
	\case_id\ varchar(50) NOT NULL,
	\system_category\ varchar(50),
	\sub_system\ varchar(50),
	\ault_code\ varchar(50),
	\oot_cause\ text,
	\epair_recommendation\ text,
	\estimated_parts_cost\ decimal(10,2),
	\estimated_labour_cost\ decimal(10,2),
	\estimated_time_minutes\ int,
	\	echnician_notes\ text,
	CONSTRAINT \	bl_breakdown_diagnosis_diagnosis_id\ PRIMARY KEY(\diagnosis_id\)
);
--> statement-breakpoint
CREATE TABLE \	bl_breakdown_tow\ (
	\	ow_id\ varchar(50) NOT NULL,
	\case_id\ varchar(50) NOT NULL,
	\endor_id\ varchar(50),
	\	ow_vehicle_number\ varchar(50),
	\pickup_time\ timestamp,
	\drop_time\ timestamp,
	\destination_workshop_id\ varchar(50),
	\distance_km\ decimal(10,2),
	\	ow_charges\ decimal(10,2),
	\endor_rating\ int,
	\status\ varchar(50),
	CONSTRAINT \	bl_breakdown_tow_tow_id\ PRIMARY KEY(\	ow_id\)
);
--> statement-breakpoint
CREATE TABLE \	bl_breakdown_feedback\ (
	\eedback_id\ varchar(50) NOT NULL,
	\case_id\ varchar(50) NOT NULL,
	\esponse_time_rating\ int,
	\	echnician_rating\ int,
	\esolution_rating\ int,
	\overall_rating\ int,
	\emarks\ text,
	CONSTRAINT \	bl_breakdown_feedback_feedback_id\ PRIMARY KEY(\eedback_id\)
);
--> statement-breakpoint
CREATE TABLE \	bl_breakdown_history\ (
	\history_id\ varchar(50) NOT NULL,
	\case_id\ varchar(50) NOT NULL,
	\ction\ varchar(50),
	\details\ text,
	\	imestamp\ timestamp DEFAULT (now()),
	CONSTRAINT \	bl_breakdown_history_history_id\ PRIMARY KEY(\history_id\)
);

