CREATE TABLE "canonical"."capa_tasks" (
	"capa_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"related_incident_id" uuid,
	"title" text NOT NULL,
	"description" text,
	"assigned_to" uuid,
	"status" text DEFAULT 'PENDING',
	"resolution_notes" text,
	"resolved_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "canonical"."pit_safety_logs" (
	"pit_log_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"job_id" integer NOT NULL,
	"pit_number" text NOT NULL,
	"gas_level_ppm" integer,
	"wheel_chocks_applied" boolean DEFAULT false,
	"chocks_photo_url" text,
	"gas_check_passed" boolean DEFAULT true,
	"safety_officer_id" uuid,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "canonical"."safety_incidents" (
	"incident_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"employee_passport_id" uuid,
	"incident_type" text NOT NULL,
	"severity" text DEFAULT 'MEDIUM' NOT NULL,
	"description" text NOT NULL,
	"reported_by" integer NOT NULL,
	"evidence_url" text,
	"is_oil_spill" boolean DEFAULT false,
	"cleanup_duration_mins" integer,
	"action_taken" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "canonical"."tool_custody_logs" (
	"log_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"employee_passport_id" uuid NOT NULL,
	"tool_name" text NOT NULL,
	"serial_number" text NOT NULL,
	"checked_out_at" timestamp DEFAULT now(),
	"expected_return_at" timestamp,
	"checked_in_at" timestamp,
	"status" text DEFAULT 'ACTIVE',
	"damage_notes" text
);
--> statement-breakpoint
CREATE TABLE "canonical"."toolbox_inspections" (
	"inspection_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"employee_passport_id" uuid NOT NULL,
	"inspected_by" integer NOT NULL,
	"inspection_date" timestamp DEFAULT now(),
	"tool_score" integer DEFAULT 100,
	"missing_tools_json" text,
	"damaged_tools_json" text,
	"created_at" timestamp DEFAULT now()
);
