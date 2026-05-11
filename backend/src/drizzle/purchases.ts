import {
  pgTable,
  uuid,
  numeric,
  timestamp,
  text,
  varchar
} from "drizzle-orm/pg-core";

import { suppliers } from "./suppliers";
import { users } from "./users";

export const purchases = pgTable("purchases", {
  id: uuid("id").primaryKey().defaultRandom(),

  supplierId: uuid("supplier_id")
    .references(() => suppliers.id)
    .notNull(),
  
  createdBy: uuid("created_by")
    .references(() => users.id)
    .notNull(),

  purchaseDate: timestamp("purchase_date")
    .notNull(),

  invoiceReceipt: text("invoice_receipt"),


  // Financials 

  paymentStatus: varchar("payment_status", { length: 20 }).$type<"pending" | "completed" | "failed">()
    .notNull(),

  paymentMethod: varchar("payment_method", { length: 20 }).$type<"credit_card" | "upi" | "bank_transfer" | "cash">(),

  subtotal: numeric("subtotal", {
    precision: 12,
    scale: 2
  }).notNull(),

  discount: numeric("discount", {
    precision: 12,
    scale: 2
  }),

  cgst: numeric("cgst", {
    precision: 12,
    scale: 2
  }),

  sgst: numeric("sgst", {
    precision: 12,
    scale: 2
  }),

  igst: numeric("igst", {
    precision: 12,
    scale: 2
  }),

  shippingCharges: numeric("shipping_charges", {
    precision: 12,
    scale: 2
  }),

  otherCharges: numeric("other_charges", {
    precision: 12,
    scale: 2
  }),

  paid_amount: numeric("paid_amount", {
    precision: 12,
    scale: 2
  }),

  due_amount: numeric("due_amount", {
    precision: 12,
    scale: 2
  }),

  totalAmount: numeric("total_amount", {
    precision: 12,
    scale: 2
  }).notNull(),

  createdAt: timestamp("created_at")
    .defaultNow()
    .notNull()
});