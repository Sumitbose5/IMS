import * as dotenv from 'dotenv';
dotenv.config();

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';

const app = express();

// Initialize the database connection
import { db } from './config/db';
import { sql } from 'drizzle-orm';

import authRoutes from './routes/authRoutes';
import productRoutes from './routes/productRoutes';
import utilsRoutes from './routes/utilsRoutes';
import salesRoutes from './routes/salesRoutes';

// CORS configuration
app.use(cors({
  origin: [
    'https://ims-frontend-omega.vercel.app',
    'http://localhost:5173',
    'http://127.0.0.1:5173'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// Logger middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  console.log('Content-Type:', req.headers['content-type']);
  console.log('Body:', req.body);
  next();
});

// Routes
app.use('/auth', authRoutes);
app.use('/product', productRoutes);
app.use('/utils', utilsRoutes);
app.use('/sales', salesRoutes);

// Root route
app.get('/', async (req: Request, res: Response) => {
  try {
    await db.execute(sql`SELECT 1`);

    res.status(200).json({
      success: true,
      message: 'Inventory Management backend running 🚀'
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: 'Database connection failed'
    });
  }
});

// 404 handler
app.use((req: Request, res: Response) => {
  console.warn(`No matching route for ${req.method} ${req.originalUrl}`);

  res.status(404).json({
    error: 'Not Found',
    path: req.originalUrl
  });
});

// Export app for Vercel
export default app;