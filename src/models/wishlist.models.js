import mongoose, { Schema } from 'mongoose';

const wishlistSchema = new Schema({
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  auctions: [{
    type: Schema.Types.ObjectId,
    ref: 'Auction',
    required: true
  }],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update updatedAt on save
wishlistSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  next();
});

// Ensure auctions array contains unique entries
wishlistSchema.path('auctions').validate(function (auctions) {
  return auctions.length === new Set(auctions.map(String)).size;
}, 'Duplicate auctions are not allowed in the wishlist.');

// Index for efficient queries
wishlistSchema.index({ user: 1 });

export const Wishlist = mongoose.model('Wishlist', wishlistSchema);