import {
  boolean,
  date,
  integer,
  jsonb,
  pgTable,
  real,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const servicesTable = pgTable("event_services", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  category: text("category").notNull(),
  pricingType: text("pricing_type").notNull(),
  priceOre: integer("price_ore").notNull(),
  costOre: integer("cost_ore").notNull(),
  minPriceOre: integer("min_price_ore").notNull(),
  description: text("description").notNull(),
  included: text("included").array().notNull().default([]),
  active: boolean("active").notNull().default(true),
});

export const suppliersTable = pgTable("event_suppliers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  serviceCount: integer("service_count").notNull().default(0),
  preferred: boolean("preferred").notNull().default(false),
  active: boolean("active").notNull().default(true),
  nextReview: date("next_review", { mode: "string" }),
});

export const quotesTable = pgTable("event_quotes", {
  id: serial("id").primaryKey(),
  quoteNumber: text("quote_number").notNull().unique(),
  company: text("company").notNull(),
  contactName: text("contact_name"),
  eventDate: date("event_date", { mode: "string" }).notNull(),
  startTime: text("start_time").notNull(),
  endTime: text("end_time").notNull(),
  guests: integer("guests").notNull(),
  eventType: text("event_type").notNull(),
  totalOre: integer("total_ore").notNull(),
  pricePerPersonOre: integer("price_per_person_ore").notNull(),
  costOre: integer("cost_ore").notNull(),
  marginPercent: real("margin_percent").notNull(),
  marketStatus: text("market_status").notNull(),
  status: text("status").notNull().default("draft"),
  expiryDate: date("expiry_date", { mode: "string" }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const quoteItemsTable = pgTable("event_quote_items", {
  id: serial("id").primaryKey(),
  quoteId: integer("quote_id").notNull(),
  serviceId: integer("service_id"),
  name: text("name").notNull(),
  category: text("category").notNull(),
  quantity: real("quantity").notNull(),
  unit: text("unit").notNull().default("stk"),
  unitPriceOre: integer("unit_price_ore").notNull(),
  totalOre: integer("total_ore").notNull(),
  included: boolean("included").notNull().default(false),
});

export const insertServiceSchema = createInsertSchema(servicesTable).omit({ id: true });
export const insertSupplierSchema = createInsertSchema(suppliersTable).omit({ id: true });
export const insertQuoteSchema = createInsertSchema(quotesTable).omit({ id: true, createdAt: true });
export const insertQuoteItemSchema = createInsertSchema(quoteItemsTable).omit({ id: true });

export type Service = typeof servicesTable.$inferSelect;
export type Supplier = typeof suppliersTable.$inferSelect;
export type Quote = typeof quotesTable.$inferSelect;
export type QuoteItem = typeof quoteItemsTable.$inferSelect;
export type InsertService = z.infer<typeof insertServiceSchema>;
export type InsertSupplier = z.infer<typeof insertSupplierSchema>;
export type InsertQuote = z.infer<typeof insertQuoteSchema>;
export type InsertQuoteItem = z.infer<typeof insertQuoteItemSchema>;