CREATE TABLE "canonical"."attendance_logs" (
	"attendance_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"employee_id" integer NOT NULL,
	"gps_coordinates" text,
	"device_info" text NOT NULL,
	"face_match_score" numeric,
	"image_hash" text NOT NULL,
	"status" text NOT NULL,
	"created_at" timestamp DEFAULT now()
);
