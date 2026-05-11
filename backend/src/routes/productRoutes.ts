import express from "express";
import { addCategory, getAllCategories } from "../controllers/categoryController";
import { addProduct, getProductsPageData, updateProduct, searchProducts, getProductDetails } from "../controllers/productController";
import { upload } from "../middleware/multer";
const router = express.Router();


router.post("/add-category", addCategory);
router.get("/getall-categories", getAllCategories);

router.post("/add", upload.single('image'), addProduct);
// update accepts multipart (optional image)
router.post("/update/:id", upload.single('image'), updateProduct);
router.get("/get-page-data", getProductsPageData);
router.get("/search", searchProducts);

// specific routes above; place wildcard id route last to avoid conflicts
router.get('/:id', getProductDetails);

export default router;