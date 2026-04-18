import * as dotenv from 'dotenv';
dotenv.config();

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
const app = express();
const PORT: number = 3000;

// Initialize the database connection
import { db } from './config/db';
import { sql } from 'drizzle-orm';

// CORS configuration
app.use(cors({
  origin: [
    'http://localhost:5173',
    'http://127.0.0.1:5173'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());


app.use((req: Request, res: Response, next: NextFunction) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  console.log('Content-Type:', req.headers['content-type']);
  console.log('Body:', req.body);
  next();
});

app.get('/', (req: Request, res: Response) => {
  res.json({ 
    message: 'Metric API Server is running!',
    version: '1.0.0',
    endpoints: {
      code: '/api/code',
      interview: '/api/interview',
      problem: '/api/problem',
      users: '/api/users',
    }
  });
});

// 404 handler for debugging unmatched routes
app.use((req: Request, res: Response) => {
  console.warn(`No matching route for ${req.method} ${req.originalUrl}`);
  res.status(404).json({ error: 'Not Found', path: req.originalUrl });
});

const startServer = async () => {
  try {
    // Verify database connection
    await db.execute(sql`SELECT 1`);
    console.log('✅ Database connected successfully');

    app.listen(PORT, () => {
      console.log(`✅ Server running at http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('❌ Failed to start the server:', error);
    process.exit(1);
  }
};

startServer();