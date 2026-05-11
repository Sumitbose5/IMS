import { Request, Response } from "express";
import { desc, eq, inArray } from "drizzle-orm";
import { db } from "../config/db";
import {
  categories,
  inventory,
  products,
  purchaseItems,
  purchases,
  saleItems,
  sales,
  suppliers
} from "../drizzle/schema";

const toNumber = (value: unknown) => Number(value ?? 0);

const getDayRange = (date: Date) => {
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const end = new Date(start);
  end.setDate(start.getDate() + 1);
  return { start, end };
};

const isWithin = (date: Date, start: Date, end: Date) => date >= start && date < end;

export const getDashboardData = async (_req: Request, res: Response) => {
  try {
    const now = new Date();
    const currentYear = now.getFullYear();
    const today = getDayRange(now);
    const yesterdayDate = new Date(now);
    yesterdayDate.setDate(now.getDate() - 1);
    const yesterday = getDayRange(yesterdayDate);

    const productRows = await db
      .select()
      .from(products)
      .leftJoin(inventory, eq(products.id, inventory.productId))
      .leftJoin(categories, eq(products.categoryId, categories.id));

    const productDetails = productRows
      .map((row: any) => ({
        ...row.products,
        inventory: row.inventory ?? null,
        category: row.categories ?? null
      }))
      .filter((product: any) => !product.isArchived);

    const productMap = new Map(productDetails.map((product: any) => [product.id, product]));
    const categoryIds = new Set(productDetails.map((product: any) => product.categoryId).filter(Boolean));

    const totalItems = productDetails.reduce(
      (sum: number, product: any) => sum + Number(product.inventory?.quantity ?? 0),
      0
    );
    const stockValue = productDetails.reduce(
      (sum: number, product: any) =>
        sum + Number(product.inventory?.quantity ?? 0) * toNumber(product.costPrice),
      0
    );

    const lowStockProductDetails = productDetails
      .filter((product: any) => {
        const quantity = Number(product.inventory?.quantity ?? 0);
        const threshold = Number(product.inventory?.lowStockThreshold ?? 5);
        return quantity <= threshold;
      });

    const lowStockProducts = lowStockProductDetails
      .sort((a: any, b: any) => Number(a.inventory?.quantity ?? 0) - Number(b.inventory?.quantity ?? 0))
      .slice(0, 6)
      .map((product: any) => ({
        id: product.id,
        name: product.name,
        sku: product.sku,
        quantity: Number(product.inventory?.quantity ?? 0),
        threshold: Number(product.inventory?.lowStockThreshold ?? 5),
        categoryName: product.category?.name ?? null
      }));

    const saleRows = await db.select().from(sales).orderBy(desc(sales.sale_date)).limit(5000);
    const saleItemRows = await db.select().from(saleItems).limit(10000);

    const todaySales = saleRows.filter((sale: any) =>
      isWithin(new Date(sale.sale_date), today.start, today.end)
    );
    const yesterdaySales = saleRows.filter((sale: any) =>
      isWithin(new Date(sale.sale_date), yesterday.start, yesterday.end)
    );

    const todaySaleAmount = todaySales.reduce(
      (sum: number, sale: any) => sum + toNumber(sale.totalAmount),
      0
    );
    const yesterdaySaleAmount = yesterdaySales.reduce(
      (sum: number, sale: any) => sum + toNumber(sale.totalAmount),
      0
    );
    const todayChangePercent =
      yesterdaySaleAmount > 0
        ? Math.round(((todaySaleAmount - yesterdaySaleAmount) / yesterdaySaleAmount) * 100)
        : todaySaleAmount > 0
          ? 100
          : 0;

    const monthlyPerformance = Array.from({ length: 12 }, (_, index) => ({
      label: new Date(currentYear, index, 1).toLocaleString("en", { month: "short" }),
      revenue: 0,
      orders: 0
    }));

    const yearLabels = Array.from({ length: 5 }, (_, index) => currentYear - 4 + index);
    const yearlyPerformance = yearLabels.map((year) => ({
      label: String(year),
      revenue: 0,
      orders: 0
    }));

    for (const sale of saleRows as any[]) {
      const saleDate = new Date(sale.sale_date);
      const amount = toNumber(sale.totalAmount);

      if (saleDate.getFullYear() === currentYear) {
        const monthBucket = monthlyPerformance[saleDate.getMonth()];
        if (monthBucket) {
          monthBucket.revenue += amount;
          monthBucket.orders += 1;
        }
      }

      const yearBucket = yearlyPerformance.find((bucket) => Number(bucket.label) === saleDate.getFullYear());
      if (yearBucket) {
        yearBucket.revenue += amount;
        yearBucket.orders += 1;
      }
    }

    const saleItemsBySale = new Map<string, any[]>();
    const topProductMap = new Map<string, { id: string; name: string; quantity: number; revenue: number }>();

    for (const item of saleItemRows as any[]) {
      const itemsForSale = saleItemsBySale.get(item.saleId) ?? [];
      itemsForSale.push(item);
      saleItemsBySale.set(item.saleId, itemsForSale);

      const product = productMap.get(item.productId) as any;
      const existing = topProductMap.get(item.productId) ?? {
        id: item.productId,
        name: product?.name ?? "Unknown product",
        quantity: 0,
        revenue: 0
      };
      existing.quantity += Number(item.quantity ?? 0);
      existing.revenue += Number(item.quantity ?? 0) * toNumber(item.sellingPrice);
      topProductMap.set(item.productId, existing);
    }

    const topProducts = Array.from(topProductMap.values())
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5);

    const recentSales = saleRows.slice(0, 8).map((sale: any) => {
      const items = saleItemsBySale.get(sale.id) ?? [];
      const names = items
        .map((item: any) => (productMap.get(item.productId) as any)?.name)
        .filter(Boolean);

      return {
        id: sale.id,
        invoice: `INV-${String(sale.id).slice(0, 8).toUpperCase()}`,
        customerName: sale.customerName,
        productSummary: names.length > 0 ? names.slice(0, 2).join(", ") : "No items",
        itemCount: items.reduce((sum: number, item: any) => sum + Number(item.quantity ?? 0), 0),
        amount: toNumber(sale.totalAmount),
        date: sale.sale_date
      };
    });

    const recentPurchaseRows = await db.select().from(purchases).orderBy(desc(purchases.purchaseDate)).limit(6);
    const recentPurchaseIds = recentPurchaseRows.map((purchase: any) => purchase.id);
    const recentPurchaseItems =
      recentPurchaseIds.length > 0
        ? await db.select().from(purchaseItems).where(inArray(purchaseItems.purchaseId, recentPurchaseIds))
        : [];
    const recentSupplierIds = recentPurchaseRows.map((purchase: any) => purchase.supplierId);
    const recentSuppliers =
      recentSupplierIds.length > 0
        ? await db.select().from(suppliers).where(inArray(suppliers.id, recentSupplierIds))
        : [];
    const supplierMap = new Map(recentSuppliers.map((supplier: any) => [supplier.id, supplier]));
    const purchaseItemsByPurchase = new Map<string, any[]>();

    for (const item of recentPurchaseItems as any[]) {
      const itemsForPurchase = purchaseItemsByPurchase.get(item.purchaseId) ?? [];
      itemsForPurchase.push(item);
      purchaseItemsByPurchase.set(item.purchaseId, itemsForPurchase);
    }

    const recentPurchases = recentPurchaseRows.map((purchase: any) => {
      const items = purchaseItemsByPurchase.get(purchase.id) ?? [];
      const quantity = items.reduce((sum: number, item: any) => sum + Number(item.quantity ?? 0), 0);
      const firstProduct = items.length > 0 ? (productMap.get(items[0].productId) as any) : null;

      return {
        id: purchase.id,
        purchaseNo: `PO-${String(purchase.id).slice(0, 8).toUpperCase()}`,
        supplierName: (supplierMap.get(purchase.supplierId) as any)?.name ?? "Unknown supplier",
        itemSummary:
          items.length > 1
            ? `${quantity} items`
            : firstProduct
              ? `${quantity} ${firstProduct.name}`
              : `${quantity} items`,
        amount: toNumber(purchase.totalAmount),
        date: purchase.purchaseDate
      };
    });

    return res.status(200).json({
      generatedAt: now.toISOString(),
      stats: {
        totalItems,
        totalProducts: productDetails.length,
        totalCategories: categoryIds.size,
        stockValue: Number(stockValue.toFixed(2)),
        todaySales: Number(todaySaleAmount.toFixed(2)),
        todayOrders: todaySales.length,
        todayChangePercent,
        lowStockCount: lowStockProductDetails.length
      },
      salesPerformance: {
        monthly: monthlyPerformance.map((bucket) => ({ ...bucket, revenue: Number(bucket.revenue.toFixed(2)) })),
        yearly: yearlyPerformance.map((bucket) => ({ ...bucket, revenue: Number(bucket.revenue.toFixed(2)) }))
      },
      topProducts,
      recentSales,
      lowStockProducts,
      recentPurchases
    });
  } catch (error) {
    console.error("Failed to build dashboard data", error);
    return res.status(500).json({ message: "Failed to fetch dashboard data" });
  }
};
