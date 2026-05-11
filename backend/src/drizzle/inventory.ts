import {
  pgTable,
  uuid,
  integer,
  timestamp
} from "drizzle-orm/pg-core";

import { products } from "./products";

export const inventory = pgTable("inventory", {
  id: uuid("id").primaryKey().defaultRandom(),

  productId: uuid("product_id")
    .references(() => products.id)
    .notNull()
    .unique(),

  quantity: integer("quantity")
    .default(0)
    .notNull(),

  lowStockThreshold: integer("low_stock_threshold")
    .default(5)
    .notNull(),

  updatedAt: timestamp("updated_at")
    .defaultNow()
    .notNull()
});