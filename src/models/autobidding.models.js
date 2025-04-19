import mongoose, { Schema } from 'mongoose';

const autoBidSchema = new Schema({
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  auction: {
    type: Schema.Types.ObjectId,
    ref: 'Auction',
    required: true
  },
  maxAmount: {
    type: Number,
    required: true,
    min: 0
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

autoBidSchema.index({ user: 1, auction: 1 }, { unique: true });

autoBidSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  next();
});

export const AutoBid = mongoose.model('AutoBid', autoBidSchema);