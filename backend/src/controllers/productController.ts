import { Request, Response } from "express";
import { eq } from "drizzle-orm";

import { db } from "../config/db";
import { products, inventory, categories } from "../drizzle/schema";
import cloudinary from "../config/cloudinary";


/*
----------------------------------------
ADD PRODUCT
Creates:
1. product row
2. linked inventory row
----------------------------------------
*/

export const addProduct = async (
    req: Request,
    res: Response
) => {
    try {
        const {
            name,
            description,
            categoryId,
            sku,
            barcode,
            costPrice,
            initialQuantity, 
            lowStockThreshold
        } = req.body;

        if (
            !name ||
            !categoryId ||
            !costPrice
        ) {
            return res
                .status(400)
                .json({
                    message: "Missing required fields"
                });
        }

        // handle optional image upload (multer places file on req.file)
        let uploadedImageUrl: string | null = null;
        const file = (req as any).file as Express.Multer.File | undefined;

        if (file) {
            // upload buffer to cloudinary
            uploadedImageUrl = await new Promise<string>((resolve, reject) => {
                const uploadStream = cloudinary.uploader.upload_stream({ folder: 'products' }, (error: any, result: any) => {
                    if (error) return reject(error);
                    resolve(result?.secure_url as string);
                });
                uploadStream.end(file.buffer);
            });
        }

        await db.transaction(
            async (tx) => {

                // 1 create product
                const [newProduct] =
                    await tx
                        .insert(products)
                        .values({
                            name,
                            description,
                            categoryId,
                            sku,
                            barcode,
                            costPrice,
                            image: uploadedImageUrl
                        })
                        .returning();

                if(!newProduct) {
                    throw new Error("Failed to create product");
                }

                // 2 create inventory row
                await tx
                    .insert(inventory)
                    .values({
                        productId: newProduct.id,
                        quantity:
                            initialQuantity || 0,

                        lowStockThreshold:
                            lowStockThreshold || 5
                    });
            }
        );

        return res
            .status(201)
            .json({
                message: "Product created successfully",
                imageUrl: uploadedImageUrl
            });

    } catch (error) {
        console.error(error);

        return res
            .status(500)
            .json({
                message:
                    "Failed to create product"
            });
    }
};




/*
----------------------------------------
UPDATE PRODUCT
Updates:
1 product data
2 inventory data if included
----------------------------------------
*/

export const updateProduct = async (
    req: Request,
    res: Response
) => {
    try {

        const { id } = req.params as { id: string };

        // allow multipart form data with optional file
        const file = (req as any).file as Express.Multer.File | undefined;

        const {
            name,
            description,
            categoryId,
            sku,
            barcode,
            costPrice,

            quantity,
            lowStockThreshold
        } = req.body;

        // basic validation / sanitization
        const updates: any = {};
        if (name !== undefined) updates.name = String(name).trim();
        if (description !== undefined) updates.description = String(description).trim();
        if (categoryId !== undefined) updates.categoryId = String(categoryId) || null;
        if (sku !== undefined) updates.sku = sku === '' ? null : String(sku).trim();
        if (barcode !== undefined) updates.barcode = barcode === '' ? null : String(barcode).trim();
        if (costPrice !== undefined) {
            const cp = Number(costPrice);
            if (Number.isFinite(cp) && cp >= 0) updates.costPrice = cp;
        }

        // if file provided, upload to cloudinary and set image
        let uploadedImageUrl: string | null = null;
        if (file) {
            uploadedImageUrl = await new Promise<string>((resolve, reject) => {
                const uploadStream = cloudinary.uploader.upload_stream({ folder: 'products' }, (error: any, result: any) => {
                    if (error) return reject(error);
                    resolve(result?.secure_url as string);
                });
                uploadStream.end(file.buffer);
            });
            updates.image = uploadedImageUrl;
        }

        await db.transaction(
            async (tx) => {
                // update product table only with provided fields
                if (Object.keys(updates).length > 0) {
                    await tx
                        .update(products)
                        .set({
                            ...updates,
                            updatedAt: new Date()
                        })
                        .where(eq(products.id, id));
                }

                // update inventory if provided
                const invUpdates: any = {};
                if (quantity !== undefined) {
                    const q = parseInt(String(quantity), 10);
                    if (!Number.isNaN(q) && q >= 0) invUpdates.quantity = q;
                }
                if (lowStockThreshold !== undefined) {
                    const l = parseInt(String(lowStockThreshold), 10);
                    if (!Number.isNaN(l) && l >= 0) invUpdates.lowStockThreshold = l;
                }

                if (Object.keys(invUpdates).length > 0) {
                    await tx
                        .update(inventory)
                        .set({
                            ...invUpdates,
                            updatedAt: new Date()
                        })
                        .where(eq(inventory.productId, id));
                }
            }
        );

        return res.status(200).json({ message: 'Product updated successfully', imageUrl: uploadedImageUrl });

    } catch (error) {

        console.error(error);

        return res
            .status(500)
            .json({
                message:
                    "Failed to update product"
            });
    }
};




/*
----------------------------------------
DELETE PRODUCT
Deletes:
1 inventory first
2 product second

(avoid fk issues)
----------------------------------------
*/

export const deleteProduct = async (
    req: Request,
    res: Response
) => {

    try {

        const { id } = req.params as { id: string };

        await db.transaction(
            async (tx) => {

                // delete inventory row first
                await tx
                    .delete(inventory)
                    .where(
                        eq(
                            inventory.productId,
                            id
                        )
                    );

                // then delete product
                await tx
                    .delete(products)
                    .where(
                        eq(
                            products.id,
                            id
                        )
                    );

            }
        );

        return res
            .status(200)
            .json({
                message:
                    "Product deleted successfully"
            });

    } catch (error) {

        console.error(error);

        return res
            .status(500)
            .json({
                message:
                    "Failed to delete product"
            });
    }
};




export const getProductsPageData = async (
    req: Request,
    res: Response
) => {

    try {
        const page = Math.max(parseInt((req.query.page as string) || "1", 10), 1);
        const limitFromQuery = parseInt((req.query.limit as string) || "12", 10);
        const limit = Number.isFinite(limitFromQuery) ? Math.min(Math.max(limitFromQuery, 1), 100) : 12;
        const offset = (page - 1) * limit;
        const search = ((req.query.search as string | undefined) || "").trim().toLowerCase();
        const categoryId = (req.query.categoryId as string | undefined) || "";
        const stockStatus = (req.query.stockStatus as string | undefined) || "all";
        const priceRange = (req.query.priceRange as string | undefined) || "all";
        const sortBy = (req.query.sortBy as string | undefined) || "newest";

        // fetch categories (for dropdown and counts)
        const allCategories = await db.select().from(categories).execute();
        const totalCategories = allCategories.length;

        // fetch products joined with inventory and category info
        const joined = await db
            .select()
            .from(products)
            .leftJoin(inventory, eq(products.id, inventory.productId))
            .innerJoin(categories, eq(products.categoryId, categories.id))
            .execute();

        // Build product details array: include product fields, category {id,name}, inventory object
        const productsDetails = joined.map((row: any) => {
            const product = row.products || {};
            const inv = row.inventory || null;
            const cat = row.categories || null;

            return {
                ...product,
                category: cat ? { id: cat.id, name: cat.name } : null,
                inventory: inv
            };
        });

        const totalProducts = productsDetails.length;

        // inventory stats computed from productsDetails
        const lowStock = productsDetails.filter((p: any) => p.inventory && p.inventory.quantity > 0 && p.inventory.quantity <= p.inventory.lowStockThreshold).length;
        const outOfStock = productsDetails.filter((p: any) => p.inventory && p.inventory.quantity === 0).length;
        const filteredProducts = productsDetails
            .filter((product: any) => {
                if (categoryId && String(product.category?.id) !== String(categoryId)) {
                    return false;
                }

                if (search) {
                    const searchable = [
                        product.name,
                        product.sku,
                        product.barcode,
                        product.category?.name
                    ]
                        .filter(Boolean)
                        .join(" ")
                        .toLowerCase();

                    if (!searchable.includes(search)) {
                        return false;
                    }
                }

                const quantity = product.inventory?.quantity ?? 0;
                const threshold = product.inventory?.lowStockThreshold ?? 5;
                if (stockStatus === "in-stock" && !(quantity > threshold)) return false;
                if (stockStatus === "low-stock" && !(quantity > 0 && quantity <= threshold)) return false;
                if (stockStatus === "out-of-stock" && quantity !== 0) return false;

                const costPrice = Number(product.costPrice || 0);
                if (priceRange === "below-500" && !(costPrice < 500)) return false;
                if (priceRange === "500-5000" && !(costPrice >= 500 && costPrice <= 5000)) return false;
                if (priceRange === "above-5000" && !(costPrice > 5000)) return false;

                return true;
            })
            .sort((a: any, b: any) => {
                if (sortBy === "price-low-high") return Number(a.costPrice || 0) - Number(b.costPrice || 0);
                if (sortBy === "price-high-low") return Number(b.costPrice || 0) - Number(a.costPrice || 0);
                if (sortBy === "stock-high-low") return (b.inventory?.quantity ?? 0) - (a.inventory?.quantity ?? 0);
                return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
            });

        const filteredTotal = filteredProducts.length;
        const paginatedProducts = filteredProducts.slice(offset, offset + limit);

        return res.status(200).json({
            totalProducts,
            totalCategories,
            lowStock,
            outOfStock,
            categories: allCategories,
            products: paginatedProducts,
            pagination: {
                page,
                limit,
                totalItems: filteredTotal,
                totalPages: Math.max(Math.ceil(filteredTotal / limit), 1),
                hasNextPage: offset + limit < filteredTotal,
                hasPrevPage: page > 1
            }
        });

    } catch (error) {

        console.error(error);

        return res
            .status(500)
            .json({
                message:
                    "Failed to fetch product details"
            });
    }
};


// Search products for selection (supports search text and optional categoryId)
export const searchProducts = async (req: Request, res: Response) => {
    try {
        const q = (req.query.q as string | undefined) || '';
        const categoryId = req.query.categoryId as string | undefined;

        // fetch a limited set joined with inventory and categories, then filter in JS (avoids complex Drizzle where typing)
        const joined = await db
            .select()
            .from(products)
            .leftJoin(inventory, eq(products.id, inventory.productId))
            .innerJoin(categories, eq(products.categoryId, categories.id))
            .limit(200)
            .execute();

        // filter in JS by categoryId and q
        const filtered = joined.filter((row: any) => {
            const product = row.products || {};
            const cat = row.categories || null;
            if (categoryId && (!cat || String(cat.id) !== String(categoryId))) return false;
            if (q) {
                const lower = q.toLowerCase();
                const name = (product.name || '').toString().toLowerCase();
                const sku = (product.sku || '').toString().toLowerCase();
                const barcode = (product.barcode || '').toString().toLowerCase();
                return name.includes(lower) || sku.includes(lower) || barcode.includes(lower);
            }
            return true;
        }).slice(0, 50);

        const joinedToUse = filtered;

    const productsDetails = joinedToUse.map((row: any) => {
            const product = row.products || {};
            const inv = row.inventory || null;
            const cat = row.categories || null;

            return {
                ...product,
                category: cat ? { id: cat.id, name: cat.name } : null,
                inventory: inv
            };
        });

        res.json({ products: productsDetails });
    } catch (error) {
        console.error('Failed to search products', error);
        res.status(500).json({ error: 'Failed to search products' });
    }
};


// Get single product details by id (includes inventory and category)
export const getProductDetails = async (req: Request, res: Response) => {
    try {
        const { id } = req.params as { id: string };

        const joined = await db
            .select()
            .from(products)
            .leftJoin(inventory, eq(products.id, inventory.productId))
            .leftJoin(categories, eq(products.categoryId, categories.id))
            .where(eq(products.id, id))
            .limit(1)
            .execute();

        if (!joined || joined.length === 0) {
            return res.status(404).json({ message: 'Product not found' });
        }

        const row = joined[0];
        if(!row) {
            return res.status(404).json({ message: 'Product not found' });
        }

        const product = row.products || {};
        const inv = row.inventory || null;
        const cat = row.categories || null;

        return res.status(200).json({
            ...product,
            category: cat ? { id: cat.id, name: cat.name } : null,
            inventory: inv
        });
    } catch (error) {
        console.error('Failed to fetch product details', error);
        return res.status(500).json({ message: 'Failed to fetch product details' });
    }
};
