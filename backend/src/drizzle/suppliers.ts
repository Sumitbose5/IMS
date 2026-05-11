import {
  pgTable,
  uuid,
  varchar,
  text
} from "drizzle-orm/pg-core";

export const suppliers = pgTable("suppliers", {
  id: uuid("id").primaryKey().defaultRandom(),

  name: varchar("name", { length: 150 }).notNull(),

  phone: varchar("phone", { length: 30 }),

  address: text("address")
});