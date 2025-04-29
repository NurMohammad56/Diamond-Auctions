import mongoose from 'mongoose'

const paymentInfoSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Types.ObjectId,
    ref: 'User',
  },
  auctionId: {
    type: mongoose.Types.ObjectId,
    ref: 'Auction',
  },
  price: {
    type: Number,
    require: true,
  },
  stripeSessionId: { type: String },
  paymentStatus: {
    type: String,
    enum: ['pending',"complete", 'failed'],
    default: 'pending',
  },
})

export const PaymentInfo = mongoose.model('PaymentInfo', paymentInfoSchema)
