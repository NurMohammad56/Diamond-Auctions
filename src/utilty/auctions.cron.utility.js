import cron from 'node-cron';
import { Auction } from '../models/auction.models.js';
import { AutoBid } from '../models/autobidding.models.js';
import { Bid } from '../models/bid.models.js';
import { io } from '../../server.js';

// Run every minute to check for ended auctions
cron.schedule('* * * * *', async () => {
  try {
    console.log('Checking for ended auctions...');
    const now = new Date();

    // Find live auctions past endTime
    const auctions = await Auction.find({
      status: 'live',
      endTime: { $lte: now }
    });

    for (const auction of auctions) {
      const highestBid = await Bid.findOne({ auction: auction._id })
        .sort('-amount')
        .populate('user', 'username');

      let update = { status: 'completed' };

      if (auction.reserveMet && highestBid) {
        update.winner = highestBid.user._id;
      } else {
        update.winner = null;
      }

      // Update auction
      await Auction.findByIdAndUpdate(auction._id, { $set: update });

      // Clean up auto-bids
      await AutoBid.deleteMany({ auction: auction._id });

      // Emit auction ended event
      io.to(auction._id.toString()).emit('auctionEnded', {
        auctionId: auction._id,
        reserveMet: auction.reserveMet,
        winner: auction.reserveMet && highestBid ? {
          userId: highestBid.user._id,
          username: highestBid.user.username,
          amount: highestBid.amount
        } : null,
        message: auction.reserveMet ? 'Auction ended with a winner' : 'Auction ended without meeting reserve price'
      });

      console.log(`Auction ${auction._id} closed: ${auction.reserveMet ? 'Reserve met' : 'Reserve not met'}`);
    }
  } catch (err) {
    console.error('Error in auction cron:', err.message);
  }
});