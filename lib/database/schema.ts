import {  pgTable,  pgEnum,  text,  timestamp,  uuid,  varchar,  boolean,
  jsonb,  numeric,  integer,  unique } from "drizzle-orm/pg-core"

export const bedStatusEnum = pgEnum("bed_status", [
  "available",
  "occupied",
  "maintenance",
  "reserved"
])

/* ---------------- HOSPITALS ---------------- */
export const hospitals = pgTable("hospitals", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  location: varchar("location", { length: 255 }),
  address: varchar("address", { length: 255 }),
  city: varchar("city", { length: 100 }),
  state: varchar("state", { length: 100 }),
  phone: varchar("phone", { length: 20 }),
  email: varchar("email", { length: 255 }),
  website: varchar("website", { length: 255 }),
  specialties: jsonb("specialties"),     
  geoCoordinates: jsonb("geo_coordinates"), 
  capacity: integer("capacity"),   
  status: varchar("status", { length: 50 }),
  notes: varchar("notes", { length: 500 }),
  createdBy: varchar("created_by", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
})

/* ---------------- WARDS ---------------- */
export const wards = pgTable("wards", {
  id: uuid("id").defaultRandom().primaryKey(),
  hospitalId: uuid("hospital_id").notNull().references(() => hospitals.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 100 }).notNull(), 
  specialty: varchar("specialty", { length: 100 }),
  capacity: integer("capacity"),         
  acuityLevel: varchar("acuity_level", { length: 50 }), 
  constraints: jsonb("constraints"),               
  createdAt: timestamp("created_at").defaultNow().notNull(),
})

/* ---------------- BEDS ---------------- */
export const beds = pgTable("beds", {
  id: uuid("id").defaultRandom().primaryKey(),
  hospitalId: uuid("hospital_id")
    .notNull()
    .references(() => hospitals.id, { onDelete: "cascade" }),
  wardId: uuid("ward_id")
    .references(() => wards.id, { onDelete: "set null" }),
  bedNumber: varchar("bed_number", { length: 50 }).notNull(),
  status: bedStatusEnum("status")
    .notNull()
    .default("available"),
  priority: varchar("priority", { length: 50 }).notNull(),
  position: jsonb("position").notNull(), 
  features: jsonb("features"),
  constraints: jsonb("constraints"),
  costFactor: numeric("cost_factor"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
})

/* ---------------- USERS ---------------- */
export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  password: text("password").notNull(),
  firstName: varchar("first_name", { length: 100 }).notNull(),
  lastName: varchar("last_name", { length: 100 }).notNull(),
  role: varchar("role", { length: 50 }).notNull().default("staff"),
  hospitalId: uuid("hospital_id").references(() => hospitals.id, { onDelete: "set null" }),
  wardId: uuid("ward_id").references(() => wards.id, { onDelete: "set null" }),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
})

/* ---------------- PATIENTS (For ACO Inputs) ---------------- */
export const patients = pgTable("patients", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  requiredSpecialty: varchar("required_specialty", { length: 100 }).notNull(),
  acuityLevel: varchar("acuity_level", { length: 50 }), 
  weight: numeric("weight"),
  needs: jsonb("needs"),                      
  constraints: jsonb("constraints"),                        
  hospitalId: uuid("hospital_id").references(() => hospitals.id),
  wardId: uuid("ward_id").references(() => wards.id),
  bedId: uuid("bed_id").references(() => beds.id),

  createdAt: timestamp("created_at").defaultNow().notNull()
})
/* ---------------- SESSIONS ---------------- */
export const sessions = pgTable("sessions", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
/* ---------------- TRANSFER REQUESTS ---------------- */
export const transferRequests = pgTable("transfer_requests", {
  id: uuid("id").defaultRandom().primaryKey(),
  fromHospitalId: uuid("from_hospital_id").notNull().references(() => hospitals.id),
  toHospitalId: uuid("to_hospital_id").references(() => hospitals.id),
  fromWardId: uuid("from_ward_id").references(() => wards.id),
  toWardId: uuid("to_ward_id").references(() => wards.id),
  count: integer("count").notNull(),
  reason: text("reason"),
  status: varchar("status", { length: 50 }).default("pending"),
  createdAt: timestamp("created_at").defaultNow().notNull()
})

/* ---------------- ADMISSION REQUESTS (ACO INPUT) ---------------- */
export const admissionRequests = pgTable("admission_requests", {
  id: uuid("id").defaultRandom().primaryKey(),
  hospitalId: uuid("hospital_id").notNull().references(() => hospitals.id),
  urgency: varchar("urgency", { length: 50 }).notNull(),
  specialtyNeeded: varchar("specialty_needed", { length: 100 }).notNull(),
  notes: text("notes"),
  status: varchar("status", { length: 50 }).notNull().default("pending"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
})

/* ---------------- BED ALLOCATIONS (ACO OUTPUT) ---------------- */
export const bedAllocations = pgTable("bed_allocations", {
  id: uuid("id").defaultRandom().primaryKey(),
  requestId: uuid("request_id").notNull().references(() => admissionRequests.id),
  bedId: uuid("bed_id").notNull().references(() => beds.id),
  patientId: uuid("patient_id").references(() => patients.id),
  score: numeric("score"),                             
  allocatedAt: timestamp("allocated_at").defaultNow().notNull(),
})

/* ---------------- ALLOCATION LOGS ---------------- */
export const allocationLogs = pgTable("allocation_logs", {
  id: uuid("id").defaultRandom().primaryKey(),
  requestId: uuid("request_id").references(() => admissionRequests.id),
  action: varchar("action", { length: 100 }).notNull(),
  details: jsonb("details"),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
})

/* ---------------- ACO RUNS ---------------- */
export const acoRuns = pgTable("aco_runs", {
  id: uuid("id").defaultRandom().primaryKey(),
  hospitalId: uuid("hospital_id")
    .notNull()
    .references(() => hospitals.id, { onDelete: "cascade" }),
  initiatorUserId: uuid("initiator_user_id")
    .references(() => users.id, { onDelete: "set null" }),
  startedAt: timestamp("started_at").defaultNow().notNull(),
  finishedAt: timestamp("finished_at"),
  durationMs: integer("duration_ms"),               
  iterations: integer("iterations"),            
  bestScore: numeric("best_score"),        
  reservedSlot: integer("reserved_slot"), 
  details: jsonb("details"),                         

  status: varchar("status", { length: 50 })
    .notNull()
    .default("completed"),                         

  createdAt: timestamp("created_at").defaultNow().notNull()
})

/* ---------------- ACO RUN EVENTS (Optional Detailed Log) ---------------- */
export const acoRunEvents = pgTable("aco_run_events", {
  id: uuid("id").defaultRandom().primaryKey(),

  runId: uuid("run_id")
    .notNull()
    .references(() => acoRuns.id, { onDelete: "cascade" }),

  eventType: varchar("event_type", { length: 100 }).notNull(),
  metadata: jsonb("metadata"),          
  timestamp: timestamp("timestamp").defaultNow().notNull()
})

/* ---------------- TYPES ---------------- */
export type User = typeof users.$inferSelect
export type Bed = typeof beds.$inferSelect
export type Patient = typeof patients.$inferSelect
export type AdmissionRequest = typeof admissionRequests.$inferSelect
export type BedAllocation = typeof bedAllocations.$inferSelect
export type AcoRun = typeof acoRuns.$inferSelect
export type AcoRunEvent = typeof acoRunEvents.$inferSelect