import Stripe from 'stripe'
import { PaymentInfo } from '../models/paymentInfo.models.js'
import { Billing } from '../models/billing.models.js'
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

export const payment = async (req, res) => {
  const { userId, auctionId, price } = req.body

  if (!userId || !auctionId || !price) {
    return res
      .status(400)
      .json({ success: false, message: 'All fields are required.' })
  }

  try {
    const totalPriceInCent = price * 100

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: 'Purchase',
            },
            unit_amount: totalPriceInCent,
          },
          quantity: 1,
        },
      ],
      success_url: `${process.env.SUCCESS_URL}/{CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.CANCEL_URL}/{CHECKOUT_SESSION_ID}`,
    })

    // Save the payment data
    const newPayment = new PaymentInfo({
      userId,
      auctionId,
      price,
      stripeSessionId: session.id,
      paymentStatus: 'pending',
    })
    await newPayment.save()

    res.status(200).json({ success: true, url: session.url })
  } catch (error) {
    res.status(500).json({
      message: 'Failed to create payment session',
      error: error.message,
    })
  }
}

export const updatePaymentStatus = async (req, res) => {
  const { stripeSessionId } = req.query

  if (!stripeSessionId) {
    return res.status(400).json({
      success: false,
      message: 'stripeSessionId is required.',
    })
  }

  try {
    const session = await stripe.checkout.sessions.retrieve(stripeSessionId)

    let paymentStatus
    if (session && session.payment_status === 'paid') {
      paymentStatus = 'complete'
    } else {
      paymentStatus = 'failed'
    }

    // Update payment info
    const payment = await PaymentInfo.findOneAndUpdate(
      { stripeSessionId },
      { paymentStatus },
      { new: true }
    )

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found.',
      })
    }

    // Find and update billing info by user and auction
    const billing = await Billing.findOneAndUpdate(
      {
        user: payment.userId,
        auction: payment.auctionId,
      },
      {
        paymentStatus: paymentStatus === 'complete' ? 'paid' : 'unpaid',
      },
      { new: true }
    )

    res.status(200).json({
      success: true,
      message: `Payment marked as ${paymentStatus}.`,
      data: {
        payment,
        billing,
      },
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to update payment status',
      error: error.message,
    })
  }
}
