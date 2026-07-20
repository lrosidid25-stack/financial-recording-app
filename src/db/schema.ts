import { pgTable, serial, varchar, text, numeric, timestamp } from "drizzle-orm/pg-core";
export const accounts = pgTable("accounts", {
  id: serial("id").primaryKey(),
  siteName: varchar("site_name", { length: 255 }).notNull(),
  link: text("link").notNull(),
  username: varchar("username", { length: 255 }).notNull(),
  password: varchar("password", { length: 255 }).notNull(),
  totalWin: numeric("total_win", { precision: 15, scale: 2 }).default("0").notNull(),
  totalLoss: numeric("total_loss", { precision: 15, scale: 2 }).default("0").notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
export const histories = pgTable("histories", {
  id: serial("id").primaryKey(),
  accountId: serial("account_id").references(() => accounts.id, { onDelete: "cascade" }).notNull(),
  type: varchar("type", { length: 10 }).notNull(),
  amount: numeric("amount", { precision: 15, scale: 2 }).notNull(),
  description: text("description"),
  date: timestamp("date").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});