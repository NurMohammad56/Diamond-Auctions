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
      return res.status(404).json({ status: false, message: 'Auction not found' });
    }

    return res.status(200).json({
      status: 'success',
      message: 'Auction deleted successfully',
    });
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
};

// Search auctions
export const searchAuctions = async (req, res) => {
  try {
    const { category, caratWeight, timeRange, typeOfSales, searchQuery } = req.query;
    const filter = {};

    if (category) {
      filter.category = { $in: category.split(',') };
    }
    if (caratWeight) {
      const ranges = {
        'under-0.50': { $lt: 0.5 },
        '0.50-1.00': { $gte: 0.5, $lt: 1.0 },
        '1.00-2.00': { $gte: 1.0, $lt: 2.0 },
        '2.00-3.00': { $gte: 2.0, $lt: 3.0 },
        '3.00-plus': { $gte: 3.0 }
      };
      filter.caratWeight = ranges[caratWeight];
    }
    if (timeRange) {
      const now = new Date();
      const dateRanges = {
        'today': { $gte: new Date(now.setHours(0, 0, 0, 0)) },
        'yesterday': {
          $gte: new Date(new Date().setDate(now.getDate() - 1)),
          $lt: new Date(now.setHours(0, 0, 0, 0))
        },
        'last-7-days': { $gte: new Date(now.setDate(now.getDate() - 7)) },
        'last-30-days': { $gte: new Date(now.setDate(now.getDate() - 30)) }
      };
      filter.createdAt = dateRanges[timeRange];
    }
    if (typeOfSales) {
      switch (typeOfSales) {
        case 'upcoming':
          filter.status = 'upcoming';
          filter.startTime = { $gt: new Date() };
          break;
        case 'latest':
          filter.status = 'live';
          filter.createdAt = { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) };
          break;
        case 'live-auction':
          filter.status = 'live';
          break;
        case 'popular':
          filter.bidCount = { $gt: 5 };
          break;
        case 'highest-bidding':
          filter.currentBid = { $gt: 10000 };
          break;
      }
    }
    if (searchQuery) {
      filter.$text = { $search: searchQuery };
    }

    const auctions = await Auction.find(filter)
      .sort('-createdAt')
      .populate('seller', 'username');

    return res.status(200).json({
      status: true,
      message: "Success",
      results: auctions.length,
      data: auctions
    });
  } catch (err) {
    return res.status(400).json({ status: false, message: err.message });
  }
};

// Get all related auction for same category
export const getRelatedAuctions = async (req, res) => {
  try {
    const { category } = req.query;
    const auctions = await Auction.find({ category })
      .sort('-createdAt')
      .populate('seller', 'username');
    return res.status(200).json({
      status: true,
      message: "Success",
      results: auctions.length,
      data: auctions
    });

  }
  catch (err) {
    return res.status(400).json({ status: false, message: err.message });
  }
};