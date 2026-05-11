import express, { Request, Response } from "express";
import { db } from "../config/db";
import { categories } from "../drizzle/schema";
import { eq } from "drizzle-orm";

export const addCategory = async (req: Request, res: Response) => {
    try {
        const { name } = req.body;

        if (!name) {
            return res.status(400).json({ message: "Missing required fields" });
        }

        const trimmedName = name.trim().toLowerCase();

        // check if the category already exists
        const existingCategory = await db
            .select()
            .from(categories)
            .where(eq(categories.name, trimmedName))
            .limit(1)
            .execute();

        if (existingCategory.length > 0) {
            return res.status(409).json({ message: "Category already exists" });
        }

        const [newCategory] = await db
            .insert(categories)
            .values({ name: trimmedName })
            .returning();

        return res.status(201).json({
            message: "Category created successfully",
            category: newCategory
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Failed to create category" });
    }
};


export const getAllCategories = async (req: Request, res: Response) => {
    try {
        const allCategories = await db
            .select()
            .from(categories)
            .execute();

        return res.status(200).json(allCategories);
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Failed to retrieve categories" });
    }
};