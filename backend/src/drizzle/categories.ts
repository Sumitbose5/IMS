import {
  pgTable,
  uuid,
  varchar
} from "drizzle-orm/pg-core";

export const categories = pgTable("categories", {
  id: uuid("id").primaryKey().defaultRandom(),

  name: varchar("name", { length: 100 })
    .notNull()
    .unique()
});