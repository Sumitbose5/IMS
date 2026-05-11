import {
  pgTable,
  uuid,
  varchar,
  text,
  numeric,
  timestamp,
  boolean
} from "drizzle-orm/pg-core";

import { categories } from "./categories";

export const products = pgTable("products", {
  id: uuid("id").primaryKey().defaultRandom(),
 
  name: varchar("name", { length: 200 }).notNull(),

  description: text("description"),

  categoryId: uuid("category_id")
    .references(() => categories.id)
    .notNull(),

  sku: varchar("sku", { length: 100 })
    .unique(),

  barcode: varchar("barcode", { length: 100 })
    .unique(),

  costPrice: numeric("cost_price", {
    precision: 10,
    scale: 2
  }).notNull(),

  image: text("image"),

  isArchived: boolean("is_archived")
    .default(false),

  createdAt: timestamp("created_at")
    .defaultNow()
    .notNull(),

  updatedAt: timestamp("updated_at")
    .defaultNow()
    .notNull()
});