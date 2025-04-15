import { Auction } from '../models/auction.models.js';
import { Bid } from '../models/bid.models.js';
import { uploadOnCloudinary } from '../utilty/cloudinary.utilty.js';


// Create a new auction
export const createAuctionData = async (req, res) => {
  try {
    const auction = await Auction.create({
      ...req.body,
      seller: req.user.id
    });

    return res.status(201).json({
      status: 'success',
      data: auction
    });
  } catch (err) {
    console.error("Error creating auction data:", err);
    return res.status(400).json({ error: err.message });
  }
};

// Upload auction images
export const uploadAuctionImages = async (req, res) => {
  try {
    const imageUploadPromises = [];

    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        imageUploadPromises.push(uploadOnCloudinary(file.buffer));
      }
    }

    const uploadResults = await Promise.all(imageUploadPromises);

    const imageUrls = uploadResults.map(result => result.secure_url);

    // Save the image URLs to the database
    const auction = await Auction.findById(req.params.id);
    if (!auction) {
      return res.status(404).json({ status: false, message: 'Auction not found' });
    }

    auction.images = auction.images ? auction.images.concat(imageUrls) : imageUrls;
    await auction.save();

    return res.status(200).json({
      status: 'success',
      data: imageUrls
    });
  } catch (err) {
    console.error("Error uploading auction images:", err);
    return res.status(400).json({ error: err.message });
  }
};

// Get all auctions with pagination
export const getAllAuctions = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const skip = (page - 1) * limit;

    const auctions = await Auction.find()
      .populate('seller', 'username')
      .sort('-createdAt')
      .skip(skip)
      .limit(limit);

    const totalAuctions = await Auction.countDocuments();

    return res.status(200).json({
      status: 'success',
      message: 'Auctions retrieved successfully',
      results: auctions.length,
      total: totalAuctions,
      page,
      totalPages: Math.ceil(totalAuctions / limit),
      data: auctions
    });
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
};

// Get a single auction
export const getAuction = async (req, res) => {
  try {
    const auction = await Auction.findById(req.params.id)
      .populate('seller', 'username');

    if (!auction) {
      return res.status(404).json({ status: false, message: 'Auction not found' });
    }

    res.status(200).json({
      status: 'success',
      data: { auction }
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// Update an auction
export const updateAuction = async (req, res) => {
  try {
    const auction = await Auction.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!auction) {
      return res.status(404).json({ status: false, message: 'Auction not found' });
    }

    return res.status(200).json({
      status: 'success',
      message: 'Auction updated successfully',
      data: auction
    });
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
};

// Delete an auction
export const deleteAuction = async (req, res) => {
  try {
    const auction = await Auction.findByIdAndDelete(req.params.id);

    if (!auction) {
      return res.status(404).json({status: false, message: 'Auction not found' });
    }

    return res.status(200).json({
      status: 'success',
      message: 'Auction deleted successfully',
    });
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
};

// export const getAuctionBids = async (req, res) => {
//   try {
//     const bids = await Bid.find({ auction: req.params.id })
//       .populate('user', 'username')
//       .sort('-createdAt');

//     res.status(200).json({
//       status: 'success',
//       results: bids.length,
//       data: { bids }
//     });
//   } catch (err) {
//     res.status(400).json({ error: err.message });
//   }
// };