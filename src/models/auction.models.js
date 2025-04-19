import mongoose, { Schema } from "mongoose";

const auctionSchema = new Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: String,
  category: {
    type: Schema.Types.ObjectId,
    ref: 'Category',
    required: true
  },
  caratWeight: {
    type: Number,
    required: true
  },
  startingBid: {
    type: Number,
    required: true
  },
  currentBid: {
    type: Number,
    default: 0
  },
  bidIncrement: {
    type: Number,
    required: true
  },
  reservePrice: {
    type: Number,
    required: true
  },
  reserveMet: {
    type: Boolean,
    default: false
  },
  status: {
    type: String,
    enum: ['upcoming', 'live', 'completed', 'latest'],
    default: 'upcoming'
  },
  winner: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  bidCount: {
    type: Number,
    default: 0
  },
  startTime: Date,
  endTime: Date,
  seller: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  approved: {
    type: Boolean,
    default: false
  },
  sku: {
    type: String,
    unique: true,
    required: true
  },
  bidHistoryVisibility: {
    type: String,
    enum: ['public', 'private'],
    default: 'public'
  },
  requiresVerification: {
    type: Boolean,
    default: false
  },
  images: [{
    type: String
  }],
  createdAt: {
    type: Date,
    default: Date.now
  }
});

auctionSchema.virtual('bids', {
  ref: 'Bid',
  foreignField: 'auction',
  localField: '_id'
});

auctionSchema.index({
  title: 'text',
  description: 'text'
});

export const Auction = mongoose.model('Auction', auctionSchema);