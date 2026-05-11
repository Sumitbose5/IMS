import { Request, Response } from 'express';
import { db } from '../config/db';
import { purchases } from '../drizzle/purchases';
import { purchaseItems } from '../drizzle/purchase-items';
import { suppliers } from '../drizzle/suppliers';
import { users } from '../drizzle/users';
import { eq, gte, lt, and, desc, inArray } from 'drizzle-orm';
import { stockTransactions } from '../drizzle/stock-transactions';
import { products } from '../drizzle/products';
import { inventory } from '../drizzle/inventory';
import cloudinary from '../config/cloudinary';

const uploadProductImage = async (file?: Express.Multer.File): Promise<string | null> => {
  if (!file) return null;

  return new Promise<string>((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream({ folder: 'products' }, (error: any, result: any) => {
      if (error) return reject(error);
      resolve(result?.secure_url as string);
    });

    uploadStream.end(file.buffer);
  });
};

/**
 * Create a purchase: inserts into purchases, purchase_items and stock_transactions
 * Expects body: { supplierId, purchaseDate, invoiceReceipt?, paymentStatus, paymentMethod, subtotal, discount, cgst, sgst, igst, shippingCharges, otherCharges, totalAmount, items: [{ productId, quantity, costPrice, totalPrice }] }
 */
export const createPurchase = async (req: Request, res: Response) => {
  try {
    const payload = req.body.payload ? JSON.parse(req.body.payload) : req.body;

    const {
      supplierId,
      purchaseDate,
      invoiceReceipt,
      paymentStatus: incomingPaymentStatus,
      paymentMethod,
      subtotal,
      discount,
      cgst,
      sgst,
      igst,
      shippingCharges,
      otherCharges,
      totalAmount,
      paid_amount,
      due_amount,
      items
    } = payload;

  if (!supplierId || !purchaseDate || subtotal === undefined || totalAmount === undefined || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

  // validate paid/due amounts
  const paidAmount = Number(paid_amount || 0);
  const dueAmount = Number(due_amount || 0);
  if (paidAmount < 0 || dueAmount < 0) return res.status(400).json({ error: 'Paid and due amounts must be non-negative' });
  if (paidAmount > Number(totalAmount)) return res.status(400).json({ error: 'Paid amount cannot exceed total amount' });
  if (dueAmount > Number(totalAmount)) return res.status(400).json({ error: 'Due amount cannot exceed total amount' });
  if (Number((paidAmount + dueAmount).toFixed(2)) > Number(totalAmount)) return res.status(400).json({ error: 'Sum of paid and due cannot exceed total amount' });

    if (!payload.createdBy) {
      return res.status(400).json({ error: 'createdBy (user id) is required' });
    }

    const files = ((req as any).files || []) as Express.Multer.File[];
    const filesByField = new Map(files.map(file => [file.fieldname, file]));

    const uploadedImages = await Promise.all(
      items.map((it: any) => uploadProductImage(filesByField.get(it.imageField)))
    );

    const result = await db.transaction(async (tx) => {
      // determine payment status: prefer computed state to avoid client tampering
      let computedPaymentStatus: typeof incomingPaymentStatus = incomingPaymentStatus;
      if (dueAmount > 0) computedPaymentStatus = 'pending';
      else if (paidAmount >= Number(totalAmount)) computedPaymentStatus = 'completed';
      else computedPaymentStatus = incomingPaymentStatus || 'pending';

  const [created] = await tx.insert(purchases).values({
        supplierId,
        createdBy: payload.createdBy,
        purchaseDate: new Date(purchaseDate),
        invoiceReceipt: invoiceReceipt || null,
        paymentStatus: computedPaymentStatus,
        paymentMethod,
        subtotal,
        discount,
        cgst,
        sgst,
        igst,
        shippingCharges,
        otherCharges,
        paid_amount: paidAmount,
        due_amount: dueAmount,
        totalAmount
      } as any).returning();

      if (!created?.id) {
        throw new Error('Failed to create purchase record');
      }

      const purchaseId = created.id;
      const itemsToInsert = [];

      for (const [index, it] of items.entries()) {
        let productId = it.productId;

        if (productId) {
          // existing product: verify it exists
          const [existingProduct] = await tx.select().from(products).where(eq(products.id, productId));
          if (!existingProduct) {
            throw new Error('Product not found for purchase item');
          }

          // update or create inventory record: increment quantity if present
          const [existingInventory] = await tx.select().from(inventory).where(eq(inventory.productId, productId));
          if (existingInventory) {
            await tx.update(inventory).set({
              quantity: Number(existingInventory.quantity) + Number(it.quantity)
            }).where(eq(inventory.productId, productId));
          } else {
            await tx.insert(inventory).values({
              productId,
              quantity: Number(it.quantity),
              lowStockThreshold: 5
            });
          }
        } else {
          const product = it.product;
          if (!product?.name || !product?.categoryId || product.costPrice === undefined) {
            throw new Error('Missing product fields for purchase item');
          }

          const [newProduct] = await tx.insert(products).values({
            name: product.name,
            description: product.description || null,
            categoryId: product.categoryId,
            sku: product.sku || null,
            barcode: product.barcode || null,
            costPrice: product.costPrice,
            image: uploadedImages[index]
          }).returning();

          if (!newProduct?.id) {
            throw new Error('Failed to create product for purchase item');
          }

          productId = newProduct.id;

          await tx.insert(inventory).values({
            productId,
            quantity: Number(product.initialQuantity ?? it.quantity ?? 0),
            lowStockThreshold: Number(product.lowStockThreshold ?? 5)
          });
        }

        itemsToInsert.push({
          purchaseId,
          productId,
          quantity: Number(it.quantity),
          costPrice: it.costPrice,
          totalPrice: it.totalPrice
        });
      }

      await tx.insert(purchaseItems).values(itemsToInsert);

      await tx.insert(stockTransactions).values(itemsToInsert.map((it: any) => ({
        productId: it.productId,
        type: 'purchase' as const,
        quantity: Number(it.quantity),
        referenceId: purchaseId
      })) as any[]);

      return { purchase: created, items: itemsToInsert };
    });

    res.status(201).json(result);
  } catch (error) {
    console.error('Error creating purchase:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to create purchase' });
  }
};

export const listPurchases = async (req: Request, res: Response) => {
  try {
    // optional filters: year, month (1-12), fullYear (true)
    const yearStr = req.query.year as string | undefined;
    const monthStr = req.query.month as string | undefined; // 1-based
    const fullYear = req.query.fullYear === 'true' || req.query.fullYear === '1';

    const now = new Date();
    const year = yearStr ? Number(yearStr) : now.getFullYear();
    const month = monthStr ? Number(monthStr) : (now.getMonth() + 1);

    let start: Date;
    let end: Date;
    if (fullYear) {
      start = new Date(year, 0, 1);
      end = new Date(year + 1, 0, 1);
    } else {
      // month is 1-12
      start = new Date(year, (month - 1), 1);
      end = new Date(year, (month - 1) + 1, 1);
    }

    // fetch purchases within date range
  const list = await db.select().from(purchases).where(and(gte(purchases.purchaseDate, start), lt(purchases.purchaseDate, end))).orderBy(desc(purchases.purchaseDate)).limit(1000);

    // fetch suppliers and items in bulk and attach useful info to each purchase
    const allSuppliers = await db.select().from(suppliers);
    const supplierMap = new Map(allSuppliers.map((s: any) => [s.id, s]));

    // fetch purchase items for the purchases we selected (avoid unrelated items)
    const purchaseIds = list.map((p: any) => p.id);
    let itemCountMap = new Map<string, number>();
    if (purchaseIds.length > 0) {
      const allItems = await db.select().from(purchaseItems).where(inArray(purchaseItems.purchaseId, purchaseIds));
      itemCountMap = new Map<string, number>();
      for (const it of allItems) {
        itemCountMap.set(it.purchaseId, (itemCountMap.get(it.purchaseId) ?? 0) + 1);
      }
    }

    const enriched = list.map((p: any) => ({
      ...p,
      supplier: supplierMap.get(p.supplierId) ?? null,
      itemCount: itemCountMap.get(p.id) ?? 0
    }));

    // compute stats for the same range
    const totalAmount = list.reduce((s: number, p: any) => s + Number(p.totalAmount ?? 0), 0);
    const totalOrders = list.length;
    const avgOrderValue = totalOrders > 0 ? Number((totalAmount / totalOrders).toFixed(2)) : 0;

    res.json({ purchases: enriched, stats: { totalAmount, totalOrders, avgOrderValue } });
  } catch (error) {
    console.error('Error listing purchases:', error);
    res.status(500).json({ error: 'Failed to list purchases' });
  }
};

export const getPurchaseDetails = async (req: Request, res: Response) => {
  try {
  const rawId = req.params.id;
  const id = Array.isArray(rawId) ? rawId[0] : rawId;
  if (!id) return res.status(400).json({ error: 'Purchase id is required' });

  // fetch purchase
  const [purchase] = await db.select().from(purchases).where(eq(purchases.id, id));
    if (!purchase) return res.status(404).json({ error: 'Purchase not found' });

  // fetch supplier and user names
  const supplierRes = await db.select().from(suppliers).where(eq(suppliers.id, purchase.supplierId)).limit(1);
  const supplier = supplierRes[0] ?? null;
  const userRes = await db.select().from(users).where(eq(users.id, purchase.createdBy)).limit(1);
  const user = userRes[0] ?? null;

  // fetch items
  const items = await db.select().from(purchaseItems).where(eq(purchaseItems.purchaseId, id));

  // enrich items with product details
  const productIds = Array.from(new Set(items.map((it: any) => it.productId)));
  const allProducts = await db.select().from(products);
  const productMap = new Map(allProducts.map((p: any) => [p.id, p]));

  const enrichedItems = items.map((it: any) => ({
    ...it,
    product: productMap.get(it.productId) ?? null
  }));

  // also include other outstanding purchases (debts) for the same supplier
  let debts: any[] = [];
  try {
    const supplierRows = await db.select().from(purchases).where(eq(purchases.supplierId, purchase.supplierId)).orderBy(desc(purchases.purchaseDate));
    debts = supplierRows
      .filter((r: any) => Number(r.due_amount || 0) > 0)
      .map((r: any) => ({
        id: r.id,
        invoiceReceipt: r.invoiceReceipt,
        purchaseDate: r.purchaseDate,
        totalAmount: r.totalAmount,
        paid_amount: r.paid_amount,
        due_amount: r.due_amount
      }));
  } catch (e) {
    // non-fatal: continue without debts
    console.error('Failed to fetch supplier debts', e);
  }

  res.json({ purchase, supplier, user, items: enrichedItems, debts });
  } catch (error) {
    console.error('Error fetching purchase details:', error);
    res.status(500).json({ error: 'Failed to fetch purchase details' });
  }
};

export const listDebtors = async (req: Request, res: Response) => {
  try {
    // optional filters: year, month, fullYear
    const yearStr = req.query.year as string | undefined;
    const monthStr = req.query.month as string | undefined; // 1-based
    const fullYear = req.query.fullYear === 'true' || req.query.fullYear === '1';

    const now = new Date();
    const year = yearStr ? Number(yearStr) : now.getFullYear();
    const month = monthStr ? Number(monthStr) : (now.getMonth() + 1);

    let start: Date;
    let end: Date;
    if (fullYear) {
      start = new Date(year, 0, 1);
      end = new Date(year + 1, 0, 1);
    } else {
      start = new Date(year, (month - 1), 1);
      end = new Date(year, (month - 1) + 1, 1);
    }

    // fetch purchases in range and return per-purchase debts (one row per purchase with outstanding due)
    const rows = await db.select().from(purchases).where(and(gte(purchases.purchaseDate, start), lt(purchases.purchaseDate, end))).orderBy(desc(purchases.purchaseDate)).execute();

    // filter purchases that have a due amount
    const debtRows = rows.filter((r: any) => Number(r.due_amount || 0) > 0);

    // fetch supplier names for the debt rows
    const supplierIds = Array.from(new Set(debtRows.map((r: any) => r.supplierId).filter(Boolean)));
    const supplierMap = new Map<string, any>();
    if (supplierIds.length > 0) {
      const supRows = await db.select().from(suppliers).where(inArray(suppliers.id, supplierIds)).execute();
      for (const s of supRows) supplierMap.set(s.id, s);
    }

    const list = debtRows.map((p: any) => ({
      id: p.id,
      supplierId: p.supplierId,
      supplierName: supplierMap.get(p.supplierId)?.name ?? 'Unknown',
      invoiceReceipt: p.invoiceReceipt,
      purchaseDate: p.purchaseDate,
      totalAmount: p.totalAmount,
      paid_amount: p.paid_amount,
      due_amount: p.due_amount
    }));

    const totalDebt = list.reduce((s, d) => s + Number(d.due_amount || 0), 0);

    res.json({ totalDebt, debtors: list });
  } catch (err) {
    console.error('Error listing debtors:', err);
    res.status(500).json({ error: 'Failed to list debtors' });
  }
};

export const getDebtorDetails = async (req: Request, res: Response) => {
  try {
    const supplierId = req.params.supplierId as string;
    if (!supplierId) return res.status(400).json({ error: 'supplierId is required' });

    // optional date filters
    const yearStr = req.query.year as string | undefined;
    const monthStr = req.query.month as string | undefined; // 1-based
    const fullYear = req.query.fullYear === 'true' || req.query.fullYear === '1';

    const now = new Date();
    const year = yearStr ? Number(yearStr) : now.getFullYear();
    const month = monthStr ? Number(monthStr) : (now.getMonth() + 1);

    let start: Date;
    let end: Date;
    if (fullYear) {
      start = new Date(year, 0, 1);
      end = new Date(year + 1, 0, 1);
    } else {
      start = new Date(year, (month - 1), 1);
      end = new Date(year, (month - 1) + 1, 1);
    }

    const rows = await db.select().from(purchases).where(and(eq(purchases.supplierId, supplierId), gte(purchases.purchaseDate, start), lt(purchases.purchaseDate, end))).orderBy(desc(purchases.purchaseDate)).execute();

    const debts = rows.filter((r: any) => Number(r.due_amount || 0) > 0).map((r: any) => ({
      id: r.id,
      invoiceReceipt: r.invoiceReceipt,
      purchaseDate: r.purchaseDate,
      totalAmount: r.totalAmount,
      paid_amount: r.paid_amount,
      due_amount: r.due_amount
    }));

    res.json({ supplierId, debts });
  } catch (err) {
    console.error('Error fetching debtor details:', err);
    res.status(500).json({ error: 'Failed to fetch debtor details' });
  }
};

export const updatePurchase = async (req: Request, res: Response) => {
  try {
    const rawId = req.params.id;
    const id = Array.isArray(rawId) ? rawId[0] : rawId;
    if (!id) return res.status(400).json({ error: 'Purchase id is required' });

    const payload = req.body.payload ? JSON.parse(req.body.payload) : req.body;

    const {
      supplierId,
      purchaseDate,
      invoiceReceipt,
      paymentMethod,
      subtotal,
      discount,
      cgst,
      sgst,
      igst,
      shippingCharges,
      otherCharges,
      totalAmount,
      paid_amount,
      due_amount,
      items
    } = payload;

    if (!Array.isArray(items) || items.length === 0) return res.status(400).json({ error: 'At least one purchase item is required' });

    // begin transaction to safely update purchase and adjust inventory
    const result = await db.transaction(async (tx) => {
      const [existing] = await tx.select().from(purchases).where(eq(purchases.id, id));
      if (!existing) throw new Error('Purchase not found');

      // fetch existing items
      const existingItems = await tx.select().from(purchaseItems).where(eq(purchaseItems.purchaseId, id));
      const existingQtyMap = new Map(existingItems.map((it: any) => [it.productId, Number(it.quantity || 0)]));

      // normalize incoming items: must have productId and quantity and costPrice
      for (const it of items) {
        if (!it.productId) throw new Error('productId required for each item');
        if (Number(it.quantity) <= 0) throw new Error('quantity must be > 0');
      }

      const incomingProductIds = Array.from(new Set(items.map((it: any) => it.productId)));
      // verify products exist
      const prodRows = await tx.select().from(products).where(inArray(products.id, incomingProductIds));
      const prodSet = new Set(prodRows.map((p: any) => p.id));
      for (const pid of incomingProductIds) {
        if (!prodSet.has(pid)) throw new Error(`Product ${pid} not found`);
      }

  // compute quantity deltas and update inventory accordingly
      // simpler approach: for each product, compute delta = incomingQty - existingQty, then update inventory by +delta
      for (const it of items) {
        const pid = it.productId;
        const incomingQty = Number(it.quantity || 0);
        const existingQty = existingQtyMap.get(pid) || 0;
        const delta = incomingQty - existingQty;

        const [stock] = await tx.select().from(inventory).where(eq(inventory.productId, pid));
        if (!stock) throw new Error(`Inventory missing for product ${pid}`);

        const newQty = Number(stock.quantity || 0) + delta;
        if (newQty < 0) throw new Error(`Insufficient stock for product ${pid} when applying update`);

        await tx.update(inventory).set({ quantity: newQty }).where(eq(inventory.productId, pid));

        // insert stock transaction for adjustment
        if (delta !== 0) {
          await tx.insert(stockTransactions).values({ productId: pid, type: 'adjustment', quantity: delta, referenceId: id } as any);
        }
      }

      // replace purchase items
      await tx.delete(purchaseItems).where(eq(purchaseItems.purchaseId, id));
      await tx.insert(purchaseItems).values(items.map((it: any) => ({ purchaseId: id, productId: it.productId, quantity: Number(it.quantity), costPrice: it.costPrice, totalPrice: it.totalPrice })) as any[]);

      // update purchase header
      await tx.update(purchases).set({
        supplierId: supplierId || existing.supplierId,
        purchaseDate: purchaseDate ? new Date(purchaseDate) : existing.purchaseDate,
        invoiceReceipt: invoiceReceipt ?? existing.invoiceReceipt,
        paymentMethod: paymentMethod ?? existing.paymentMethod,
        subtotal: subtotal ?? existing.subtotal,
        discount: discount ?? existing.discount,
        cgst: cgst ?? existing.cgst,
        sgst: sgst ?? existing.sgst,
        igst: igst ?? existing.igst,
        shippingCharges: shippingCharges ?? existing.shippingCharges,
        otherCharges: otherCharges ?? existing.otherCharges,
        paid_amount: paid_amount ?? existing.paid_amount,
        due_amount: due_amount ?? existing.due_amount,
        totalAmount: totalAmount ?? existing.totalAmount
      }).where(eq(purchases.id, id));

      const [updated] = await tx.select().from(purchases).where(eq(purchases.id, id));

      return { purchase: updated };
    });

    res.json(result);
  } catch (err) {
    console.error('Error updating purchase:', err);
    const message = err instanceof Error ? err.message : 'Failed to update purchase';
    return res.status(400).json({ error: message });
  }
};
