import { Auction } from "../models/auction.models.js";
import { Notification } from "../models/notification.models.js";
import { User } from "../models/user.models.js";

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

// Get All Bidders
export const getAllBidders = async (req, res) => {
    try {
        const { page = 1, limit = 5 } = req.query;
        const skip = (page - 1) * limit;

        // Step 1: Find all users who have placed at least one bid
        const bidderAggregation = await Bid.aggregate([
            // Group by user to get unique bidders and their total bids
            {
                $group: {
                    _id: '$user',
                    totalBids: { $sum: 1 },
                },
            },
            // Lookup user details
            {
                $lookup: {
                    from: 'users',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'user',
                },
            },
            { $unwind: '$user' },
            // Lookup auctions won by this user
            {
                $lookup: {
                    from: 'auctions',
                    let: { userId: '$_id' },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $and: [
                                        { $eq: ['$winner', '$$userId'] },
                                        { $eq: ['$status', 'completed'] },
                                    ],
                                },
                            },
                        },
                        { $count: 'auctionsWon' },
                    ],
                    as: 'auctionsWon',
                },
            },
            // Unwind auctionsWon (it will be an array with one object or empty)
            {
                $unwind: {
                    path: '$auctionsWon',
                    preserveNullAndEmptyArrays: true,
                },
            },
            // Project the final fields
            {
                $project: {
                    _id: '$user._id',
                    bidder: '$user.username',
                    contact: {
                        email: '$user.email',
                        phone: '$user.phone',
                    },
                    joinDate: '$user.createdAt',
                    totalBids: 1,
                    winAuctions: { $ifNull: ['$auctionsWon.auctionsWon', 0] },
                },
            },
            // Sort by join date (descending)
            { $sort: { joinDate: -1 } },
            // Apply pagination
            { $skip: skip },
            { $limit: parseInt(limit) },
        ]);

        // Step 2: Get the total number of unique bidders
        const totalBiddersResult = await Bid.aggregate([
            { $group: { _id: '$user' } },
            { $count: 'totalBidders' },
        ]);

        const totalBidders = totalBiddersResult.length > 0 ? totalBiddersResult[0].totalBidders : 0;

        if (!bidderAggregation || bidderAggregation.length === 0) {
            return res.status(404).json({ status: false, message: 'No bidders found' });
        }

        return res.status(200).json({
            status: true,
            message: 'Bidders retrieved successfully',
            results: bidderAggregation.length,
            total: totalBidders,
            currentPage: parseInt(page),
            totalPages: Math.ceil(totalBidders / limit),
            data: bidderAggregation.map(bidder => ({
                _id: bidder._id,
                bidder: bidder.bidder,
                contact: {
                    email: bidder.contact.email,
                    phone: bidder.contact.phone || '+1 (555) 123-4567',
                },
                joinDate: bidder.joinDate.toISOString().split('T')[0],
                totalBids: bidder.totalBids,
                winAuctions: bidder.winAuctions,
            })),
        });
    } catch (err) {
        console.error('Error in getAllBidders:', err.message);
        return res.status(500).json({ status: false, message: err.message });
    }
};

// Get List of Sellers with Metrics
export const getSellers = async (req, res) => {
    try {
        // Pagination parameters
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 5;
        const skip = (page - 1) * limit;

        // Search parameter
        const search = req.query.search || '';
        const searchQuery = search
            ? {
                $or: [
                    { username: { $regex: search, $options: 'i' } },
                    { email: { $regex: search, $options: 'i' } },
                ],
            }
            : {};

        // Fetch sellers
        const sellers = await User.find({
            role: 'seller',
            ...searchQuery,
        })
            .skip(skip)
            .limit(limit)
            .sort({ createdAt: -1 });

        const totalSellers = await User.countDocuments({
            role: 'seller',
            ...searchQuery,
        });

        if (!sellers || sellers.length === 0) {
            return res.status(404).json({
                status: false,
                message: 'No sellers found',
            });
        }

        // Calculate metrics for each seller
        const sellerData = await Promise.all(
            sellers.map(async (seller) => {
                // Total Auctions
                const totalAuctions = await Auction.countDocuments({ seller: seller._id });

                // Live Auctions
                const liveAuctions = await Auction.countDocuments({
                    seller: seller._id,
                    status: 'live',
                    endTime: { $gt: new Date() },
                });

                // Total Sales (successful auctions with a winner)
                const totalSales = await Auction.countDocuments({
                    seller: seller._id,
                    status: 'completed',
                    winner: { $ne: null },
                });

                // Sell Amount (total revenue from successful auctions)
                const successfulAuctions = await Auction.find({
                    seller: seller._id,
                    status: 'completed',
                    winner: { $ne: null },
                });
                const sellAmount = successfulAuctions.reduce(
                    (sum, auction) => sum + (auction.currentBid || 0),
                    0
                );

                return {
                    _id: seller._id,
                    username: seller.username,
                    email: seller.email,
                    phone: seller.phone || '',
                    sellerId: seller.sellerId,
                    joinDate: seller.createdAt.toISOString().split('T')[0], // Format as YYYY-MM-DD
                    totalAuctions,
                    liveAuctions,
                    totalSales,
                    sellAmount: sellAmount.toLocaleString('en-US', {
                        style: 'currency',
                        currency: 'USD',
                    }),
                };
            })
        );

        return res.status(200).json({
            status: true,
            message: 'Sellers retrieved successfully',
            results: sellerData.length,
            total: totalSellers,
            page,
            totalPages: Math.ceil(totalSellers / limit),
            data: sellerData,
        });
    } catch (err) {
        console.error('Error in getSellers:', err.message);
        return res.status(500).json({ status: false, message: err.message });
    }
};

// Delete a Seller and Associated Data
export const deleteSeller = async (req, res) => {
    try {
        const { sellerId } = req.params;

        // Verify the seller exists
        const seller = await User.findOne({ _id: sellerId, role: 'seller' });
        if (!seller) {
            return res.status(404).json({
                status: false,
                message: 'Seller not found',
            });
        }

        // Find all auctions by the seller
        const sellerAuctions = await Auction.find({ seller: sellerId });

        // Delete associated bids, auto-bids, and notifications for each auction
        for (const auction of sellerAuctions) {
            await Bid.deleteMany({ auction: auction._id });
            await AutoBid.deleteMany({ auction: auction._id });
            await Notification.deleteMany({ auction: auction._id });
        }

        // Delete the seller's auctions
        await Auction.deleteMany({ seller: sellerId });

        // Delete the seller's notifications (e.g., outbid notifications)
        await Notification.deleteMany({ user: sellerId });

        // Delete the seller
        await User.deleteOne({ _id: sellerId });

        return res.status(200).json({
            status: true,
            message: 'Seller and associated data deleted successfully',
        });
    } catch (err) {
        console.error('Error in deleteSeller:', err.message);
        return res.status(500).json({ status: false, message: err.message });
    }
};

// Add Scheduled Auction
export const addScheduledAuction = async (req, res) => {
    try {
        const {
            title,
            description,
            category,
            caratWeight,
            startingBid,
            bidIncrement,
            reservePrice,
            startTime,
            endTime,
            seller,
            sku,
            images,
        } = req.body;

        // Validate required fields
        if (!title || !startingBid || !bidIncrement || -1 || !startTime || !endTime || !seller || !sku) {
            return res.status(400).json({
                status: false,
                message: 'Missing required fields: title, startingBid, bidIncrement, startTime, endTime, seller, and sku are required',
            });
        }

        // Validate dates
        const currentTime = new Date();
        const start = new Date(startTime);
        const end = new Date(endTime);

        if (start <= currentTime) {
            return res.status(400).json({
                status: false,
                message: 'startTime must be in the future for a scheduled auction',
            });
        }

        if (end <= start) {
            return res.status(400).json({
                status: false,
                message: 'endTime must be after startTime',
            });
        }

        // Validate seller exists
        const sellerExists = await User.findById(seller);
        if (!sellerExists) {
            return res.status(404).json({
                status: false,
                message: 'Seller not found',
            });
        }

        // Create the auction
        const auction = new Auction({
            title,
            description,
            category,
            caratWeight,
            startingBid,
            bidIncrement,
            reservePrice,
            reserveMet: false,
            bidCount: 0,
            currentBid: 0,
            status: 'scheduled',
            startTime: start,
            endTime: end,
            seller,
            winner: null,
            approved: true,
            sku,
            images: images || [],
            createdAt: new Date(),
        });

        await auction.save();

        // Populate related fields for response
        const populatedAuction = await Auction.findById(auction._id)
            .populate('seller', 'username sellerId')
            .populate('winner', 'username sellerId')
            .populate('category', 'name');

        const formattedAuction = formatAuctionData([populatedAuction])[0];

        return res.status(201).json({
            status: true,
            message: 'Scheduled auction created successfully',
            data: formattedAuction,
        });
    } catch (err) {
        console.error('Error in addScheduledAuction:', err.message);
        return res.status(500).json({ status: false, message: err.message });
    }
};

// Get Active Auctions
export const getActiveAuctions = async (req, res) => {
    try {
        const currentTime = new Date();
        const auctions = await Auction.find({
            status: 'live',
            startTime: { $lte: currentTime },
            endTime: { $gt: currentTime },
        })
            .populate('seller', 'username sellerId')
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
            .populate('winner', "username sellerId")
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

// Accept Auction
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

// Reject Auction
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

// Delete Auction
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