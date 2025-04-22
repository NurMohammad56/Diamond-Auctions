import Stripe from 'stripe'
import {PaymentInfo} from '../models/paymentInfo.models.js'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

export const payment = async (req, res) => {
  const { userId, auctionId, price } = req.body
  if (!userId || !auctionId || !price) {
    res.status(400).json({ success: false, message: 'All field are require.' })
    return
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
      success_url: process.env.SUCCESS_URL,
      cancel_url: process.env.CANCEL_URL,
    })

    // save the payment data
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


