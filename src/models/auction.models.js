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
  status: { type: String, enum: ['pending', 'scheduled', 'live', 'completed', 'cancelled'], default: 'pending' },
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


auctionSchema.pre('save', async function (next) {
  if (this.isNew) {
    let isUnique = false;
    let generatedSku;

    while (!isUnique) {
      // Generate random 5-digit number (10000-99999)
      const randomNum = Math.floor(10000 + Math.random() * 90000);
      generatedSku = `RDR${randomNum}`;

      // Check if SKU exists
      const existingAuction = await this.constructor.findOne({ sku: generatedSku });
      if (!existingAuction) {
        isUnique = true;
      }
    }

    this.sku = generatedSku;
  }
  next();
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