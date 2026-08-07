CREATE TABLE "canonical"."advisor_assessments" (
	"assessment_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"job_id" integer NOT NULL,
	"visual_walkaround" text,
	"under_hood_check" text,
	"initial_tire_tread" text,
	"dashboard_errors" text,
	"fluid_levels" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "canonical"."customer_voices" (
	"voice_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"job_id" integer NOT NULL,
	"voice_text" text NOT NULL,
	"voice_recording_url" text,
	"complaint_family" text NOT NULL,
	"complaint_category" text NOT NULL,
	"language_code" text DEFAULT 'en',
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "canonical"."outcome_learnings" (
	"outcome_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"job_id" integer NOT NULL,
	"root_cause" text NOT NULL,
	"verification_method" text NOT NULL,
	"customer_confirmation" text,
	"knowledge_extracted" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "canonical"."repair_executions" (
	"execution_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"job_id" integer NOT NULL,
	"labor_codes" text,
	"parts_issued" text,
	"measurements_assembly" text,
	"road_test_results" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "canonical"."technical_investigations" (
	"investigation_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"job_id" integer NOT NULL,
	"inspection_notes" text,
	"dtc_snapshot" text,
	"measurements" text,
	"evidence_urls" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "canonical"."workshop_visit_timelines" (
	"timeline_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"job_id" integer NOT NULL,
	"timeline_type" text NOT NULL,
	"event_code" text NOT NULL,
	"payload" text,
	"actor_id" integer,
	"evidence_url" text,
	"timestamp" timestamp DEFAULT now()
);
