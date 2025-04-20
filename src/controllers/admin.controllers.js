import { Auction } from "../models/auction.models.js";

// Helper function to format auctions with all fields
const formatAuctionData = (auctions) => {
    return auctions.map(auction => {
        const currentTime = new Date();
        const endTime = new Date(auction.endTime);
        const timeDiff = endTime - currentTime;
        const hoursLeft = Math.floor(timeDiff / (1000 * 60 * 60));
        const minutesLeft = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));

        return {
            _id: auction._id,
            title: auction.title,
            description: auction.description,
            category: auction.category,
            caratWeight: auction.caratWeight,
            startingBid: auction.startingBid,
            bidIncrement: auction.bidIncrement,
            reservePrice: auction.reservePrice,
            reserveMet: auction.reserveMet,
            bidCount: auction.bidCount,
            currentBid: auction.currentBid,
            status: auction.status,
            startTime: auction.startTime,
            endTime: auction.endTime,
            endsIn: hoursLeft >= 0 ? `${hoursLeft} hours, ${minutesLeft} minutes` : 'Ended',
            seller: auction.seller ? {
                _id: auction.seller._id,
                username: auction.seller.username,
                sellerId: auction.seller.sellerId,
                displayName: auction.seller.sellerId ? `${auction.seller.username} ${auction.seller.sellerId}` : auction.seller.username,
            } : null,
            winner: auction.winner ? {
                _id: auction.winner._id,
                username: auction.winner.username,
                displayName: auction.winner.sellerId ? `${auction.winner.username} ${auction.winner.sellerId}` : auction.winner.username,
            } : null,
            winningBid: auction.status === 'completed' ? auction.currentBid : null,
            approved: auction.approved,
            sku: auction.sku,
            images: auction.images,
            createdAt: auction.createdAt,
        };
    });
};

// Get Active Auctions
export const getActiveAuctions = async (_, res) => {
    try {
        const currentTime = new Date();
        const auctions = await Auction.find({
            status: 'live',
            startTime: { $lte: currentTime },
            endTime: { $gt: currentTime },
        }).populate('seller', 'username sellerId')
          .populate('winner', 'username sellerId')
          .populate('category', 'name');

        const formattedAuctions = formatAuctionData(auctions);

        return res.status(200).json({
            status: true,
            message: 'Active auctions retrieved successfully',
            results: formattedAuctions.length,
            data: formattedAuctions,
        });
    } catch (err) {
        console.error('Error in getActiveAuctions:', err.message);
        return res.status(500).json({ status: false, message: err.message });
    }
};

// Get Pending Auctions
export const getPendingAuctions = async (req, res) => {
    try {
        const auctions = await Auction.find({ status: 'pending' })
            .populate('seller', 'username sellerId')
            .populate('winner', 'username sellerId')
            .populate('category', 'name');

        const formattedAuctions = formatAuctionData(auctions);

        return res.status(200).json({
            status: true,
            message: 'Pending auctions retrieved successfully',
            results: formattedAuctions.length,
            data: formattedAuctions,
        });
    } catch (err) {
        console.error('Error in getPendingAuctions:', err.message);
        return res.status(500).json({ status: false, message: err.message });
    }
};

// Get Scheduled Auctions
export const getScheduledAuctions = async (req, res) => {
    try {
        const currentTime = new Date();
        const auctions = await Auction.find({
            status: 'scheduled',
            startTime: { $gt: currentTime },
        })
            .populate('seller', 'username sellerId')
            .populate('winner', 'username sellerId')
            .populate('category', 'name');

        const formattedAuctions = formatAuctionData(auctions);

        return res.status(200).json({
            status: true,
            message: 'Scheduled auctions retrieved successfully',
            results: formattedAuctions.length,
            data: formattedAuctions,
        });
    } catch (err) {
        console.error('Error in getScheduledAuctions:', err.message);
        return res.status(500).json({ status: false, message: err.message });
    }
};

// Get Ended Auctions
export const getEndedAuctions = async (req, res) => {
    try {
        const currentTime = new Date();
        const auctions = await Auction.find({
            status: 'completed',
            endTime: { $lte: currentTime },
        })
            .populate('seller', 'username sellerId')
            .populate('winner', 'username sellerId')
            .populate('category', 'name');

        const formattedAuctions = formatAuctionData(auctions);

        return res.status(200).json({
            status: true,
            message: 'Ended auctions retrieved successfully',
            results: formattedAuctions.length,
            data: formattedAuctions,
        });
    } catch (err) {
        console.error('Error in getEndedAuctions:', err.message);
        return res.status(500).json({ status: false, message: err.message });
    }
};

// Accept Auction (for Pending)
export const acceptAuction = async (req, res) => {
    try {
        const { auctionId } = req.params;
        const auction = await Auction.findById(auctionId);

        if (!auction) {
            return res.status(404).json({ status: false, message: 'Auction not found' });
        }

        if (auction.status !== 'pending') {
            return res.status(400).json({ status: false, message: 'Auction is not in pending status' });
        }

        const currentTime = new Date();
        auction.status = auction.startTime <= currentTime ? 'live' : 'scheduled';
        auction.approved = true;
        await auction.save();

        return res.status(200).json({
            status: true,
            message: 'Auction accepted successfully',
            data: auction,
        });
    } catch (err) {
        console.error('Error in acceptAuction:', err.message);
        return res.status(500).json({ status: false, message: err.message });
    }
};

// Reject Auction (for Pending)
export const rejectAuction = async (req, res) => {
    try {
        const { auctionId } = req.params;
        const auction = await Auction.findById(auctionId);

        if (!auction) {
            return res.status(404).json({ status: false, message: 'Auction not found' });
        }

        if (auction.status !== 'pending') {
            return res.status(400).json({ status: false, message: 'Auction is not in pending status' });
        }

        auction.status = 'cancelled';
        auction.approved = false;
        await auction.save();

        return res.status(200).json({
            status: true,
            message: 'Auction rejected successfully',
            data: auction,
        });
    } catch (err) {
        console.error('Error in rejectAuction:', err.message);
        return res.status(500).json({ status: false, message: err.message });
    }
};

// Delete Auction (for any status)
export const deleteAuction = async (req, res) => {
    try {
        const { auctionId } = req.params;
        const auction = await Auction.findById(auctionId);

        if (!auction) {
            return res.status(404).json({ status: false, message: 'Auction not found' });
        }

        auction.status = 'cancelled';
        await auction.save();

        return res.status(200).json({
            status: true,
            message: 'Auction deleted successfully',
            data: auction,
        });
    } catch (err) {
        console.error('Error in deleteAuction:', err.message);
        return res.status(500).json({ status: false, message: err.message });
    }
};
