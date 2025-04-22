import express from 'express'
import {
  payment,
  updatePaymentStatus,
} from '../controllers/payment.controllers.js'

const router = express.Router()

router.post('/payment-intent', payment)

router.get('/payment/status-check', updatePaymentStatus)

export default router
