import express from "express";
import { payment } from '../controllers/payment.controllers.js'

const router = express.Router()

router.post('/payment-intent', payment)

export default router