CREATE TABLE "canonical"."campaigns_recalls" (
	"campaign_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"campaign_number" text NOT NULL,
	"campaign_type" text NOT NULL,
	"priority" text DEFAULT 'HIGH',
	"mandatory" boolean DEFAULT true,
	"vin_criteria" text,
	"checklist_json" text,
	"status" text DEFAULT 'ACTIVE',
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "campaigns_recalls_campaign_number_unique" UNIQUE("campaign_number")
);
--> statement-breakpoint
CREATE TABLE "canonical"."customer_declined_consents" (
	"consent_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"job_id" integer NOT NULL,
	"decline_reason" text NOT NULL,
	"digital_consent_signature" text,
	"advisor_id" integer NOT NULL,
	"timestamp" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "canonical"."service_circulars" (
	"circular_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"circular_number" text NOT NULL,
	"title" text NOT NULL,
	"affected_vin_range" text,
	"required_parts_json" text,
	"labor_codes_json" text,
	"warranty_applicable" boolean DEFAULT false,
	"status" text DEFAULT 'ACTIVE',
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "service_circulars_circular_number_unique" UNIQUE("circular_number")
);
--> statement-breakpoint
CREATE TABLE "canonical"."service_policies" (
	"policy_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"policy_name" text NOT NULL,
	"oem" text DEFAULT 'Tata Motors' NOT NULL,
	"product_line" text NOT NULL,
	"mileage_interval" integer NOT NULL,
	"mileage_tolerance" integer DEFAULT 3000,
	"time_interval_days" integer NOT NULL,
	"time_tolerance_days" integer DEFAULT 60,
	"priority" text DEFAULT 'NORMAL',
	"version" integer DEFAULT 1,
	"superseded_by" uuid,
	"status" text DEFAULT 'ACTIVE',
	"created_at" timestamp DEFAULT now()
);
