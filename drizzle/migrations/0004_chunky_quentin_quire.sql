ALTER TABLE "admission_requests" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "allocation_logs" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "bed_allocations" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "pheromone_updates" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "pheromones" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "sessions" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "admission_requests" CASCADE;--> statement-breakpoint
DROP TABLE "allocation_logs" CASCADE;--> statement-breakpoint
DROP TABLE "bed_allocations" CASCADE;--> statement-breakpoint
DROP TABLE "pheromone_updates" CASCADE;--> statement-breakpoint
DROP TABLE "pheromones" CASCADE;--> statement-breakpoint
DROP TABLE "sessions" CASCADE;--> statement-breakpoint
ALTER TABLE "beds" DROP CONSTRAINT "beds_hospital_id_bed_number_unique";--> statement-breakpoint
ALTER TABLE "beds" DROP CONSTRAINT "beds_ward_id_wards_id_fk";
--> statement-breakpoint
ALTER TABLE "users" DROP CONSTRAINT "users_ward_id_wards_id_fk";
--> statement-breakpoint
ALTER TABLE "beds" ALTER COLUMN "ward_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "beds" ALTER COLUMN "priority" SET DEFAULT 'normal';--> statement-breakpoint
ALTER TABLE "beds" ALTER COLUMN "position" SET DEFAULT '{"x":0,"y":0}'::jsonb;--> statement-breakpoint
ALTER TABLE "beds" ALTER COLUMN "created_at" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "hospitals" ALTER COLUMN "phone" SET DATA TYPE varchar(50);--> statement-breakpoint
ALTER TABLE "hospitals" ALTER COLUMN "city" SET DATA TYPE varchar(255);--> statement-breakpoint
ALTER TABLE "hospitals" ALTER COLUMN "state" SET DATA TYPE varchar(255);--> statement-breakpoint
ALTER TABLE "hospitals" ALTER COLUMN "notes" SET DATA TYPE varchar(1000);--> statement-breakpoint
ALTER TABLE "hospitals" ALTER COLUMN "address" SET DATA TYPE varchar(500);--> statement-breakpoint
ALTER TABLE "hospitals" ALTER COLUMN "created_at" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "hospitals" ALTER COLUMN "created_by" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "password" SET DATA TYPE varchar(255);--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "first_name" SET DATA TYPE varchar(255);--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "last_name" SET DATA TYPE varchar(255);--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "created_at" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "wards" ALTER COLUMN "name" SET DATA TYPE varchar(255);--> statement-breakpoint
ALTER TABLE "wards" ALTER COLUMN "specialty" SET DATA TYPE varchar(255);--> statement-breakpoint
ALTER TABLE "wards" ALTER COLUMN "created_at" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "hospitals" ADD COLUMN "total_beds" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "hospitals" ADD COLUMN "available_beds" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "hospitals" ADD COLUMN "occupied_beds" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "hospitals" ADD COLUMN "maintenance_beds" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "wards" ADD COLUMN "total_beds" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "wards" ADD COLUMN "available_beds" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "wards" ADD COLUMN "occupied_beds" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "wards" ADD COLUMN "maintenance_beds" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "wards" ADD COLUMN "notes" varchar(1000);--> statement-breakpoint
ALTER TABLE "beds" ADD CONSTRAINT "beds_ward_id_wards_id_fk" FOREIGN KEY ("ward_id") REFERENCES "public"."wards"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "beds" DROP COLUMN "pheromone_level";--> statement-breakpoint
ALTER TABLE "beds" DROP COLUMN "updated_at";--> statement-breakpoint
ALTER TABLE "hospitals" DROP COLUMN "specialties";--> statement-breakpoint
ALTER TABLE "hospitals" DROP COLUMN "status";--> statement-breakpoint
ALTER TABLE "hospitals" DROP COLUMN "updated_at";--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "ward_id";--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "is_active";--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "updated_at";