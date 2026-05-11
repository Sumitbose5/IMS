import express from "express";
import { uploadPoster } from "../services/uploadPoster";
import { upload } from "../middleware/multer";
const router = express.Router();

router.post('/upload', upload.array('images', 4), uploadPoster);
import { createSupplier } from "../controllers/supplierController";
import { listSuppliers } from "../controllers/supplierController";
import { createPurchase, listPurchases, getPurchaseDetails, listDebtors, getDebtorDetails, updatePurchase } from "../controllers/purchaseController";
import { getDashboardData } from "../controllers/dashboardController";

// Supplier endpoints
router.post('/suppliers', createSupplier);
router.get('/suppliers', listSuppliers);

// Purchases endpoints
router.post('/purchases', upload.any(), createPurchase);
router.get('/purchases', listPurchases);
router.get('/purchases/:id', getPurchaseDetails);
router.put('/purchases/:id', upload.any(), updatePurchase);

// Debtors
router.get('/debtors', listDebtors);
router.get('/debtors/:supplierId', getDebtorDetails);

// Dashboard endpoint
router.get('/dashboard', getDashboardData);

export default router;
