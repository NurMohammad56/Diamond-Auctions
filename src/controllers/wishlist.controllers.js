import { Wishlist } from '../models/wishlist.models.js';
import { Auction } from '../models/auction.models.js';

// Add auction to wishlist
export const addToWishlist = async (req, res) => {
    try {
        const { auctionId } = req.params;
        const userId = req.user.id;
        const userRole = req.user.role;

        if (userRole === 'admin') {
            return res.status(403).json({ status: false, message: 'Admins are not eligible to save auctions to wishlist' });
        }

        // Validate auction exists
        const auction = await Auction.findById(auctionId);
        if (!auction) {
            return res.status(404).json({ status: false, message: 'Auction not found' });
        }

        // Find or create wishlist
        let wishlist = await Wishlist.findOne({ user: userId });
        if (!wishlist) {
            wishlist = await Wishlist.create({
                user: userId,
                auctions: [auctionId]
            });
        } else {
            // Check if auction is already in wishlist
            if (wishlist.auctions.includes(auctionId)) {
                return res.status(400).json({ status: false, message: 'Auction already in wishlist' });
            }
            wishlist.auctions.push(auctionId);
            await wishlist.save();
        }

        return res.status(200).json({
            status: true,
            message: 'Auction added to wishlist successfully',
            data: wishlist
        });
    } catch (err) {
        console.error('Error in addToWishlist:', err.message);
        return res.status(400).json({ status: false, message: err.message });
    }
};

export const removeFromWishlist = async (req, res) => {
    try {
        const { auctionId } = req.params;
        const userId = req.user.id;
        const userRole = req.user.role; 

        if (userRole === 'admin') {
            return res.status(403).json({ status: false, message: 'Admins are not eligible to modify wishlist' });
        }

        // Find wishlist
        const wishlist = await Wishlist.findOne({ user: userId });
        if (!wishlist) {
            return res.status(404).json({ status: false, message: 'Wishlist not found' });
        }

        // Check if auction is in wishlist
        const auctionIndex = wishlist.auctions.indexOf(auctionId);
        if (auctionIndex === -1) {
            return res.status(400).json({ status: false, message: 'Auction not in wishlist' });
        }

        // Remove auction
        wishlist.auctions.splice(auctionIndex, 1);
        await wishlist.save();

        return res.status(200).json({
            status: true,
            message: 'Auction removed from wishlist successfully',
            data: wishlist
        });
    } catch (err) {
        console.error('Error in removeFromWishlist:', err.message);
        return res.status(400).json({ status: false, message: err.message });
    }
};

export const getWishlist = async (req, res) => {
    try {
        const userId = req.user.id;
        const userRole = req.user.role;

        if (userRole === 'admin') {
            return res.status(403).json({ status: false, message: 'Admins are not eligible to access wishlist' });
        }

        // Find wishlist and populate auctions
        const wishlist = await Wishlist.findOne({ user: userId })
            .populate({
                path: 'auctions',
                select: 'title description images category caratWeight currentBid status startTime endTime',
                populate: { path: 'seller', select: 'username' }
            });

        if (!wishlist) {
            return res.status(200).json({
                status: true,
                message: 'Wishlist is empty',
                data: { user: userId, auctions: [] }
            });
        }

        return res.status(200).json({
            status: true,
            message: 'Wishlist retrieved successfully',
            data: wishlist
        });
    } catch (err) {
        console.error('Error in getWishlist:', err.message);
        return res.status(400).json({ status: false, message: err.message });
    }
};