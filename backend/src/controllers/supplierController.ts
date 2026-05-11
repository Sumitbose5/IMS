import { eq } from "drizzle-orm";
import { db } from "../config/db";
import { suppliers } from "../drizzle/suppliers";
import { Request, Response } from "express";

export const createSupplier = async (req: Request, res: Response) => {
    const { name, phone, address } = req.body;

    try {
        // check if phone number already exists
        const existingSupplier = await db.select().from(suppliers).where(eq(suppliers.phone, phone)).limit(1);
        if (existingSupplier.length > 0) {
            console.log("Supplier with this phone number already exists:", existingSupplier);
            return res.status(409).json({ error: "Supplier with this phone number already exists" });
        }

    const [created] = await db.insert(suppliers).values({ name, phone, address }).returning();
    if (!created) return res.status(500).json({ error: 'Failed to create supplier' });
    res.status(201).json(created);
    } catch (error) {
        console.error("Error creating supplier:", error);
        res.status(500).json({ error: "Failed to create supplier" });
    }
};

export const listSuppliers = async (req: Request, res: Response) => {
    try {
    const all = await db.select().from(suppliers).orderBy(suppliers.name);
        res.json(all);
    } catch (error) {
        console.error('Error listing suppliers:', error);
        res.status(500).json({ error: 'Failed to list suppliers' });
    }
};