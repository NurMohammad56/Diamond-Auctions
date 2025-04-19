import { Bid } from '../models/bid.models.js';
import { Auction } from '../models/auction.models.js';
import { AutoBid } from '../models/autobidding.models.js';
import { io } from '../../server.js';

// Helper function to process automated bids
const processAutoBids = async (auctionId, currentBid, bidIncrement, triggeringUserId = null) => {
  const auction = await Auction.findById(auctionId);
  if (!auction || auction.status !== 'live' || auction.endTime < new Date()) {
    console.log('Auto-bid processing stopped: Auction not live or ended');
    return [];
  }

  const autoBids = await AutoBid.find({ auction: auctionId })
    .sort('-maxAmount')
    .populate('user', 'username');


  let newBids = [];
  let highestBid = currentBid || auction.startingBid;

  for (const autoBid of autoBids) {
    // Only skip if triggeringUserId is provided and matches
    if (triggeringUserId && autoBid.user._id.toString() === triggeringUserId) {
      continue;
    }
    if (autoBid.maxAmount <= highestBid) {
      continue;
    }

    const nextBid = highestBid + bidIncrement;
    if (nextBid <= autoBid.maxAmount) {
      const bid = await Bid.create({
        amount: nextBid,
        auction: auctionId,
        user: autoBid.user._id,
        isAuto: true,
        createdAt: new Date()
      });

      await Auction.findOneAndUpdate(
        { _id: auctionId },
        {
          $set: {
            currentBid: nextBid,
            reserveMet: nextBid >= auction.reservePrice
          },
          $inc: { bidCount: 1 }
        },
        { new: true }
      );

      highestBid = nextBid;
      newBids.push(bid);
    } else {
      console.log('Next bid exceeds maxAmount for user:', autoBid.user.username, 'Next bid:', nextBid, 'maxAmount:', autoBid.maxAmount);
    }
  }

  return newBids;
};

// Place a manual bid
export const placeBid = async (req, res) => {
  try {
    const { auctionId } = req.params;
    const { amount } = req.body;
    const userId = req.user.id;

    // Find the auction
    const auction = await Auction.findById(auctionId);
    if (!auction) {
      return res.status(404).json({ status: false, message: 'Auction not found' });
    }

    // Check if auction is active
    if (auction.status !== 'live' || auction.endTime < new Date()) {
      return res.status(400).json({ status: false, message: 'Auction is not active or has ended' });
    }

    // Check if seller is bidding
    if (auction.seller.toString() === userId) {
      return res.status(400).json({ status: false, message: 'Sellers cannot bid on their own auctions' });
    }

    // Check if user has an active auto-bid
    const existingAutoBid = await AutoBid.findOne({ user: userId, auction: auctionId });
    if (existingAutoBid) {
      return res.status(400).json({
        status: false,
        message: 'You have an active auto-bid for this auction. Update your auto-bid instead.'
      });
    }

    // Validate bid amount
    if (!amount || typeof amount !== 'number' || amount <= 0) {
      return res.status(400).json({ status: false, message: 'Invalid bid amount' });
    }

    const minimumBid = auction.currentBid ? auction.currentBid + auction.bidIncrement : auction.startingBid;
    if (amount < minimumBid) {
      return res.status(400).json({
        status: false,
        message: `Bid must be at least $${minimumBid}`
      });
    }

    if (amount === auction.currentBid) {
      return res.status(400).json({
        status: false,
        message: 'Bid amount cannot be the same as the current bid'
      });
    }

    // Create manual bid
    const bid = await Bid.create({
      amount,
      auction: auctionId,
      user: userId,
      isAuto: false,
      createdAt: new Date()
    });

    // Update auction
    const updatedAuction = await Auction.findOneAndUpdate(
      { _id: auctionId },
      {
        $set: {
          currentBid: amount,
          reserveMet: amount >= auction.reservePrice
        },
        $inc: { bidCount: 1 }
      },
      { new: true }
    );

    // Populate bid for response
    const populatedBid = await Bid.findById(bid._id)
      .populate('user', 'username')
      .populate('auction', 'title');

    // Emit real-time bid event
    io.to(auctionId).emit('newBid', {
      bid: populatedBid,
      auction: {
        _id: updatedAuction._id,
        currentBid: updatedAuction.currentBid,
        bidCount: updatedAuction.bidCount,
        reserveMet: updatedAuction.reserveMet
      }
    });

    // Process automated bids
    const autoBids = await processAutoBids(auctionId, amount, auction.bidIncrement, userId);
    for (const autoBid of autoBids) {
      const populatedAutoBid = await Bid.findById(autoBid._id)
        .populate('user', 'username')
        .populate('auction', 'title');
      io.to(auctionId).emit('newBid', {
        bid: populatedAutoBid,
        auction: await Auction.findById(auctionId)
      });
    }

    return res.status(201).json({
      status: 'success',
      message: 'Bid placed successfully',
      data: populatedBid
    });
  } catch (err) {
    console.error('Error in placeBid:', err.message);
    return res.status(400).json({ status: false, message: err.message });
  }
};

// Set or update an automated bid
export const setAutoBid = async (req, res) => {
  try {
    const { auctionId } = req.params;
    const { maxAmount } = req.body;
    const userId = req.user.id;

    // Find the auction
    const auction = await Auction.findById(auctionId);
    if (!auction) {
      return res.status(404).json({ status: false, message: 'Auction not found' });
    }

    // Check if auction is active
    if (auction.status !== 'live' || auction.endTime < new Date()) {
      return res.status(400).json({ status: false, message: 'Auction is not active or has ended' });
    }

    // Check if seller is setting auto-bid
    if (auction.seller.toString() === userId) {
      return res.status(400).json({ status: false, message: 'Sellers cannot set auto-bids on their own auctions' });
    }

    // Validate maxAmount
    if (!maxAmount || typeof maxAmount !== 'number' || maxAmount <= 0) {
      return res.status(400).json({ status: false, message: 'Invalid maximum bid amount' });
    }

    const minimumBid = auction.currentBid ? auction.currentBid + auction.bidIncrement : auction.startingBid;
    if (maxAmount < minimumBid) {
      return res.status(400).json({
        status: false,
        message: `Maximum bid must be at least $${minimumBid}`
      });
    }

    // Create or update auto-bid
    const autoBid = await AutoBid.findOneAndUpdate(
      { user: userId, auction: auctionId },
      { maxAmount, updatedAt: new Date() },
      { upsert: true, new: true, runValidators: true }
    );


    // Process automated bids immediately, allowing triggering user's auto-bid
    const autoBids = await processAutoBids(auctionId, auction.currentBid, auction.bidIncrement);
    for (const autoBid of autoBids) {
      const populatedAutoBid = await Bid.findById(autoBid._id)
        .populate('user', 'username')
        .populate('auction', 'title');
      io.to(auctionId).emit('newBid', {
        bid: populatedAutoBid,
        auction: await Auction.findById(auctionId)
      });
    }

    return res.status(200).json({
      status: true,
      message: 'Auto-bid set successfully',
      data: autoBid
    });
  } catch (err) {
    console.error('Error in setAutoBid:', err.message);
    return res.status(400).json({ status: false, message: err.message });
  }
};

// Get auction result
export const getAuctionResult = async (req, res) => {
  try {
    const { auctionId } = req.params;

    const auction = await Auction.findById(auctionId)
      .populate('winner', 'username')
      .populate('seller', 'username')
      .populate('category', 'name');

    if (!auction) {
      return res.status(404).json({ status: false, message: 'Auction not found' });
    }

    if (auction.status !== 'completed') {
      return res.status(400).json({ status: false, message: 'Auction has not yet ended' });
    }

    const highestBid = await Bid.findOne({ auction: auctionId })
      .sort('-amount')
      .populate('user', 'username');

    return res.status(200).json({
      status: true,
      message: 'Auction result retrieved successfully',
      data: {
        auction: {
          _id: auction._id,
          title: auction.title,
          category: auction.category,
          currentBid: auction.currentBid,
          reservePrice: auction.reservePrice,
          reserveMet: auction.reserveMet,
          seller: auction.seller,
          status: auction.status,
          endTime: auction.endTime
        },
        result: {
          reserveMet: auction.reserveMet,
          winner: auction.reserveMet && highestBid ? {
            userId: highestBid.user._id,
            username: highestBid.user.username,
            amount: highestBid.amount
          } : null,
          message: auction.reserveMet ? 'Auction ended with a winner' : 'Auction ended without meeting reserve price'
        }
      }
    });
  } catch (err) {
    console.error('Error in getAuctionResult:', err.message);
    return res.status(400).json({ status: false, message: err.message });
  }
};

// Get user's auto-bids
export const getUserAutoBids = async (req, res) => {
  try {
    const autoBids = await AutoBid.find({ user: req.user.id })
      .populate('auction', 'title currentBid endTime')
      .sort('-createdAt');

    return res.status(200).json({
      status: true,
      message: 'Auto-bids retrieved successfully',
      results: autoBids.length,
      data: autoBids
    });
  } catch (err) {
    console.error('Error in getUserAutoBids:', err.message);
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
    console.error('Error in getUserBids:', err.message);
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
    console.error('Error in getBid:', err.message);
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
    console.error('Error in getBidsForAuction:', err.message);
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
      .select('amount user createdAt isAuto')
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
    console.error('Error in getBidsHistory:', err.message);
    return res.status(400).json({ status: false, message: err.message });
  }
};