import { Bid } from '../models/bid.models.js';
import { Auction } from '../models/auction.models.js';

export const placeBid = async (req, res) => {
    try {
        const auction = await Auction.findById(req.params.auctionId);

        if (!auction) {
            return res.status(404).json({ status: false, message: 'Auction not found' });
        }

        // Check if auction is still active
        if (auction.endTime < new Date()) {
            return res.status(400).json({ status: false, message: 'Auction has ended' });
        }

        // Check bid amount
        if (req.body.amount <= auction.currentBid) {
            return res.status(400).json({
                status: false, message: `Bid must be higher than current bid of $${auction.currentBid}`
            });
        }

        // Create bid
        const bid = await Bid.create({
            amount: req.body.amount,
            auction: req.params.auctionId,
            user: req.user.id
        });

        // Update auction
        auction.currentBid = req.body.amount;

        // Check if reserve price is met
        if (req.body.amount >= auction.reservePrice) {
            auction.reserveMet = true;
        }

        await auction.save();

        return res.status(201).json({
            status: 'success',
            message: 'Bid placed successfully',
            data: bid
        });
    } catch (err) {
        return res.status(400).json({ status: false, message: err.message });
    }
};

// export const getUserBids = async (req, res) => {
//     try {
//         const bids = await Bid.find({ user: req.user.id })
//             .populate('auction', 'title currentBid endTime')
//             .sort('-createdAt');

//         res.status(200).json({
//             status: 'success',
//             results: bids.length,
//             data: { bids }
//         });
//     } catch (err) {
//         res.status(400).json({ error: err.message });
//     }
// };

// export const getBid = async (req, res) => {
//     try {
//         const bid = await Bid.findById(req.params.id)
//             .populate('user', 'username')
//             .populate('auction', 'title');

//         if (!bid) {
//             return res.status(404).json({ error: 'Bid not found' });
//         }

//         res.status(200).json({
//             status: 'success',
//             data: { bid }
//         });
//     } catch (err) {
//         res.status(400).json({ error: err.message });
//     }
// };