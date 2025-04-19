import express from 'express';
import {
  createCategory,
  updateCategory,
  deleteCategory,
  getAllCategories,
  getCategoriesWithAuctions
} from '../controllers/category.controllers.js';
import { verifyJWT} from '../middlewares/auth.middlewares.js';
import { isAdmin } from '../middlewares/role.middlewares.js'
import upload from '../middlewares/multer.middlewares.js';

const router = express.Router();

// Admin-only routes
router.post('/', verifyJWT, isAdmin, upload.single('image'), createCategory); 
router.put('/update/:categoryId', verifyJWT, isAdmin, upload.single('image'), updateCategory); 
router.delete('/delate/:categoryId', verifyJWT, isAdmin, deleteCategory); 

// Public route (for sellers and others)
router.get('/all', getAllCategories); 
router.get('/with-auctions', getCategoriesWithAuctions);

export default router;