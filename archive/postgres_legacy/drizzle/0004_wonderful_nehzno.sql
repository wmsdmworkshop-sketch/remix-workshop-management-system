CREATE TABLE "canonical"."tasks" (
	"task_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"job_id" integer NOT NULL,
	"task_name" text NOT NULL,
	"task_type" text NOT NULL,
	"assigned_to" uuid,
	"status" text DEFAULT 'PENDING',
	"started_at" timestamp,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
