import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as dotenv from 'dotenv';

dotenv.config();

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL is missing in the .env file');
}

// Disable prefetch as it is not supported for "Transaction" pool mode in Supabase
const queryClient = postgres(connectionString, { prepare: false });

export const db = drizzle(queryClient);
