import { Request, Response } from "express";
import { eq, desc, and, gte, lt, inArray } from "drizzle-orm";
import jwt from "jsonwebtoken";
import puppeteer from "puppeteer";
import type { Browser } from "puppeteer";
import * as QRCode from "qrcode";
import { db } from "../config/db";
import { products, inventory, sales, saleItems, stockTransactions, users } from "../drizzle/schema";

const JWT_SECRET = process.env.JWT_SECRET || "supersecret";
const BUSINESS_INFO = {
  name: "Universal Infotech",
  phone: "9876543210",
  email: "xyz@mail.com"
};

type ValidatedSaleItem = {
  productId: string;
  quantity: number;
  sellingPrice: number;
};

const toMoney = (value: number) => Number(value || 0).toFixed(2);

const resolvePaymentStatus = (
  dueAmount: number,
  requestedStatus: "pending" | "completed" | "failed" = "pending"
) => dueAmount > 0 ? "pending" : requestedStatus;

const normalizeSaleItems = (items: any[]): ValidatedSaleItem[] => {
  const itemMap = new Map<string, ValidatedSaleItem>();

  for (const item of items) {
    const productId = String(item.productId || "");
    const quantity = Number(item.quantity || 0);
    const sellingPrice = Number(item.sellingPrice || 0);

    if (!productId) {
      throw new Error("Product is required for each sale item");
    }

    if (!Number.isFinite(quantity) || quantity <= 0) {
      throw new Error("Sale item quantity must be greater than zero");
    }

    if (!Number.isFinite(sellingPrice) || sellingPrice < 0) {
      throw new Error("Selling price cannot be negative");
    }

    const existing = itemMap.get(productId);
    if (existing) {
      existing.quantity += quantity;
      existing.sellingPrice = sellingPrice;
    } else {
      itemMap.set(productId, { productId, quantity, sellingPrice });
    }
  }

  return Array.from(itemMap.values());
};

const getQuantityMap = (items: { productId: string; quantity: number }[]) => {
  const quantityMap = new Map<string, number>();

  for (const item of items) {
    quantityMap.set(item.productId, (quantityMap.get(item.productId) || 0) + Number(item.quantity || 0));
  }

  return quantityMap;
};

const escapeHtml = (value: unknown) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

const formatCurrency = (value: unknown) =>
  `₹${Number(value || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

const formatDate = (value: unknown) => {
  const date = new Date(value as any);
  if (Number.isNaN(date.getTime())) return "-";

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });
};

const getSaleReportDetails = async (saleId: string) => {
  const [saleRow] = await db.select().from(sales).where(eq(sales.id, saleId)).execute();

  if (!saleRow) {
    return null;
  }

  const items = await db.select().from(saleItems).where(eq(saleItems.saleId, saleId)).execute();
  const productIds = items.map((item: any) => item.productId);
  const productsMap = new Map<string, any>();

  if (productIds.length > 0) {
    const productRows = await db.select().from(products).where(inArray(products.id, productIds)).execute();
    for (const product of productRows) {
      productsMap.set(product.id, product);
    }
  }

  let subtotal = 0;
  const enrichedItems = items.map((item: any) => {
    const product = productsMap.get(item.productId) || null;
    const sellingPrice = Number(item.sellingPrice || 0);
    const totalPrice = Number((sellingPrice * Number(item.quantity || 0)).toFixed(2));
    subtotal += totalPrice;

    return {
      ...item,
      sellingPrice,
      totalPrice,
      product: product
        ? {
          id: product.id,
          name: product.name,
          sku: product.sku,
          barcode: product.barcode,
          image: product.image
        }
        : null
    };
  });

  return {
    sale: { ...saleRow, subtotal },
    items: enrichedItems
  };
};

const buildSaleReportHtml = (details: any, qrDataUrl: string) => {
  const sale = details.sale;

  const paymentStatus =
    String(sale.paymentStatus || "pending").toLowerCase();

  const paymentStatusClass =
    paymentStatus === "paid" ? "status paid" : "status pending";

  const rows = details.items
    .map(
      (item: any, index: number) => `
      <tr>
        <td>${index + 1}</td>

        <td>
          <strong>${escapeHtml(
            item.product?.name || item.productId
          )}</strong>

        </td>

        <td>${Number(item.quantity || 0)}</td>

        <td>${formatCurrency(item.sellingPrice)}</td>

        <td>${formatCurrency(item.totalPrice)}</td>
      </tr>
    `
    )
    .join("");

  return `
  <!doctype html>
  <html>
    <head>
      <meta charset="utf-8" />

      <style>
        * {
          box-sizing: border-box;
        }

        body {
          margin: 0;
          color: #0f172a;
          font-family: Inter, Arial, Helvetica, sans-serif;
          background: #f1f5f9;
        }

        .page {
          padding: 14px;
        }

        .sheet {
          background: #ffffff;
          border-radius: 14px;
          overflow: hidden;
          border: 1px solid #e2e8f0;
        }

        /* ================= HEADER ================= */

        .header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 20px;
          padding: 22px 24px;
          background: linear-gradient(135deg, #1e293b, #0f172a);
          color: white;
        }

        .brand h1 {
          margin: 0 0 6px;
          font-size: 24px;
          font-weight: 700;
          letter-spacing: 0.3px;
        }

        .brand p {
          margin: 2px 0;
          font-size: 12px;
          color: #cbd5e1;
        }

        .meta {
          text-align: right;
        }

        .meta h2 {
          margin: 0 0 8px;
          font-size: 13px;
          font-weight: 700;
          letter-spacing: 2px;
          text-transform: uppercase;
          color: #cbd5e1;
        }

        .meta p {
          margin: 4px 0;
          font-size: 12px;
          color: #e2e8f0;
        }

        .status {
          display: inline-block;
          margin-bottom: 10px;
          padding: 6px 10px;
          border-radius: 999px;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 1px;
          text-transform: uppercase;
        }

        .status.paid {
          background: rgba(34, 197, 94, 0.15);
          color: #4ade80;
        }

        .status.pending {
          background: rgba(251, 191, 36, 0.15);
          color: #facc15;
        }

        /* ================= SECTIONS ================= */

        .section {
          padding: 18px 24px;
          border-bottom: 1px solid #f1f5f9;
        }

        .grid {
          display: grid;
          grid-template-columns: 1.3fr 0.7fr;
          gap: 16px;
          align-items: start;
        }

        /* ================= CARDS ================= */

        .card {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 10px;
          padding: 14px;
        }

        .label {
          margin: 0 0 6px;
          color: #64748b;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 1.2px;
          text-transform: uppercase;
        }

        .value {
          margin: 0;
          font-size: 15px;
          font-weight: 700;
          color: #0f172a;
        }

        .muted {
          margin-top: 4px;
          color: #64748b;
          font-size: 12px;
        }

        /* ================= TABLE ================= */

        table {
          width: 100%;
          border-collapse: collapse;
          table-layout: fixed;
        }

        thead {
          background: #f8fafc;
        }

        th {
          padding: 10px 12px;
          color: #64748b;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 1px;
          text-transform: uppercase;
          text-align: left;
          border-bottom: 1px solid #e2e8f0;
        }

        td {
          padding: 12px;
          font-size: 13px;
          border-bottom: 1px solid #f1f5f9;
          vertical-align: top;
        }

        tbody tr:nth-child(even) {
          background: #fcfcfd;
        }

        td strong {
          display: block;
          font-size: 13px;
          color: #111827;
        }

        td span {
          display: block;
          margin-top: 3px;
          color: #64748b;
          font-size: 11px;
        }

        th:nth-child(1),
        td:nth-child(1) {
          width: 50px;
        }

        th:nth-child(3),
        th:nth-child(4),
        th:nth-child(5),
        td:nth-child(3),
        td:nth-child(4),
        td:nth-child(5) {
          text-align: right;
        }

        /* ================= QR ================= */

        .qr {
          display: flex;
          align-items: center;
          gap: 14px;
        }

        .qr img {
          width: 92px;
          height: 92px;
          border-radius: 10px;
          border: 1px solid #e2e8f0;
          padding: 6px;
          background: white;
        }

        .qr .value {
          font-size: 14px;
        }

        /* ================= TOTALS ================= */

        .totals {
          margin-left: auto;
          width: 280px;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          padding: 14px 16px;
        }

        .total-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 7px 0;
          font-size: 13px;
        }

        .total-row span {
          color: #475569;
        }

        .total-row strong {
          color: #0f172a;
        }

        .grand {
          margin-top: 8px;
          padding-top: 12px;
          border-top: 1px dashed #cbd5e1;
          font-size: 17px;
          font-weight: 800;
        }

        .grand strong,
        .grand span {
          color: #020617;
        }

        /* Simplified final-total styling to avoid overlap and negative margins */
        .final-total {
          background: #e2e8f0;
          padding: 12px 16px;
          border-radius: 10px;
          margin-top: 10px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        /* Ensure Paid/Due rows are clearly separated */
        .total-row + .total-row {
          margin-top: 8px;
        }

        /* ================= FOOTER ================= */

        .footer {
          padding: 14px 24px;
          font-size: 11px;
          color: #64748b;
          background: #f8fafc;
        }
      </style>
    </head>

    <body>
      <div class="page">
        <div class="sheet">

          <!-- HEADER -->

          <div class="header">
            <div class="brand">
              <h1>${BUSINESS_INFO.name}</h1>

              <p>
                Phone: ${BUSINESS_INFO.phone}
              </p>

              <p>
                Email: ${BUSINESS_INFO.email}
              </p>
            </div>

            <div class="meta">

              <div class="${paymentStatusClass}">
                ${paymentStatus}
              </div>

              <h2>Sales Invoice</h2>

              <p>
                Invoice:
                INV-${escapeHtml(
                  String(sale.id).slice(0, 8).toUpperCase()
                )}
              </p>

              <p>
                Date:
                ${formatDate(sale.sale_date)}
              </p>
            </div>
          </div>

          <!-- CUSTOMER + PAYMENT -->

          <div class="section grid">

            <div class="card">
              <p class="label">Customer</p>

              <p class="value">
                ${escapeHtml(sale.customerName || "Walk-in Customer")}
              </p>

              <p class="muted">
                ${escapeHtml(
                  sale.customerPhone || "No phone number provided"
                )}
              </p>
            </div>

            <div class="card">
              <p class="label">Payment Method</p>

              <p class="value">
                ${escapeHtml(
                  (sale.paymentMethod || "cash").replace("_", " ")
                ).toUpperCase()}
              </p>

              <p class="muted">
                ${paymentStatus.toUpperCase()}
              </p>
            </div>
          </div>

          <!-- TABLE -->

          <div class="section">
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Product</th>
                  <th>Qty</th>
                  <th>Rate</th>
                  <th>Amount</th>
                </tr>
              </thead>

              <tbody>
                ${rows}
              </tbody>
            </table>
          </div>

          <!-- QR + TOTALS -->

          <div class="section grid">

            <div class="qr">
              <img src="${qrDataUrl}" />

              <div>
                <p class="label">
                  Secure QR Verification
                </p>

                <p class="value">
                  Scan to verify invoice
                </p>

                <p class="muted">
                  Scan to verify this invoice securely.
                </p>
              </div>
            </div>

            <div class="totals">

              <div class="total-row">
                <span>Subtotal</span>
                <strong>${formatCurrency(sale.subtotal)}</strong>
              </div>

              <div class="total-row">
                <span>CGST</span>
                <strong>${formatCurrency(sale.cgst)}</strong>
              </div>

              <div class="total-row">
                <span>SGST</span>
                <strong>${formatCurrency(sale.sgst)}</strong>
              </div>

              <div class="total-row">
                <span>Other Charges</span>
                <strong>${formatCurrency(sale.extraCharges)}</strong>
              </div>

              <div class="total-row">
                <span>Discount</span>
                <strong>
                  - ${formatCurrency(sale.discount)}
                </strong>
              </div>

              <div class="final-total">
                <div>
                  <div class="muted">Total</div>
                  <div class="value">${formatCurrency(sale.totalAmount)}</div>
                </div>
                <div style="text-align:right">
                  <div class="muted">Paid</div>
                  <div class="value">${formatCurrency(sale.paid_amount)}</div>
                </div>
              </div>

              <div style="margin-top:12px">
                <div class="total-row">
                  <span>Due</span>
                  <strong>${formatCurrency(sale.due_amount)}</strong>
                </div>
              </div>

            </div>
          </div>

          <!-- FOOTER -->

          <div class="footer">
            This is a computer-generated invoice and is valid after QR verification.
          </div>

        </div>
      </div>
    </body>
  </html>
  `;
};

export const createSale = async (
  req: Request,
  res: Response
) => {

  try {

    const {
      items,
      userId: bodyUserId,
      customerName,
      customerPhone,
      cgst = 0,
      sgst = 0,
      extraCharges = 0,
      discount = 0,
      paid_amount = 0,
      due_amount = 0,
      paymentMethod = 'cash',
      paymentStatus = 'pending',
      sale_date
    } = req.body;


  // prefer authenticated user if available
    const authUserId = (req as any).user?.userId;
    const userId = bodyUserId || authUserId || null;

    console.log('Resolved userId:', userId);

    if (!userId) {
      return res.status(401).json({ message: 'User authentication required to create a sale' });
    }

    if (
      !items ||
      !items.length
    ) {
      return res
        .status(400)
        .json({
          message:
            "No sale items provided"
        });
    }


    await db.transaction(
      async (tx) => {

  let subtotal = 0;

        const validatedItems =
          [];



/*
---------------------------
STEP 1
Validate inventory
Calculate totals
---------------------------
*/

        for (const item of items) {

          // find product
          const [product] = await tx
            .select()
            .from(products)
            .where(eq(products.id, item.productId));

          if (!product) {
            throw new Error("Product not found");
          }

          // find inventory
          const [stock] = await tx
            .select()
            .from(inventory)
            .where(eq(inventory.productId, item.productId));

          if (!stock) {
            throw new Error("Inventory missing");
          }

          if (stock.quantity < item.quantity) {
            throw new Error(`Insufficient stock for ${product.name}`);
          }

          const sellingPrice = item.sellingPrice !== undefined && item.sellingPrice !== null ? Number(item.sellingPrice) : (product.costPrice ? Number(product.costPrice) : 0);
          const itemTotal = sellingPrice * Number(item.quantity);
          subtotal += itemTotal;

          // determine customer name (allow per-item override, then request-level, then fallback)
          const customerName =
            item.customerName || (req.body && (req.body.customerName as string)) || "Walk-in";

          validatedItems.push({
            productId: item.productId,
            quantity: Number(item.quantity),
            sellingPrice: sellingPrice,
            customerName
          });
        }



/*
---------------------------
STEP 2
Create sale record
---------------------------
*/

        // compute overall totals
        const cgstNum = Number(cgst || 0);
        const sgstNum = Number(sgst || 0);
        const extraNum = Number(extraCharges || 0);
        const discountNum = Number(discount || 0);
        const totalAmount = Number((subtotal + cgstNum + sgstNum + extraNum - discountNum).toFixed(2));
        const paidAmountNum = Number(paid_amount || 0);
        const dueAmountNum = Math.max(0, Number((totalAmount - paidAmountNum).toFixed(2)));
        const finalPaymentStatus = resolvePaymentStatus(dueAmountNum, paymentStatus);

        const [newSale] = await tx.insert(sales).values({
          customerName: (customerName || 'Walk-in') as string,
          customerPhone: customerPhone || null,
          totalAmount: toMoney(totalAmount),
          cgst: toMoney(cgstNum),
          sgst: toMoney(sgstNum),
          extraCharges: toMoney(extraNum),
          discount: toMoney(discountNum),
          paid_amount: toMoney(paidAmountNum),
          due_amount: toMoney(dueAmountNum),
          paymentMethod: paymentMethod,
          paymentStatus: finalPaymentStatus,
          createdBy: userId,
          sale_date: sale_date ? new Date(sale_date) : new Date()
        }).returning();

        if (!newSale) {
          throw new Error("Failed to create sale record");
        }



/*
---------------------------
STEP 3
Process each item
---------------------------
*/

        for (
          const item of
          validatedItems
        ) {


/*
create sale item
*/

          await tx.insert(saleItems).values({
            saleId: newSale.id,
            productId: item.productId,
            quantity: Number(item.quantity),
            sellingPrice: String(item.sellingPrice !== undefined && item.sellingPrice !== null ? item.sellingPrice : item.sellingPrice)
          });



/*
deduct inventory
*/

          const [stockAfter] = await tx
            .select()
            .from(inventory)
            .where(eq(inventory.productId, item.productId));

          if (!stockAfter) {
            throw new Error("Inventory row missing during update");
          }

          await tx.update(inventory).set({
            quantity: stockAfter.quantity - item.quantity,
            updatedAt: new Date()
          }).where(eq(inventory.productId, item.productId));



/*
create stock log
*/

          await tx
            .insert(
              stockTransactions
            )
            .values({
              productId:
                item.productId,

              type: "sale",

              quantity:
                item.quantity,

              referenceId: newSale.id
            });

        }

      }
    );


    return res
      .status(201)
      .json({
        message:
          "Sale completed successfully"
      });

  }

  catch (err) {
    console.error(err);

    const message = err instanceof Error ? err.message : "Sale failed";

    return res.status(500).json({ message });
  }

};

export const updateSale = async (req: Request, res: Response) => {
  try {
    const { id } = req.params as { id: string };
    const {
      items,
      customerName,
      customerPhone,
      cgst = 0,
      sgst = 0,
      extraCharges = 0,
      discount = 0,
      paid_amount = 0,
      paymentMethod = "cash",
      paymentStatus = "pending",
      sale_date
    } = req.body;

    if (!id) {
      return res.status(400).json({ message: "Sale id is required" });
    }

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: "At least one sale item is required" });
    }

    const updatedSale = await db.transaction(async (tx) => {
      const [saleRow] = await tx.select().from(sales).where(eq(sales.id, id));

      if (!saleRow) {
        throw new Error("Sale not found");
      }

      const validatedItems = normalizeSaleItems(items);
      const existingItems = await tx.select().from(saleItems).where(eq(saleItems.saleId, id));
      const oldQuantityMap = getQuantityMap(existingItems);
      const newQuantityMap = getQuantityMap(validatedItems);
      const productIds = Array.from(new Set([
        ...Array.from(oldQuantityMap.keys()),
        ...Array.from(newQuantityMap.keys())
      ]));

      if (productIds.length === 0) {
        throw new Error("At least one sale item is required");
      }

      const productRows = await tx.select().from(products).where(inArray(products.id, productIds));
      const productMap = new Map(productRows.map((product: any) => [product.id, product]));

      const inventoryRows = await tx.select().from(inventory).where(inArray(inventory.productId, productIds));
      const inventoryMap = new Map(inventoryRows.map((stock: any) => [stock.productId, stock]));

      for (const item of validatedItems) {
        const product = productMap.get(item.productId) as any;
        if (!product) {
          throw new Error("Product not found");
        }

        const stock = inventoryMap.get(item.productId) as any;
        if (!stock) {
          throw new Error(`Inventory missing for ${product.name}`);
        }
      }

      for (const productId of productIds) {
        const oldQuantity = oldQuantityMap.get(productId) || 0;
        const newQuantity = newQuantityMap.get(productId) || 0;
        const soldQuantityDelta = newQuantity - oldQuantity;

        if (soldQuantityDelta > 0) {
          const stock = inventoryMap.get(productId) as any;
          const product = productMap.get(productId) as any;

          if (!stock) {
            throw new Error(`Inventory missing for ${product?.name || "selected product"}`);
          }

          if (Number(stock.quantity || 0) < soldQuantityDelta) {
            throw new Error(`Insufficient stock for ${product?.name || "selected product"}`);
          }
        }
      }

      const subtotal = validatedItems.reduce(
        (sum, item) => sum + item.quantity * item.sellingPrice,
        0
      );
      const cgstNum = Number(cgst || 0);
      const sgstNum = Number(sgst || 0);
      const extraNum = Number(extraCharges || 0);
      const discountNum = Number(discount || 0);
      const paidAmountNum = Number(paid_amount || 0);
      const totalAmount = Number((subtotal + cgstNum + sgstNum + extraNum - discountNum).toFixed(2));
      const dueAmountNum = Math.max(0, Number((totalAmount - paidAmountNum).toFixed(2)));
      const finalPaymentStatus = resolvePaymentStatus(dueAmountNum, paymentStatus);

      const [savedSale] = await tx
        .update(sales)
        .set({
          customerName: customerName || "Walk-in",
          customerPhone: customerPhone || null,
          totalAmount: toMoney(totalAmount),
          cgst: toMoney(cgstNum),
          sgst: toMoney(sgstNum),
          extraCharges: toMoney(extraNum),
          discount: toMoney(discountNum),
          paid_amount: toMoney(paidAmountNum),
          due_amount: toMoney(dueAmountNum),
          paymentMethod,
          paymentStatus: finalPaymentStatus,
          sale_date: sale_date ? new Date(sale_date) : saleRow.sale_date
        })
        .where(eq(sales.id, id))
        .returning();

      await tx.delete(saleItems).where(eq(saleItems.saleId, id));

      await tx.insert(saleItems).values(validatedItems.map((item) => ({
        saleId: id,
        productId: item.productId,
        quantity: item.quantity,
        sellingPrice: toMoney(item.sellingPrice)
      })));

      const stockLogs = [];

      for (const productId of productIds) {
        const oldQuantity = oldQuantityMap.get(productId) || 0;
        const newQuantity = newQuantityMap.get(productId) || 0;
        const soldQuantityDelta = newQuantity - oldQuantity;

        if (soldQuantityDelta === 0) continue;

        const stock = inventoryMap.get(productId) as any;

        if (!stock) {
          throw new Error("Inventory row missing during sale update");
        }

        await tx
          .update(inventory)
          .set({
            quantity: Number(stock.quantity || 0) - soldQuantityDelta,
            updatedAt: new Date()
          })
          .where(eq(inventory.productId, productId));

        stockLogs.push({
          productId,
          type: "adjustment" as const,
          quantity: -soldQuantityDelta,
          referenceId: id
        });
      }

      if (stockLogs.length > 0) {
        await tx.insert(stockTransactions).values(stockLogs);
      }

      return savedSale;
    });

    return res.status(200).json({
      message: "Sale updated successfully",
      sale: updatedSale
    });
  } catch (err) {
    console.error(err);

    const message = err instanceof Error ? err.message : "Sale update failed";
    const status = message === "Sale not found"
      ? 404
      : (
        message.includes("Insufficient stock") ||
        message.includes("Inventory missing") ||
        message.includes("Product not found") ||
        message.includes("quantity") ||
        message.includes("price")
      )
        ? 400
        : 500;

    return res.status(status).json({ message });
  }
};

export const listSales = async (req: Request, res: Response) => {
  try {
    // support query params: preset=today|week|month|year or year, month (1-12), fullYear=1
    const preset = (req.query.preset as string | undefined) || '';
    const yearStr = req.query.year as string | undefined;
    const monthStr = req.query.month as string | undefined; // 1-based
    const fullYear = req.query.fullYear === 'true' || req.query.fullYear === '1';

    const now = new Date();
    let start: Date;
    let end: Date;

    if (preset === 'today') {
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      end = new Date(start);
      end.setDate(start.getDate() + 1);
    } else if (preset === 'week') {
      // last 7 days (inclusive of today)
      end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
      start = new Date(end);
      start.setDate(end.getDate() - 7);
    } else if (preset === 'month') {
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    } else if (preset === 'year') {
      start = new Date(now.getFullYear(), 0, 1);
      end = new Date(now.getFullYear() + 1, 0, 1);
    } else if (fullYear && yearStr) {
      const y = Number(yearStr);
      start = new Date(y, 0, 1);
      end = new Date(y + 1, 0, 1);
    } else {
      const y = yearStr ? Number(yearStr) : now.getFullYear();
      const m = monthStr ? Number(monthStr) : (now.getMonth() + 1);
      start = new Date(y, (m - 1), 1);
      end = new Date(y, (m - 1) + 1, 1);
    }

    // fetch sales in range
    const list = await db
      .select()
      .from(sales)
      .where(and(gte(sales.sale_date, start), lt(sales.sale_date, end)))
      .orderBy(desc(sales.sale_date))
      .limit(1000)
      .execute();

    // compute metrics
    const totalAmount = list.reduce((s: number, p: any) => s + Number(p.totalAmount ?? 0), 0);
    const totalOrders = list.length;
    const avgOrderValue = totalOrders > 0 ? Number((totalAmount / totalOrders).toFixed(2)) : 0;

    // items sold: fetch sale items for sales in the range
    const saleIds = list.map((srow: any) => srow.id);
    let itemsSold = 0;
    let itemCountMap = new Map<string, number>();
    if (saleIds.length > 0) {
  const items = await db.select().from(saleItems).where(inArray(saleItems.saleId, saleIds)).execute();
      for (const it of items) {
        itemsSold += Number(it.quantity || 0);
        itemCountMap.set(it.saleId, (itemCountMap.get(it.saleId) || 0) + Number(it.quantity || 0));
      }
    }

    // attach item counts to sales rows
    const enriched = list.map((p: any) => ({
      ...p,
      itemCount: itemCountMap.get(p.id) || 0
    }));

    // compute outstanding incomes (due > 0) within the same range
    const outstandingList = enriched
      .filter((r: any) => {
        const due = Number(r.due_amount ?? r.dueAmount ?? r.due_amount ?? 0);
        return due > 0;
      })
      .map((r: any) => ({
        id: r.id,
        saleId: r.id,
        customerName: r.customerName || r.customer_name || 'Walk-in',
        phone: r.customerPhone || r.customer_phone || null,
        amountDue: Number(r.due_amount ?? r.dueAmount ?? r.due_amount ?? 0),
        sale_date: r.sale_date || r.saleDate || null
      }));

    const outstandingAmount = outstandingList.reduce((s: number, o: any) => s + Number(o.amountDue || 0), 0);

    res.json({
      sales: enriched,
      stats: { totalAmount, totalOrders, avgOrderValue, itemsSold, outstandingAmount },
      outstanding: outstandingList
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to list sales' });
  }
};

export const getSaleDetails = async (req: Request, res: Response) => {
  try {
    const { id } = req.params as { id: string };

    const [saleRow] = await db
      .select()
      .from(sales)
      .where(eq(sales.id, id))
      .execute();

    if (!saleRow) return res.status(404).json({ message: 'Sale not found' });

    const items = await db.select().from(saleItems).where(eq(saleItems.saleId, id)).execute();

      // fetch product details for items
      const productIds = items.map((it: any) => it.productId);
      let productsMap = new Map<string, any>();
      let inventoryMap = new Map<string, any>();
      if (productIds.length > 0) {
        const prods = await db.select().from(products).where(inArray(products.id, productIds)).execute();
        for (const p of prods) productsMap.set(p.id, p);

        const stockRows = await db.select().from(inventory).where(inArray(inventory.productId, productIds)).execute();
        for (const stock of stockRows) inventoryMap.set(stock.productId, stock);
      }

      // enrich items with product info and compute line totals
      let subtotal = 0;
      const enrichedItems = items.map((it: any) => {
        const prod = productsMap.get(it.productId) || null;
        const sellingPrice = it.sellingPrice !== undefined && it.sellingPrice !== null ? Number(it.sellingPrice) : (prod?.costPrice ? Number(prod.costPrice) : 0);
        const totalPrice = Number((sellingPrice * Number(it.quantity || 0)).toFixed(2));
        subtotal += totalPrice;
        return {
          ...it,
          product: prod ? { id: prod.id, name: prod.name, sku: prod.sku, image: prod.image, inventory: inventoryMap.get(prod.id) || null } : null,
          sellingPrice,
          totalPrice,
        };
      });

      // include subtotal in response for convenience
      const saleWithSubtotal = { ...saleRow, subtotal };

      res.json({ sale: saleWithSubtotal, items: enrichedItems });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to fetch sale details' });
  }
};

export const generateSaleReport = async (req: Request, res: Response) => {
  let browser: Browser | null = null;

  try {
    const { id } = req.params as { id: string };
    const authUser = (req as any).user as { userId: string; role: string } | undefined;

    if (!authUser?.userId) {
      return res.status(401).json({ message: "Authentication required" });
    }

    const details = await getSaleReportDetails(id);

    if (!details) {
      return res.status(404).json({ message: "Sale not found" });
    }

    const reportToken = jwt.sign(
      {
        type: "sale-report",
        saleId: id,
        generatedBy: authUser.userId
      },
      JWT_SECRET,
      { expiresIn: "30d" }
    );
    const qrPayload = JSON.stringify({
      type: "sale-report",
      token: reportToken
    });
    const qrDataUrl = await QRCode.toDataURL(qrPayload, {
      errorCorrectionLevel: "M",
      margin: 1,
      width: 260,
      color: {
        dark: "#111827",
        light: "#ffffff"
      }
    });

    browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"]
    });
    const page = await browser.newPage();
    await page.setContent(buildSaleReportHtml(details, qrDataUrl), { waitUntil: "networkidle0" });

    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: {
        top: "14mm",
        right: "12mm",
        bottom: "14mm",
        left: "12mm"
      }
    });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename="sale-${String(id).slice(0, 8)}-report.pdf"`);
    return res.send(Buffer.from(pdfBuffer));
  } catch (err) {
    console.error("Failed to generate sale report", err);
    return res.status(500).json({ message: "Failed to generate sale report" });
  } finally {
    if (browser) {
      await browser.close();
    }
  }
};

export const verifySaleReportQr = async (req: Request, res: Response) => {
  try {
    const authUser = (req as any).user as { userId: string; role: string } | undefined;
    const { qrPayload, token, userId } = req.body;

    if (!authUser?.userId) {
      return res.status(401).json({ message: "Authentication required" }); 
    }

    if (userId && String(userId) !== String(authUser.userId)) {
      return res.status(403).json({ message: "Scanned user does not match the logged-in user" });
    }

    const [userRow] = await db.select().from(users).where(eq(users.id, authUser.userId));

    if (!userRow || userRow.role !== "admin") {
      return res.status(403).json({ message: "Only admin users can verify sale report QR codes" });
    }

    let reportToken = token as string | undefined;

    if (!reportToken && qrPayload) {
      try {
        const parsed = typeof qrPayload === "string" ? JSON.parse(qrPayload) : qrPayload;
        reportToken = parsed?.token;
      } catch {
        return res.status(400).json({ message: "Invalid QR code payload" });
      }
    }

    if (!reportToken) {
      return res.status(400).json({ message: "QR verification token is required" });
    }

    const decoded = jwt.verify(reportToken, JWT_SECRET) as {
      type: string;
      saleId: string;
      generatedBy: string;
    };

    if (decoded.type !== "sale-report" || !decoded.saleId) {
      return res.status(400).json({ message: "Invalid sale report QR code" });
    }

    const details = await getSaleReportDetails(decoded.saleId);

    if (!details) {
      return res.status(404).json({ message: "Sale not found" });
    }

    return res.status(200).json({
      verified: true,
      verifiedBy: {
        id: userRow.id,
        name: userRow.name,
        email: userRow.email,
        role: userRow.role
      },
      generatedBy: decoded.generatedBy,
      business: BUSINESS_INFO,
      ...details
    });
  } catch (err) {
    console.error("Failed to verify sale report QR", err);
    const message = err instanceof Error && err.name === "TokenExpiredError"
      ? "QR code has expired"
      : "Failed to verify sale report QR";
    return res.status(400).json({ message });
  }
};
