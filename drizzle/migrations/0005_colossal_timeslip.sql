CREATE TABLE "admission_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"hospital_id" uuid NOT NULL,
	"urgency" varchar(50) NOT NULL,
	"specialty_needed" varchar(100) NOT NULL,
	"notes" text,
	"status" varchar(50) DEFAULT 'pending' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "allocation_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"request_id" uuid,
	"action" varchar(100) NOT NULL,
	"details" jsonb,
	"timestamp" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bed_allocations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"request_id" uuid NOT NULL,
	"bed_id" uuid NOT NULL,
	"score" numeric,
	"allocated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"token" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "sessions_token_unique" UNIQUE("token")
);
--> statement-breakpoint
ALTER TABLE "beds" DROP CONSTRAINT "beds_ward_id_wards_id_fk";
--> statement-breakpoint
ALTER TABLE "beds" ALTER COLUMN "ward_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "beds" ALTER COLUMN "priority" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "beds" ALTER COLUMN "position" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "beds" ALTER COLUMN "created_at" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "hospitals" ALTER COLUMN "city" SET DATA TYPE varchar(100);--> statement-breakpoint
ALTER TABLE "hospitals" ALTER COLUMN "state" SET DATA TYPE varchar(100);--> statement-breakpoint
ALTER TABLE "hospitals" ALTER COLUMN "address" SET DATA TYPE varchar(255);--> statement-breakpoint
ALTER TABLE "hospitals" ALTER COLUMN "phone" SET DATA TYPE varchar(20);--> statement-breakpoint
ALTER TABLE "hospitals" ALTER COLUMN "notes" SET DATA TYPE varchar(500);--> statement-breakpoint
ALTER TABLE "hospitals" ALTER COLUMN "created_by" SET DATA TYPE varchar(255);--> statement-breakpoint
ALTER TABLE "hospitals" ALTER COLUMN "created_at" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "password" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "first_name" SET DATA TYPE varchar(100);--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "last_name" SET DATA TYPE varchar(100);--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "created_at" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "wards" ALTER COLUMN "name" SET DATA TYPE varchar(100);--> statement-breakpoint
ALTER TABLE "wards" ALTER COLUMN "specialty" SET DATA TYPE varchar(100);--> statement-breakpoint
ALTER TABLE "wards" ALTER COLUMN "created_at" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "beds" ADD COLUMN "updated_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "hospitals" ADD COLUMN "specialties" jsonb;--> statement-breakpoint
ALTER TABLE "hospitals" ADD COLUMN "status" varchar(20);--> statement-breakpoint
ALTER TABLE "hospitals" ADD COLUMN "updated_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "ward_id" uuid;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "is_active" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "updated_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "admission_requests" ADD CONSTRAINT "admission_requests_hospital_id_hospitals_id_fk" FOREIGN KEY ("hospital_id") REFERENCES "public"."hospitals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "allocation_logs" ADD CONSTRAINT "allocation_logs_request_id_admission_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."admission_requests"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bed_allocations" ADD CONSTRAINT "bed_allocations_request_id_admission_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."admission_requests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bed_allocations" ADD CONSTRAINT "bed_allocations_bed_id_beds_id_fk" FOREIGN KEY ("bed_id") REFERENCES "public"."beds"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "beds" ADD CONSTRAINT "beds_ward_id_wards_id_fk" FOREIGN KEY ("ward_id") REFERENCES "public"."wards"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_ward_id_wards_id_fk" FOREIGN KEY ("ward_id") REFERENCES "public"."wards"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hospitals" DROP COLUMN "total_beds";--> statement-breakpoint
ALTER TABLE "hospitals" DROP COLUMN "available_beds";--> statement-breakpoint
ALTER TABLE "hospitals" DROP COLUMN "occupied_beds";--> statement-breakpoint
ALTER TABLE "hospitals" DROP COLUMN "maintenance_beds";--> statement-breakpoint
ALTER TABLE "wards" DROP COLUMN "total_beds";--> statement-breakpoint
ALTER TABLE "wards" DROP COLUMN "available_beds";--> statement-breakpoint
ALTER TABLE "wards" DROP COLUMN "occupied_beds";--> statement-breakpoint
ALTER TABLE "wards" DROP COLUMN "maintenance_beds";--> statement-breakpoint
ALTER TABLE "wards" DROP COLUMN "notes";--> statement-breakpoint
ALTER TABLE "beds" ADD CONSTRAINT "beds_hospital_id_bed_number_unique" UNIQUE("hospital_id","bed_number");