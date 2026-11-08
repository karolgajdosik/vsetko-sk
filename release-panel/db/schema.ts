import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const repository = sqliteTable("repository", {
  key: text("key").primaryKey(),
  fetched: text("fetched").notNull(),
  data: text("data").notNull(),
});
export const reports = sqliteTable("reports", {
  id: text("id").primaryKey(),
  checked: text("checked").notNull(),
  data: text("data").notNull(),
});
export const decisions = sqliteTable("decisions", {
  task: text("task").primaryKey(),
  state: text("state").notNull(),
  note: text("note").notNull(),
  changed: text("changed").notNull(),
});
