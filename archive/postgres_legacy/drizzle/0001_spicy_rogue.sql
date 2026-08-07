CREATE TABLE "canonical"."customer_passports" (
	"customer_passport_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lifecycle_state" text DEFAULT 'Active' NOT NULL,
	"customer_name" text NOT NULL,
	"customer_type" text DEFAULT 'Individual' NOT NULL,
	"contact_phone" text NOT NULL,
	"contact_email" text,
	"pan_number" text,
	"gstin" text,
	"billing_address" text,
	"credit_limit" numeric DEFAULT '0.00',
	"outstanding_amount" numeric DEFAULT '0.00',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "canonical"."driver_passports" (
	"driver_passport_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lifecycle_state" text DEFAULT 'Active' NOT NULL,
	"driver_name" text NOT NULL,
	"license_number" text NOT NULL,
	"license_expiry" timestamp,
	"mobile_no" text NOT NULL,
	"emergency_contact" text,
	"medical_fitness_status" text,
	"safety_violations_count" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "canonical"."employee_passports" (
	"employee_passport_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lifecycle_state" text DEFAULT 'Candidate' NOT NULL,
	"human_name" text NOT NULL,
	"human_personal_details" text,
	"human_medical_fitness" text,
	"human_government_ids" text,
	"operational_role" text NOT NULL,
	"operational_workshop_id" integer,
	"operational_competency_matrix" text,
	"operational_reputation_score" numeric DEFAULT '100.00',
	"digital_credentials" text,
	"digital_auth_tokens" text,
	"digital_signature_cert" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "canonical"."fleet_passports" (
	"fleet_passport_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lifecycle_state" text DEFAULT 'Active' NOT NULL,
	"fleet_name" text NOT NULL,
	"fleet_owner_passport_id" uuid,
	"operational_region" text,
	"total_vehicles" integer DEFAULT 0,
	"amc_contract_reference" text,
	"sla_priority_level" text DEFAULT 'MEDIUM',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "canonical"."vehicle_passports" (
	"vehicle_passport_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lifecycle_state" text DEFAULT 'FactoryGateOut' NOT NULL,
	"chassis_number" text NOT NULL,
	"original_engine_number" text,
	"current_engine_number" text,
	"transmission_type" text,
	"gearbox_serial_number" text,
	"rear_axle_ratio" text,
	"wheelbase_mm" integer,
	"emission_standard" text,
	"manufacturing_date" timestamp,
	"current_customer_passport_id" uuid,
	"current_fleet_passport_id" uuid,
	"current_driver_passport_id" uuid,
	"cumulative_maintenance_cost" numeric DEFAULT '0.00',
	"cumulative_breakdown_cost" numeric DEFAULT '0.00',
	"cost_per_kilometer" numeric DEFAULT '0.00',
	"reputation_score" numeric DEFAULT '100.00',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "vehicle_passports_chassis_number_unique" UNIQUE("chassis_number")
);
