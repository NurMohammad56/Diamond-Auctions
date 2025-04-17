import { Bid } from '../models/bid.models.js';
import { Auction } from '../models/auction.models.js';

// Create a new bid
export const placeBid = async (req, res) => {
    try {
      // Find the auction
      const auction = await Auction.findById(req.params.auctionId);
  
      if (!auction) {
        return res.status(404).json({ status: false, message: 'Auction not found' });
      }
  
      // Check if auction is active
      if (auction.status !== 'live' || auction.endTime < new Date()) {
        return res.status(400).json({ status: false, message: 'Auction is not active or has ended' });
      }
  
      // Validate bid amount
      const { amount } = req.body;
      if (!amount || typeof amount !== 'number' || amount <= 0) {
        return res.status(400).json({ status: false, message: 'Invalid bid amount' });
      }
  
      // Check if bid is higher than current bid and respects bid increment
      const minimumBid = auction.currentBid
        ? auction.currentBid + auction.bidIncrement
        : auction.startingBid;
      if (amount < minimumBid) {
        return res.status(400).json({
          status: false,
          message: `Bid must be at least $${minimumBid}`
        });
      }
  
      // Create bid
      const bid = await Bid.create({
        amount,
        auction: req.params.auctionId,
        user: req.user.id,
        createdAt: new Date()
      });
  
      // Update auction atomically
      await Auction.findOneAndUpdate(
        { _id: req.params.auctionId },
        {
          $set: {
            currentBid: amount,
            reserveMet: amount >= auction.reservePrice,
          },
          $inc: { bidCount: 1 }
        },
        { new: true }
      );
  
      const populatedBid = await Bid.findById(bid._id)
        .populate('user', 'username')
        .populate('auction', 'title');
  
      return res.status(201).json({
        status: 'success',
        message: 'Bid placed successfully',
        data: populatedBid
      });
    } catch (err) {
      return res.status(400).json({ status: false, message: err.message });
    }
  };
// Get all bids for a user
export const getUserBids = async (req, res) => {
    try {
        const bids = await Bid.find({ user: req.user.id })
            .populate('auction', 'title currentBid endTime')
            .sort('-createdAt');

        return res.status(200).json({
            status: true,
            message: 'Bids retrieved successfully',
            results: bids.length,
            data: bids
        });
    } catch (err) {
        return res.status(400).json({ status: false, message: err.message });
    }
};

// Get a bid
export const getBid = async (req, res) => {
    try {
        const bid = await Bid.findById(req.params.id)
            .populate('user', 'username')
            .populate('auction', 'title');

        if (!bid) {
            return res.status(404).json({ status: false, message: 'Bid not found' });
        }

        return res.status(200).json({
            status: true,
            message: 'Bid retrieved successfully',
            data: bid
        });
    } catch (err) {
        return res.status(400).json({ status: false, message: err.message });
    }
};

// Get all bids for an auction
export const getBidsForAuction = async (req, res) => {
    try {
        const { page = 1, limit = 10 } = req.query;
        const skip = (page - 1) * limit;

        const bids = await Bid.find({ auction: req.params.auctionId })
            .populate('user', 'username')
            .sort('-createdAt')
            .skip(skip)
            .limit(parseInt(limit));

        const totalBids = await Bid.countDocuments({ auction: req.params.auctionId });

        if (!bids || bids.length === 0) {
            return res.status(404).json({ status: false, message: 'No bids found for this auction' });
        }

        return res.status(200).json({
            status: true,
            message: 'Bids retrieved successfully',
            results: bids.length,
            total: totalBids,
            currentPage: parseInt(page),
            totalPages: Math.ceil(totalBids / limit),
            data: bids
        });
    } catch (err) {
        return res.status(400).json({ status: false, message: err.message });
    }
};

// Get bids history for an auction
export const getBidsHistory = async (req, res) => {
    try {
        const { page = 1, limit = 10 } = req.query;
        const skip = (page - 1) * limit;

        const bids = await Bid.find({ auction: req.params.auctionId })
            .populate('user', 'username')
            .sort('-createdAt')
            .select('amount user createdAt isAuto startingBid currentBid bidIncrement')
            .skip(skip)
            .limit(parseInt(limit));

        const totalBids = await Bid.countDocuments({ auction: req.params.auctionId });

        if (!bids || bids.length === 0) {
            return res.status(404).json({ status: false, message: 'No bids found for this auction' });
        }

        return res.status(200).json({
            status: true,
            message: 'Bids retrieved successfully',
            results: bids.length,
            total: totalBids,
            currentPage: parseInt(page),
            totalPages: Math.ceil(totalBids / limit),
            data: bids
        });
    } catch (err) {
        return res.status(400).json({ status: false, message: err.message });
    }
};