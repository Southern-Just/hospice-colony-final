CREATE TYPE "public"."bed_status" AS ENUM('available', 'occupied', 'maintenance', 'reserved');--> statement-breakpoint
CREATE TABLE "patients" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"required_specialty" varchar(100) NOT NULL,
	"acuity_level" varchar(50),
	"weight" numeric,
	"needs" jsonb,
	"constraints" jsonb,
	"hospital_id" uuid,
	"ward_id" uuid,
	"bed_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "transfer_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"from_hospital_id" uuid NOT NULL,
	"to_hospital_id" uuid,
	"from_ward_id" uuid,
	"to_ward_id" uuid,
	"count" integer NOT NULL,
	"reason" text,
	"status" varchar(50) DEFAULT 'pending',
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "sessions" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "sessions" CASCADE;--> statement-breakpoint
ALTER TABLE "beds" DROP CONSTRAINT "beds_hospital_id_bed_number_unique";--> statement-breakpoint
ALTER TABLE "admission_requests" DROP CONSTRAINT "admission_requests_hospital_id_hospitals_id_fk";
--> statement-breakpoint
ALTER TABLE "bed_allocations" DROP CONSTRAINT "bed_allocations_request_id_admission_requests_id_fk";
--> statement-breakpoint
ALTER TABLE "bed_allocations" DROP CONSTRAINT "bed_allocations_bed_id_beds_id_fk";
--> statement-breakpoint
ALTER TABLE "beds" ALTER COLUMN "status" SET DEFAULT 'available'::"public"."bed_status";--> statement-breakpoint
ALTER TABLE "beds" ALTER COLUMN "status" SET DATA TYPE "public"."bed_status" USING "status"::"public"."bed_status";--> statement-breakpoint
ALTER TABLE "hospitals" ALTER COLUMN "status" SET DATA TYPE varchar(50);--> statement-breakpoint
ALTER TABLE "bed_allocations" ADD COLUMN "patient_id" uuid;--> statement-breakpoint
ALTER TABLE "beds" ADD COLUMN "features" jsonb;--> statement-breakpoint
ALTER TABLE "beds" ADD COLUMN "constraints" jsonb;--> statement-breakpoint
ALTER TABLE "beds" ADD COLUMN "cost_factor" numeric;--> statement-breakpoint
ALTER TABLE "hospitals" ADD COLUMN "geo_coordinates" jsonb;--> statement-breakpoint
ALTER TABLE "hospitals" ADD COLUMN "capacity" integer;--> statement-breakpoint
ALTER TABLE "wards" ADD COLUMN "capacity" integer;--> statement-breakpoint
ALTER TABLE "wards" ADD COLUMN "acuity_level" varchar(50);--> statement-breakpoint
ALTER TABLE "wards" ADD COLUMN "constraints" jsonb;--> statement-breakpoint
ALTER TABLE "patients" ADD CONSTRAINT "patients_hospital_id_hospitals_id_fk" FOREIGN KEY ("hospital_id") REFERENCES "public"."hospitals"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patients" ADD CONSTRAINT "patients_ward_id_wards_id_fk" FOREIGN KEY ("ward_id") REFERENCES "public"."wards"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patients" ADD CONSTRAINT "patients_bed_id_beds_id_fk" FOREIGN KEY ("bed_id") REFERENCES "public"."beds"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transfer_requests" ADD CONSTRAINT "transfer_requests_from_hospital_id_hospitals_id_fk" FOREIGN KEY ("from_hospital_id") REFERENCES "public"."hospitals"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transfer_requests" ADD CONSTRAINT "transfer_requests_to_hospital_id_hospitals_id_fk" FOREIGN KEY ("to_hospital_id") REFERENCES "public"."hospitals"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transfer_requests" ADD CONSTRAINT "transfer_requests_from_ward_id_wards_id_fk" FOREIGN KEY ("from_ward_id") REFERENCES "public"."wards"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transfer_requests" ADD CONSTRAINT "transfer_requests_to_ward_id_wards_id_fk" FOREIGN KEY ("to_ward_id") REFERENCES "public"."wards"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "admission_requests" ADD CONSTRAINT "admission_requests_hospital_id_hospitals_id_fk" FOREIGN KEY ("hospital_id") REFERENCES "public"."hospitals"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bed_allocations" ADD CONSTRAINT "bed_allocations_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bed_allocations" ADD CONSTRAINT "bed_allocations_request_id_admission_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."admission_requests"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bed_allocations" ADD CONSTRAINT "bed_allocations_bed_id_beds_id_fk" FOREIGN KEY ("bed_id") REFERENCES "public"."beds"("id") ON DELETE no action ON UPDATE no action;