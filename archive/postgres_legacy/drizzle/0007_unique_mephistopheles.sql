CREATE TABLE "canonical"."knowledge_objects" (
	"knowledge_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"document_number" text NOT NULL,
	"knowledge_type" text NOT NULL,
	"oem" text DEFAULT 'Tata Motors',
	"category" text,
	"description" text,
	"version" integer DEFAULT 1,
	"status" text DEFAULT 'APPROVED',
	"checklist_json" text,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "knowledge_objects_document_number_unique" UNIQUE("document_number")
);
--> statement-breakpoint
CREATE TABLE "canonical"."knowledge_relationships" (
	"relationship_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source_id" uuid NOT NULL,
	"target_id" uuid NOT NULL,
	"relationship_type" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "canonical"."workshop_learning_notes" (
	"note_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"job_id" integer NOT NULL,
	"complaint" text NOT NULL,
	"diagnosis" text NOT NULL,
	"root_cause" text NOT NULL,
	"repair" text NOT NULL,
	"lesson_learned" text,
	"is_approved" boolean DEFAULT false,
	"approved_by" integer,
	"approved_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
