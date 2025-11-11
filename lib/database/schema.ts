import {
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
  boolean,
  jsonb,
  numeric,
  unique,
} from "drizzle-orm/pg-core";

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
});

/* ---------------- SESSIONS ---------------- */
export const sessions = pgTable("sessions", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

/* ---------------- HOSPITALS ---------------- */
export const hospitals = pgTable("hospitals", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  location: varchar("location", { length: 255 }),
  specialties: jsonb("specialties"),
  phone: varchar("phone", { length: 20 }),
  city: varchar("city", { length: 100 }),
  state: varchar("state", { length: 100 }),
  email: varchar("email", { length: 255 }),
  notes: varchar("notes", { length: 500 }),
  address: varchar("address", { length: 255 }),
  website: varchar("website", { length: 255 }),
  status: varchar("status", { length: 20 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  createdBy: varchar("created_by", { length: 255 }),
});

/* ---------------- WARDS ---------------- */
export const wards = pgTable("wards", {
  id: uuid("id").defaultRandom().primaryKey(),
  hospitalId: uuid("hospital_id").notNull().references(() => hospitals.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 100 }).notNull(),
  specialty: varchar("specialty", { length: 100 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

/* ---------------- BEDS ---------------- */
export const beds = pgTable("beds", {
  id: uuid("id").defaultRandom().primaryKey(),
  hospitalId: uuid("hospital_id").notNull().references(() => hospitals.id, { onDelete: "cascade" }),
  wardId: uuid("ward_id").references(() => wards.id, { onDelete: "set null" }),
  status: varchar("status", { length: 50 }).notNull().default("available"),
  bedNumber: varchar("bed_number", { length: 50 }).notNull(),
  priority: varchar("priority", { length: 50 }).notNull(),
  position: jsonb("position").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, t => ({
  uniqueBed: unique().on(t.hospitalId, t.bedNumber),
}));

/* ---------------- ADMISSION REQUESTS ---------------- */
export const admissionRequests = pgTable("admission_requests", {
  id: uuid("id").defaultRandom().primaryKey(),
  hospitalId: uuid("hospital_id").notNull().references(() => hospitals.id, { onDelete: "cascade" }),
  urgency: varchar("urgency", { length: 50 }).notNull(),
  specialtyNeeded: varchar("specialty_needed", { length: 100 }).notNull(),
  notes: text("notes"),
  status: varchar("status", { length: 50 }).notNull().default("pending"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

/* ---------------- BED ALLOCATIONS (ACO OUTPUT) ---------------- */
export const bedAllocations = pgTable("bed_allocations", {
  id: uuid("id").defaultRandom().primaryKey(),
  requestId: uuid("request_id").notNull().references(() => admissionRequests.id, { onDelete: "cascade" }),
  bedId: uuid("bed_id").notNull().references(() => beds.id, { onDelete: "cascade" }),
  score: numeric("score"),
  allocatedAt: timestamp("allocated_at").defaultNow().notNull(),
});

/* ---------------- ALLOCATION LOGS ---------------- */
export const allocationLogs = pgTable("allocation_logs", {
  id: uuid("id").defaultRandom().primaryKey(),
  requestId: uuid("request_id").references(() => admissionRequests.id),
  action: varchar("action", { length: 100 }).notNull(),
  details: jsonb("details"),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
});

/* ---------------- TYPES ---------------- */
export type User = typeof users.$inferSelect;
export type Bed = typeof beds.$inferSelect;
export type AdmissionRequest = typeof admissionRequests.$inferSelect;
export type BedAllocation = typeof bedAllocations.$inferSelect;
