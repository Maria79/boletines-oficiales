import { pgTable, text, serial, timestamp, boolean, date, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const entriesTable = pgTable("entries", {
  id: serial("id").primaryKey(),
  source: text("source").notNull(), // BOE, BOC, BOP_LPA, BOP_TFE
  title: text("title").notNull(),
  summary: text("summary"),
  category: text("category"),
  publishedAt: date("published_at").notNull(),
  url: text("url").notNull(),
  externalId: text("external_id").notNull(), // identifier from the source bulletin
  isRead: boolean("is_read").notNull().default(false),
  isBookmarked: boolean("is_bookmarked").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertEntrySchema = createInsertSchema(entriesTable).omit({ id: true, createdAt: true });
export type InsertEntry = z.infer<typeof insertEntrySchema>;
export type Entry = typeof entriesTable.$inferSelect;

export const syncLogsTable = pgTable("sync_logs", {
  id: serial("id").primaryKey(),
  startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
  finishedAt: timestamp("finished_at", { withTimezone: true }),
  isRunning: boolean("is_running").notNull().default(true),
  newEntries: text("new_entries").notNull().default("0"),
  result: text("result"),
  errorMessage: text("error_message"),
});

export const insertSyncLogSchema = createInsertSchema(syncLogsTable).omit({ id: true });
export type InsertSyncLog = z.infer<typeof insertSyncLogSchema>;
export type SyncLog = typeof syncLogsTable.$inferSelect;

export const entryNotesTable = pgTable("entry_notes", {
  id: serial("id").primaryKey(),
  entryId: serial("entry_id").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertEntryNoteSchema = createInsertSchema(entryNotesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertEntryNote = z.infer<typeof insertEntryNoteSchema>;
export type EntryNote = typeof entryNotesTable.$inferSelect;

export const alertsTable = pgTable("alerts", {
  id: serial("id").primaryKey(),
  category: text("category").notNull(),
  source: text("source"), // optional: restrict to a specific bulletin source
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertAlertSchema = createInsertSchema(alertsTable).omit({ id: true, createdAt: true });
export type InsertAlert = z.infer<typeof insertAlertSchema>;
export type Alert = typeof alertsTable.$inferSelect;

export const clientsTable = pgTable("clients", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type").$type<"autonomo" | "sl" | "sa" | "asociacion" | "comunidad_propietarios" | "otro">(),
  cnae: text("cnae"),
  municipality: text("municipality"),
  taxRegime: text("tax_regime").$type<"modulos" | "estimacion_directa" | "estimacion_directa_simplificada" | "otro">(),
  keywords: text("keywords").array(),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertClientSchema = createInsertSchema(clientsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertClient = z.infer<typeof insertClientSchema>;
export type Client = typeof clientsTable.$inferSelect;

export const entryClientMatchesTable = pgTable("entry_client_matches", {
  id: serial("id").primaryKey(),
  entryId: integer("entry_id").notNull().references(() => entriesTable.id),
  clientId: integer("client_id").notNull().references(() => clientsTable.id),
  relevanceScore: integer("relevance_score").notNull().default(1),
  reason: text("reason"),
  matchedBy: text("matched_by").$type<"rules" | "ai">().notNull().default("rules"),
  reviewed: boolean("reviewed").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertEntryClientMatchSchema = createInsertSchema(entryClientMatchesTable).omit({ id: true, createdAt: true });
export type InsertEntryClientMatch = z.infer<typeof insertEntryClientMatchSchema>;
export type EntryClientMatch = typeof entryClientMatchesTable.$inferSelect;
