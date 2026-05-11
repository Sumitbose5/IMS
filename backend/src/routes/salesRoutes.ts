import express from "express";
import {
  createSale,
  listSales,
  getSaleDetails,
  updateSale,
  generateSaleReport,
  verifySaleReportQr
} from "../controllers/saleController";
import { isAuthenticated } from "../middleware/auth";

const router = express.Router();

router.post('/create', createSale);
router.get('/', listSales);
router.post('/report/verify-qr', isAuthenticated, verifySaleReportQr);
router.get('/:id/report', isAuthenticated, generateSaleReport);
router.put('/:id', updateSale);
router.get('/:id', getSaleDetails);

export default router;
