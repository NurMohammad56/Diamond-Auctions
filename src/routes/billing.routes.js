import express from 'express';
const router = express.Router();

import {getBillings, createBilling} from '../controllers/billing.controllers.js';
router.post('/create', createBilling);
router.get('/get', getBillings);

export default router;