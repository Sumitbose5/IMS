import {
  pgTable,
  uuid,
  varchar,
  timestamp,
  text
} from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),

  name: varchar("name", { length: 150 })
    .notNull(),

  email: varchar("email", { length: 255 })
    .notNull()
    .unique(),

  password: text("password")
    .notNull(),

  role: text("role")
    .default("admin").$type<"admin" | "engineer">(),

  createdAt: timestamp("created_at")
    .defaultNow()
    .notNull()
});