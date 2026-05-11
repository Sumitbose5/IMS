import {
    pgTable,
    uuid,
    integer,
    numeric,
    varchar
} from "drizzle-orm/pg-core";

import { sales } from "./sales";
import { products } from "./products";

export const saleItems = pgTable("sale_items", {
    id: uuid("id").primaryKey().defaultRandom(),

    saleId: uuid("sale_id")
        .references(() => sales.id)
        .notNull(),

    productId: uuid("product_id")
        .references(() => products.id)
        .notNull(),

    quantity: integer("quantity")
        .notNull(),

    sellingPrice: numeric("selling_price", {
        precision: 10,
        scale: 2
    }).notNull()
});