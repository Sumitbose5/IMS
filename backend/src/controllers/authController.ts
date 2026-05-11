import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import geoip from 'geoip-lite';
import { eq } from 'drizzle-orm';
import { db } from '../config/db';
import { users, loginHistory } from '../drizzle/schema';

const JWT_SECRET = process.env.JWT_SECRET || 'supersecret';

export const register = async (req: Request, res: Response) => {
  const { name, email, password } = req.body;
  const hashedPassword = await bcrypt.hash(password, 10);

  try {
    const newUser = await db.insert(users).values({
      name,
      email,
      password: hashedPassword,
    }).returning({ id: users.id, email: users.email });

    res.status(201).json({ message: 'User created', user: newUser[0] });
  } catch (error) {
    res.status(400).json({ message: 'User already exists or invalid data' });
  }
};

export const login = async (req: Request, res: Response) => {
  const { email, password } = req.body;

  const usersResult = await db.select().from(users).where(eq(users.email, email));
  const user = usersResult[0];

  if (!user || !(await bcrypt.compare(password, user.password))) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }

  // Capture IP Address
  // Note: If behind a proxy (like Nginx/Cloudflare), use req.headers['x-forwarded-for']
  const ip = req.ip || req.headers['x-forwarded-for']?.toString() || 'unknown';
  
  // Lookup Location
  const geo = geoip.lookup(ip);
  console.log(`Login from IP: ${ip}, Location: ${geo ? `${geo.city}, ${geo.country}` : 'Unknown'}`);
  const location = geo ? `${geo.city}, ${geo.country}` : 'Unknown';

  // Save to Audit Table
  await db.insert(loginHistory).values({
    userId: user.id,
    ipAddress: ip,
    location: location,
  });

  const token = jwt.sign({ userId: user.id, role: user.role }, JWT_SECRET, { expiresIn: '5d' });
  res.json({ token, user: { id: user.id, email: user.email, name: user.name } });
};

export const changePassword = async (req: Request, res: Response) => {
  const { oldPassword, newPassword } = req.body;
  const userId = req.params?.userId as string;

  if (!userId) return res.status(401).json({ message: 'Unauthorized' });

  const usersResult = await db.select().from(users).where(eq(users.id, userId));
  const user = usersResult[0];

  if (!user || !(await bcrypt.compare(oldPassword, user.password))) {
    return res.status(401).json({ message: 'Invalid current password' });
  }

  const hashedPassword = await bcrypt.hash(newPassword, 10);
  
  await db.update(users)
    .set({ password: hashedPassword })
    .where(eq(users.id, userId));

  res.json({ message: 'Password updated successfully' });
};
