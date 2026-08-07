CREATE TABLE "canonical"."parts" (
	"part_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"part_number" text NOT NULL,
	"part_name" text NOT NULL,
	"unit_price" numeric NOT NULL,
	"stock_qty" integer DEFAULT 0 NOT NULL,
	"reorder_level" integer DEFAULT 5,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "parts_part_number_unique" UNIQUE("part_number")
);
--> statement-breakpoint
CREATE TABLE "canonical"."purchase_orders" (
	"po_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"po_number" text NOT NULL,
	"part_id" uuid,
	"quantity" integer NOT NULL,
	"status" text DEFAULT 'PENDING',
	"vendor_name" text,
	"ordered_at" timestamp DEFAULT now(),
	"received_at" timestamp,
	CONSTRAINT "purchase_orders_po_number_unique" UNIQUE("po_number")
);
--> statement-breakpoint
CREATE TABLE "canonical"."stock_movements" (
	"movement_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"part_id" uuid,
	"job_id" integer,
	"movement_type" text NOT NULL,
	"quantity" integer NOT NULL,
	"recorded_by" integer,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "canonical"."warranty_claims" (
	"claim_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"job_id" integer NOT NULL,
	"claim_type" text NOT NULL,
	"part_number" text NOT NULL,
	"claim_amount" numeric NOT NULL,
	"status" text DEFAULT 'PENDING',
	"rejection_reason" text,
	"oem_reference_no" text,
	"created_at" timestamp DEFAULT now()
);
