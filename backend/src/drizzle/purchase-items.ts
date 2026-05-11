import {
  pgTable,
  uuid,
  integer,
  numeric,
  timestamp
} from "drizzle-orm/pg-core";

import { purchases } from "./purchases";
import { products } from "./products";

export const purchaseItems = pgTable("purchase_items", {
  id: uuid("id").primaryKey().defaultRandom(),

  purchaseId: uuid("purchase_id")
    .references(() => purchases.id)
    .notNull(),

  productId: uuid("product_id")
    .references(() => products.id)
    .notNull(),

  quantity: integer("quantity")
    .notNull(),

  costPrice: numeric("cost_price", {
    precision: 10,
    scale: 2
  }).notNull(),

  totalPrice: numeric("total_price", {
    precision: 12,
    scale: 2
  }).notNull(),

  createdAt: timestamp("created_at")
    .defaultNow()
});