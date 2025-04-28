import { Bid } from '../models/bid.models.js';
import { Auction } from '../models/auction.models.js';
import { AutoBid } from '../models/autobidding.models.js';
import { io } from '../../server.js';
import { User } from '../models/user.models.js';
import { Notification } from '../models/notification.models.js';


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
    if (!autoBid.user || !autoBid.user._id) continue; // Ensure user exists
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
    const userId = req.user?._id;

    if (!userId) {
      return res.status(401).json({ status: false, message: 'User not authenticated' });
    }

    // Find the auction
    const auction = await Auction.findById(auctionId).populate('seller');
    if (!auction) {
      return res.status(404).json({ status: false, message: 'Auction not found' });
    }

    // Check if auction is active
    if (auction.status !== 'live' || auction.endTime < new Date()) {
      return res.status(400).json({ status: false, message: 'Auction is not active or has ended' });
    }

    // Check if seller is bidding
    if (auction.seller && auction.seller.toString() === userId) {
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

    // Find the previous highest bid (if any) before creating the new bid
    const previousHighestBid = await Bid.findOne({ auction: auctionId })
      .sort({ amount: -1, createdAt: 1 })
      .populate('user');

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

    // Send outbid notification to the previous highest bidder (if exists and not the current bidder)
    if (previousHighestBid && previousHighestBid.user && previousHighestBid.user._id.toString() !== userId.toString()) {
      const outbidMessage = `You have been outbid on auction "${auction.title}". New highest bid: ${amount.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}`;

      // Save notification to database
      const outbidNotification = new Notification({
        user: previousHighestBid.user._id,
        auction: auctionId,
        message: outbidMessage,
        type: 'outbid',
      });
      await outbidNotification.save();

      // Emit real-time notification to the previous bidder
      io.to(previousHighestBid.user._id.toString()).emit('notification', {
        message: outbidMessage,
        auctionId: auctionId,
        type: 'outbid',
        createdAt: new Date(),
      });
    }

    // Send notification to the seller
    if (auction.seller) {
      const sellerMessage = `A new bid of ${amount.toLocaleString('en-US', { style: 'currency', currency: 'USD' })} has been placed on your auction "${auction.title}"`;

      // Save notification to database
      const sellerNotification = new Notification({
        user: auction.seller._id,
        auction: auctionId,
        message: sellerMessage,
        type: 'newBid',
      });
      await sellerNotification.save();

      // Emit real-time notification to the seller
      io.to(auction.seller._id.toString()).emit('notification', {
        message: sellerMessage,
        auctionId: auctionId,
        type: 'newBid',
        createdAt: new Date(),
      });
    }

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

// Get Auction Details for a Specific Auction
export const getAuctionDetails = async (req, res) => {
  try {
    const userId = req.user ? req.user._id : null;
    if (!userId) {
      return res.status(401).json({
        status: false,
        message: 'Authentication required: user ID not found',
      });
    }

    const { auctionId } = req.params;

    // Check if the user has bid on this auction
    const userBid = await Bid.findOne({ auction: auctionId, user: userId });
    if (!userBid) {
      return res.status(403).json({
        status: false,
        message: 'You have not bid on this auction',
      });
    }

    // Fetch auction details
    const auction = await Auction.findById(auctionId)
      .populate('seller', 'username sellerId')
      .populate('category', 'name')
      .populate('winner', 'username');

    if (!auction) {
      return res.status(404).json({
        status: false,
        message: 'Auction not found',
      });
    }

    // Calculate time left
    const currentTime = new Date();
    const timeDiff = new Date(auction.endTime) - currentTime;
    const daysLeft = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
    const hoursLeft = Math.floor((timeDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutesLeft = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));
    const secondsLeft = Math.floor((timeDiff % (1000 * 60)) / 1000);

    // Determine user's status in the auction
    let userStatus = '';
    let userRank = null;

    if (auction.status === 'live') {
      const allBids = await Bid.find({ auction: auction._id })
        .sort({ amount: -1, createdAt: 1 });
      const uniqueBidders = [];
      const bidderMap = new Map();

      allBids.forEach((b) => {
        if (!bidderMap.has(b.user.toString())) {
          bidderMap.set(b.user.toString(), b.amount);
          uniqueBidders.push({ user: b.user.toString(), amount: b.amount });
        } else if (b.amount > bidderMap.get(b.user.toString())) {
          bidderMap.set(b.user.toString(), b.amount);
          const index = uniqueBidders.findIndex(
            (ub) => ub.user === b.user.toString()
          );
          uniqueBidders[index].amount = b.amount;
        }
      });

      uniqueBidders.sort((a, b) => b.amount - a.amount);

      userRank = uniqueBidders.findIndex(
        (ub) => ub.user === userId.toString()
      ) + 1;

      const rankSuffix = (rank) => {
        if (rank % 10 === 1 && rank % 100 !== 11) return 'st';
        if (rank % 10 === 2 && rank % 100 !== 12) return 'nd';
        if (rank % 10 === 3 && rank % 100 !== 13) return 'rd';
        return 'th';
      };

      userStatus = `You are currently ${userRank}${rankSuffix(userRank)}`;
    } else if (auction.status === 'completed') {
      if (auction.winner && auction.winner._id.toString() === userId.toString()) {
        userStatus = `YOU WON the bid: ${auction.currentBid.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}`;
      } else {
        const allBids = await Bid.find({ auction: auction._id })
          .sort({ amount: -1, createdAt: 1 });
        const uniqueBidders = [];
        const bidderMap = new Map();

        allBids.forEach((b) => {
          if (!bidderMap.has(b.user.toString())) {
            bidderMap.set(b.user.toString(), b.amount);
            uniqueBidders.push({ user: b.user.toString(), amount: b.amount });
          } else if (b.amount > bidderMap.get(b.user.toString())) {
            bidderMap.set(b.user.toString(), b.amount);
            const index = uniqueBidders.findIndex(
              (ub) => ub.user === b.user.toString()
            );
            uniqueBidders[index].amount = b.amount;
          }
        });

        uniqueBidders.sort((a, b) => b.amount - a.amount);

        userRank = uniqueBidders.findIndex(
          (ub) => ub.user === userId.toString()
        ) + 1;

        const rankSuffix = (rank) => {
          if (rank % 10 === 1 && rank % 100 !== 11) return 'st';
          if (rank % 10 === 2 && rank % 100 !== 12) return 'nd';
          if (rank % 10 === 3 && rank % 100 !== 13) return 'rd';
          return 'th';
        };

        userStatus = `You lost (Rank: ${userRank}${rankSuffix(userRank)})`;
      }
    } else {
      userStatus = `Auction ${auction.status.toUpperCase()}`;
    }

    // Format the response
    const auctionDetails = {
      _id: auction._id,
      sku: auction.sku,
      title: auction.title,
      description: auction.description,
      winningBid: auction.currentBid.toLocaleString('en-US', {
        style: 'currency',
        currency: 'USD',
      }),
      timeLeft: {
        days: daysLeft >= 0 ? String(daysLeft).padStart(2, '0') : '00',
        hours: hoursLeft >= 0 ? String(hoursLeft).padStart(2, '0') : '00',
        minutes: minutesLeft >= 0 ? String(minutesLeft).padStart(2, '0') : '00',
        seconds: secondsLeft >= 0 ? String(secondsLeft).padStart(2, '0') : '00',
      },
      endTime: auction.endTime.toLocaleString('en-US', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
        hour12: true,
      }),
      timezone: 'UTC 0',
      images: auction.images,
      userStatus,
    };

    return res.status(200).json({
      status: true,
      message: 'Auction details retrieved successfully',
      data: auctionDetails,
    });
  } catch (err) {
    console.error('Error in getAuctionDetails:', err.message);
    return res.status(500).json({ status: false, message: err.message });
  }
};
// Get User's Bid History
export const getUserBidHistory = async (req, res) => {
  try {
    const userId = req.user ? req.user._id : null;
    if (!userId) {
      return res.status(401).json({
        status: false,
        message: 'Authentication required: user ID not found',
      });
    }

    // Fetch all bids by the user
    const userBids = await Bid.find({ user: userId })
      .populate({
        path: 'auction',
        select: 'title sku status winner currentBid endTime',
      })
      .sort({ createdAt: -1 });

    if (!userBids || userBids.length === 0) {
      return res.status(404).json({
        status: false,
        message: 'No bids found for this user',
      });
    }

    // Process each bid to determine status and ranking
    const bidHistory = await Promise.all(
      userBids.map(async (bid) => {
        const auction = bid.auction;
        if (!auction) {
          return {
            auctionName: 'Unknown',
            sku: 'N/A',
            bid: bid.amount.toLocaleString('en-US', {
              style: 'currency',
              currency: 'USD',
            }),
            biddingTime: bid.createdAt.toLocaleDateString('en-US', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            }),
            status: 'Auction data unavailable',
            auctionId: 'N/A',
          };
        }
        let statusWithRank = '';

        // Determine auction status and user's rank
        if (auction.status === 'live') {
          const allBids = await Bid.find({ auction: auction._id })
            .sort({ amount: -1, createdAt: 1 });
          const uniqueBidders = [];
          const bidderMap = new Map();

          // Group bids by user to get their highest bid
          allBids.forEach((b) => {
            if (!bidderMap.has(b.user.toString())) {
              bidderMap.set(b.user.toString(), b.amount);
              uniqueBidders.push({ user: b.user.toString(), amount: b.amount });
            } else if (b.amount > bidderMap.get(b.user.toString())) {
              bidderMap.set(b.user.toString(), b.amount);
              const index = uniqueBidders.findIndex(
                (ub) => ub.user === b.user.toString()
              );
              uniqueBidders[index].amount = b.amount;
            }
          });

          // Sort unique bidders by highest bid
          uniqueBidders.sort((a, b) => b.amount - a.amount);

          // Find the user's rank
          const userRank = uniqueBidders.findIndex(
            (ub) => ub.user === userId.toString()
          ) + 1;

          // Format rank 
          const rankSuffix = (rank) => {
            if (rank % 10 === 1 && rank % 100 !== 11) return 'st';
            if (rank % 10 === 2 && rank % 100 !== 12) return 'nd';
            if (rank % 10 === 3 && rank % 100 !== 13) return 'rd';
            return 'th';
          };

          statusWithRank = `LIVE(${userRank}${rankSuffix(userRank)})`;
        } else if (auction.status === 'completed') {
          // For completed auctions, check if the user is the winner
          if (auction.winner && auction.winner.toString() === userId.toString()) {
            statusWithRank = 'WIN(1st)';
          } else {
            // Calculate rank based on all bids
            const allBids = await Bid.find({ auction: auction._id })
              .sort({ amount: -1, createdAt: 1 });
            const uniqueBidders = [];
            const bidderMap = new Map();

            allBids.forEach((b) => {
              if (!bidderMap.has(b.user.toString())) {
                bidderMap.set(b.user.toString(), b.amount);
                uniqueBidders.push({ user: b.user.toString(), amount: b.amount });
              } else if (b.amount > bidderMap.get(b.user.toString())) {
                bidderMap.set(b.user.toString(), b.amount);
                const index = uniqueBidders.findIndex(
                  (ub) => ub.user === b.user.toString()
                );
                uniqueBidders[index].amount = b.amount;
              }
            });

            uniqueBidders.sort((a, b) => b.amount - a.amount);

            const userRank = uniqueBidders.findIndex(
              (ub) => ub.user === userId.toString()
            ) + 1;

            const rankSuffix = (rank) => {
              if (rank % 10 === 1 && rank % 100 !== 11) return 'st';
              if (rank % 10 === 2 && rank % 100 !== 12) return 'nd';
              if (rank % 10 === 3 && rank % 100 !== 13) return 'rd';
              return 'th';
            };

            statusWithRank = `LOSS(${userRank}${rankSuffix(userRank)})`;
          }
        } else {
          // For other statuses 
          statusWithRank = auction.status.toUpperCase();
        }

        // Format the bidding time
        const biddingTime = bid.createdAt.toLocaleDateString('en-US', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        });

        return {
          auctionName: auction.title,
          sku: auction.sku,
          bid: bid.amount.toLocaleString('en-US', {
            style: 'currency',
            currency: 'USD',
          }),
          biddingTime,
          status: statusWithRank,
          auctionId: auction._id,
        };
      })
    );

    return res.status(200).json({
      status: true,
      message: 'Bid history retrieved successfully',
      data: bidHistory,
    });
  } catch (err) {
    console.error('Error in getUserBidHistory:', err.message);
    return res.status(500).json({ status: false, message: err.message });
  }
};

// Get Top Bidders
export const getTopBidders = async (req, res) => {
  try {
    // Aggregate top bidders across all auctions
    const topBidders = await Bid.aggregate([
      {
        $group: {
          _id: '$user', // Group by user
          totalBids: { $sum: 1 }, // Count total bids by the user
          totalAmount: { $sum: '$amount' }, // Sum total bid amounts by the user
        },
      },
      {
        $lookup: {
          from: 'users', // Lookup user details
          localField: '_id',
          foreignField: '_id',
          as: 'user',
        },
      },
      { $unwind: '$user' }, // Unwind the user array
      {
        $project: {
          _id: '$user._id',
          username: '$user.username',
          email: '$user.email',
          createdAt: '$user.createdAt',
          totalBids: 1,
          totalAmount: 1,
        },
      },
      { $sort: { totalAmount: -1 } }, // Sort by total bid amount in descending order
    ]);

    if (topBidders.length === 0) {
      return res.status(404).json({ status: false, message: 'No bidders found' });
    }

    return res.status(200).json({
      status: true,
      message: 'Top bidders retrieved successfully',
      results: topBidders.length,
      data: topBidders,
    });
  } catch (err) {
    console.error('Error in getTopBidders:', err.message);
    return res.status(500).json({ status: false, message: err.message });
  }
};

// Get All Bidders
export const getAllBidders = async (req, res) => {
  try {
    const { search, page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;

    // Get the seller ID from the authenticated user
    const sellerId = req.user?._id;
    if (!sellerId) {
      return res.status(401).json({ status: false, message: 'Seller not authenticated' });
    }

    // Find all auctions created by the seller
    const sellerAuctions = await Auction.find({ seller: sellerId }).select('_id title winner');
    const auctionIds = sellerAuctions.map((auction) => auction._id);

    if (auctionIds.length === 0) {
      return res.status(404).json({ status: false, message: 'No auctions found for this seller' });
    }

    // Find all bids for the seller's auctions
    const bids = await Bid.find({ auction: { $in: auctionIds } })
      .populate('user', 'username email phone createdAt')
      .populate('auction', 'title winner');

    // Create a Map to store the unique users' bids and auction names
    const userBidData = {};

    // Loop through all the bids
    bids.forEach((bid) => {
      if (!bid.user || !bid.user._id) {
        // Skip bids with null or invalid user
        return;
      }

      const userId = bid.user._id;

      // If the user doesn't exist in the map, initialize their data
      if (!userBidData[userId]) {
        userBidData[userId] = {
          user: bid.user.username,
          email: bid.user.email,
          phone: bid.user.phone,
          joinDate: bid.user.createdAt,
          totalBids: 0,
          auctions: new Set(), // Use a Set to avoid duplicate auction names
          winAuctions: 0, // Initialize win auctions count
        };
      }

      // Increment total bids count
      userBidData[userId].totalBids += 1;

      // Add the auction title to the user's auctions
      if (bid.auction && bid.auction.title) {
        userBidData[userId].auctions.add(bid.auction.title);
      }

      // Check if the user is the winner of the auction
      if (bid.auction && bid.auction.winner && bid.auction.winner.toString() === userId.toString()) {
        userBidData[userId].winAuctions += 1;
      }
    });

    // Convert the userBidData map to an array
    let mappedBidder = Object.keys(userBidData).map((userId) => ({
      _id: userId,
      user: userBidData[userId].user,
      email: userBidData[userId].email,
      phone: userBidData[userId].phone,
      joinDate: userBidData[userId].joinDate,
      totalBids: userBidData[userId].totalBids,
      auctions: Array.from(userBidData[userId].auctions), // Convert Set to Array
      winAuctions: userBidData[userId].winAuctions, // Include win auctions count
    }));

    // Apply search filter if provided
    if (search) {
      const searchLower = search.toLowerCase();
      mappedBidder = mappedBidder.filter(
        (bidder) =>
          bidder.user.toLowerCase().includes(searchLower) ||
          bidder.email.toLowerCase().includes(searchLower)
      );
    }

    // Pagination
    const totalBidders = mappedBidder.length;
    const paginatedBidders = mappedBidder.slice(skip, skip + parseInt(limit));

    res.status(200).json({
      status: true,
      results: paginatedBidders.length,
      total: totalBidders,
      currentPage: parseInt(page),
      totalPages: Math.ceil(totalBidders / limit),
      data: paginatedBidders,
    });
  } catch (error) {
    console.error('Error in getAllBidders:', error.message);
    res.status(500).json({ status: false, message: error.message });
  }
};
// Delete bidders
export const deleteBidder = async (req, res) => {
  try {
    const { id } = req.params;
    const bidder = await User.findByIdAndDelete(id); // Use the User model instead of Bid

    if (!bidder) {
      return res.status(404).json({ status: false, message: 'Bidder not found' });
    }

    return res.status(200).json({
      status: true,
      message: 'Bidder deleted successfully',
      data: bidder
    });
  } catch (err) {
    console.error('Error in deleteBidder:', err.message);
    return res.status(400).json({ status: false, message: err.message });
  }
};

// Get User Notifications
export const getUserNotifications = async (req, res) => {
  try {
    const userId = req.user ? req.user._id : null;
    if (!userId) {
      return res.status(401).json({
        status: false,
        message: 'Authentication required: user ID not found',
      });
    }

    // Fetch notifications for the user
    const notifications = await Notification.find({ user: userId })
      .populate('auction', 'title sku')
      .sort({ createdAt: -1 })
      .limit(50);

    if (!notifications || notifications.length === 0) {
      return res.status(404).json({
        status: false,
        message: 'No notifications found for this user',
      });
    }

    // Format notifications
    const formattedNotifications = notifications.map((notification) => ({
      _id: notification._id,
      message: notification.message,
      type: notification.type,
      auction: {
        _id: notification.auction._id,
        title: notification.auction.title,
        sku: notification.auction.sku,
      },
      read: notification.read,
      createdAt: notification.createdAt.toLocaleString('en-US', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
        hour12: true,
      }),
    }));

    return res.status(200).json({
      status: true,
      message: 'Notifications retrieved successfully',
      results: formattedNotifications.length,
      data: formattedNotifications,
    });
  } catch (err) {
    console.error('Error in getUserNotifications:', err.message);
    return res.status(500).json({ status: false, message: err.message });
  }
};

// Mark Notifications as Read
export const markNotificationsAsRead = async (req, res) => {
  try {
    const userId = req.user ? req.user._id : null;
    if (!userId) {
      return res.status(401).json({
        status: false,
        message: 'Authentication required: user ID not found',
      });
    }

    const { notificationIds } = req.body;

    // Validate input
    if (!notificationIds || !Array.isArray(notificationIds) || notificationIds.length === 0) {
      return res.status(400).json({
        status: false,
        message: 'notificationIds must be a non-empty array',
      });
    }

    // Fetch notifications and ensure they belong to the user
    const notifications = await Notification.find({
      _id: { $in: notificationIds },
      user: userId,
    });

    if (!notifications || notifications.length === 0) {
      return res.status(404).json({
        status: false,
        message: 'No matching notifications found for this user',
      });
    }

    // Update the read status to true
    const updatedNotifications = await Notification.updateMany(
      { _id: { $in: notificationIds }, user: userId },
      { $set: { read: true } },
      { new: true }
    );

    // Fetch the updated notifications for response
    const updatedNotificationList = await Notification.find({
      _id: { $in: notificationIds },
      user: userId,
    })
      .populate('auction', 'title sku')
      .sort({ createdAt: -1 });

    const formattedNotifications = updatedNotificationList.map((notification) => ({
      _id: notification._id,
      message: notification.message,
      type: notification.type,
      auction: {
        _id: notification.auction._id,
        title: notification.auction.title,
        sku: notification.auction.sku,
      },
      read: notification.read,
      createdAt: notification.createdAt.toLocaleString('en-US', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
        hour12: true,
      }),
    }));

    return res.status(200).json({
      status: true,
      message: 'Notifications marked as read successfully',
      data: formattedNotifications,
    });
  } catch (err) {
    console.error('Error in markNotificationsAsRead:', err.message);
    return res.status(500).json({ status: false, message: err.message });
  }
};