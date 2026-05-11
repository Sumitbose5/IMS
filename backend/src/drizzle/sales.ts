import {
  pgTable,
  uuid,
  numeric,
  timestamp,
  varchar
} from "drizzle-orm/pg-core";

import { users } from "./users";

export const sales = pgTable("sales", {
  id: uuid("id").primaryKey().defaultRandom(),

  customerName: varchar("customer_name", {
    length: 100
  }).notNull(),

  customerPhone: varchar("customer_phone", {
    length: 15
  }),

  totalAmount: numeric("total_amount", {
    precision: 12,
    scale: 2
  }).notNull(),

  cgst: numeric("cgst", {
    precision: 12,
    scale: 2
  }).notNull(),

  sgst: numeric("sgst", {
    precision: 12,
    scale: 2
  }).notNull(),

  extraCharges: numeric("extra_charges", {
    precision: 12,
    scale: 2
  }).notNull(),

  discount: numeric("discount", {
    precision: 12,
    scale: 2
  }).notNull(),

  paid_amount: numeric("paid_amount", {
    precision: 12,
    scale: 2
  }).notNull(),

  due_amount: numeric("due_amount", {
    precision: 12,
    scale: 2
  }).notNull(),

  paymentMethod: varchar("payment_method", {
    length: 50
  }).$type<"cash" | "credit_card" | "debit_card" | "upi">(),

  paymentStatus: varchar("payment_status", {
    length: 50
  }).$type<"pending" | "completed" | "failed">(),

  createdBy: uuid("created_by")
    .references(() => users.id)
    .notNull(),

  sale_date: timestamp("sale_date")
    .notNull(),

  createdAt: timestamp("created_at")
    .defaultNow()
    .notNull()
});