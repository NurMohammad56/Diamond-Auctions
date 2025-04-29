import express from 'express';
const router = express.Router();

import {getBillings, createBilling, getBillingById, updateBilling, deleteBilling} from '../controllers/billing.controllers.js';
import { verifyJWT } from '../middlewares/auth.middlewares.js';
router.post('/create', verifyJWT, createBilling);
router.get('/get',verifyJWT, getBillings);
router.get('/get/:id',verifyJWT, getBillingById);
router.put('/update/:id',verifyJWT, updateBilling);
router.delete('/delete/:id',verifyJWT, deleteBilling);

export default router;