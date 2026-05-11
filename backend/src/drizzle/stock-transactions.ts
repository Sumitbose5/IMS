import {
  pgTable,
  uuid,
  integer,
  timestamp,
  text
} from "drizzle-orm/pg-core";

import { products } from "./products";

export const stockTransactions = pgTable(
  "stock_transactions",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    productId: uuid("product_id")
      .references(() => products.id)
      .notNull(),

    type: text("type")
      .$type<"purchase" | "sale" | "adjustment">()
      .notNull(),

    quantity: integer("quantity")
      .notNull(),

    referenceId: uuid("reference_id"),

    createdAt: timestamp("created_at")
      .defaultNow()
      .notNull()
  }
);