import mongoose, {Schema} from "mongoose";

const auctionSchema = new Schema({
  title: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    required: true,
  },
  category: {
    type: String,
    required: true,
    enum: ['round', 'princess', 'emerald', 'asscher', "oval", "marquise"],
  },
  caratWeight: {
    type: String,
  },
  startingBid: {
    type: Number,
    required: true,
    min: 0,
  },
  currentBid: {
    type: Number,
    default: 0,
  },
  bidIncrement: {
    type: Number,
    required: true,
    min: 1,
  },
  reservePrice: {
    type: Number,
    default: false,    
  },
  reserveMet: {
    type: Boolean,
    default: false,
  },
  images: [String],
  startTime: {
    type: Date,
    default: Date.now,
  },
  endTime: {
    type: Date,
    required: true,
  },
  seller: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  approved: {
    type: Boolean,
    default: false,
  },
  status: {
    type: String,
    enum: ['upcoming', 'live', 'completed', "latest", "popular", "highest bidding"],
    default: 'upcoming',
  },
  sku: {
    type: String,
    unique: true,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Virtual populate bids
auctionSchema.virtual('bids', {
  ref: 'Bid',
  foreignField: 'auction',
  localField: '_id',
});

export const Auction = mongoose.model('Auction', auctionSchema);
