import * as dotenv from 'dotenv';
dotenv.config();

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
const app = express();
const PORT: number = 3000;

// Initialize the database connection
import { db } from './config/db';
import { sql } from 'drizzle-orm';
import authRoutes from './routes/authRoutes'
import productRoutes from './routes/productRoutes'
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

app.use('/auth', authRoutes);
app.use('/product', productRoutes);
app.use('/utils', utilsRoutes);
app.use('/sales', salesRoutes);

app.use((req: Request, res: Response, next: NextFunction) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  console.log('Content-Type:', req.headers['content-type']);
  console.log('Body:', req.body);
  next();
});

// 404 handler for debugging unmatched routes
app.use((req: Request, res: Response) => {
  console.warn(`No matching route for ${req.method} ${req.originalUrl}`);
  res.status(404).json({ error: 'Not Found', path: req.originalUrl });
});

app.get('/', (req: Request, res: Response) => {
  res.send('Inventory Management wale aa gaye oyee!');
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