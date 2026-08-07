CREATE TABLE "canonical"."business_rules" (
	"rule_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"rule_name" text NOT NULL,
	"rule_group" text NOT NULL,
	"condition_json" text NOT NULL,
	"action_json" text NOT NULL,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "business_rules_rule_name_unique" UNIQUE("rule_name")
);
