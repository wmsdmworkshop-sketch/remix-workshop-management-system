CREATE TABLE "canonical"."knowledge_extraction_audits" (
	"extraction_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"document_number" text NOT NULL,
	"document_version" integer DEFAULT 1,
	"checksum" text NOT NULL,
	"objects_created_count" integer DEFAULT 0,
	"parser_version" text NOT NULL,
	"extracted_by" integer NOT NULL,
	"deleted_successfully" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now()
);
