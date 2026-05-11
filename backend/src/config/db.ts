import * as dotenv from 'dotenv';
import { drizzle } from "drizzle-orm/node-postgres"; 
import { Pool } from "pg"; 
import * as schema from "../drizzle/schema";

dotenv.config();

// Use the environment variable for security and flexibility
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Supabase pooler (6543) requires SSL in most cloud environments
  ssl: {
    rejectUnauthorized: false 
  }
});

export const db = drizzle(pool, { schema });