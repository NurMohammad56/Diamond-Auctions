import { Auction } from '../models/auction.models.js';
import { Category } from '../models/category.models.js';
import { uploadOnCloudinary } from '../utilty/cloudinary.utilty.js';


// Create a new auction with image upload
export const createAuctionData = async (req, res) => {
  try {
    const { categoryId, ...rest } = req.body;

    // Validate category exists
    const categoryDoc = await Category.findById(categoryId);
    if (!categoryDoc) {
      return res.status(400).json({ status: false, message: 'Invalid category ID' });
    }

    // Handle image uploads
    const imageUploadPromises = [];
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        imageUploadPromises.push(uploadOnCloudinary(file.buffer));
      }
    }

    const uploadResults = await Promise.all(imageUploadPromises);
    const imageUrls = uploadResults.map(result => result.secure_url);

    // Create auction
    const auction = await Auction.create({
      ...rest,
      category: categoryDoc._id,
      seller: req.user.id,
      images: imageUrls
    });

    // Populate category and seller in response
    const populatedAuction = await Auction.findById(auction._id)
      .populate('category', 'name')
      .populate('seller', 'username');

    return res.status(201).json({
      status: 'success',
      data: populatedAuction
    });
  } catch (err) {
    console.error('Error creating auction with images:', err.message);
    return res.status(400).json({ status: false, message: err.message });
  }
};

// Get all auctions with pagination and advanced filtering
export const getAllAuctions = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      status, 
      category, 
      caratWeight, 
      timeRange, 
      typeOfSales, 
      searchQuery 
    } = req.query;
    
    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    
    // Create filter object
    const filter = {};
    
    // Status filtering
    if (status === 'active') {
      filter.status = { $ne: 'cancelled' };
    } else if (status) {
      filter.status = status;
    }
    
    // Category filtering
    if (category) {
      const categoryNames = category.trim();
      const categoryDocs = await Category.find({ name: { $in: categoryNames } });

      if (categoryDocs.length === 0) {
        return res.status(404).json({ status: false, message: 'No matching categories found' });
      }

      const categoryIds = categoryDocs.map(cat => cat._id);
      filter.category = { $in: categoryIds };
    }

    // Carat weight filtering
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

    // Time range filtering
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

    // Type of sales filtering
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

    // Text search
    if (searchQuery) {
      filter.$text = { $search: searchQuery };
    }

    const auctions = await Auction.find(filter)
      .populate('seller', 'username')
      .populate('category', 'name')
      .sort('-createdAt')
      .skip(skip)
      .limit(parseInt(limit, 10));

    const totalAuctions = await Auction.countDocuments(filter);

    return res.status(200).json({
      status: 'success',
      message: 'Auctions retrieved successfully',
      results: auctions.length,
      total: totalAuctions,
      page: parseInt(page, 10),
      totalPages: Math.ceil(totalAuctions / parseInt(limit, 10)),
      data: auctions
    });
  } catch (err) {
    console.error('Error in getAllAuctions:', err.message);
    return res.status(400).json({ status: false, error: err.message });
  }
};

// Get all auctions for a specific seller
export const getAllAuctionsBySeller = async (req, res) => {
  try {
    const sellerId = req.user.id;
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const skip = (page - 1) * limit;
    const auctions = await Auction.find({ seller: sellerId })
      .populate('seller category', 'username name')
      .sort('-createdAt')
      .skip(skip)
      .limit(limit);


    const totalAuctions = await Auction.countDocuments({ seller: sellerId })


    return res.status(200).json({
      status: 'success',
      message: 'Auctions retrieved successfully',
      results: auctions.length,
      total: totalAuctions,
      page,
      totalPages: Math.ceil(totalAuctions / limit),
      data: auctions
    });
  }
  catch (err) {
    return res.status(400).json({ error: err.message });
  }
};

// Get a single auction
export const getAuction = async (req, res) => {
  try {
    const auction = await Auction.findById(req.params.id)
      .populate('seller', 'username')
      .populate('category', 'name')
      .populate("winner", "username")

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


// Update an auction with image handling
export const updateAuction = async (req, res) => {
  try {
    const { categoryId, ...rest } = req.body;

    // Validate category exists if categoryId is provided
    if (categoryId) {
      const categoryDoc = await Category.findById(categoryId);
      if (!categoryDoc) {
        return res.status(400).json({ status: false, message: 'Invalid category ID' });
      }
      rest.category = categoryDoc._id;
    }

    // Handle image uploads if new images are provided
    const imageUploadPromises = [];
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        imageUploadPromises.push(uploadOnCloudinary(file.buffer));
      }
    }

    const uploadResults = await Promise.all(imageUploadPromises);
    const imageUrls = uploadResults.map(result => result.secure_url);

    if (imageUrls.length > 0) {
      rest.images = imageUrls; // Update images if new ones are uploaded
    }

    // Update the auction
    const auction = await Auction.findByIdAndUpdate(
      req.params.id,
      rest,
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
    console.error('Error updating auction:', err.message);
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
// export const searchAuctions = async (req, res) => {
//   try {
//     const { category, caratWeight, timeRange, typeOfSales, searchQuery } = req.query;
//     const filter = {};

//     if (category) {
//       const categoryNames = category.trim();
//       const categoryDocs = await Category.find({ name: { $in: categoryNames } });

//       if (categoryDocs.length === 0) {
//         return res.status(404).json({ status: false, message: 'No matching categories found' });
//       }

//       const categoryIds = categoryDocs.map(cat => cat._id);
//       filter.category = { $in: categoryIds };
//     }

//     if (caratWeight) {
//       const ranges = {
//         'under-0.50': { $lt: 0.5 },
//         '0.50-1.00': { $gte: 0.5, $lt: 1.0 },
//         '1.00-2.00': { $gte: 1.0, $lt: 2.0 },
//         '2.00-3.00': { $gte: 2.0, $lt: 3.0 },
//         '3.00-plus': { $gte: 3.0 }
//       };
//       filter.caratWeight = ranges[caratWeight];
//     }

//     if (timeRange) {
//       const now = new Date();
//       const dateRanges = {
//         'today': { $gte: new Date(now.setHours(0, 0, 0, 0)) },
//         'yesterday': {
//           $gte: new Date(new Date().setDate(now.getDate() - 1)),
//           $lt: new Date(now.setHours(0, 0, 0, 0))
//         },
//         'last-7-days': { $gte: new Date(now.setDate(now.getDate() - 7)) },
//         'last-30-days': { $gte: new Date(now.setDate(now.getDate() - 30)) }
//       };
//       filter.createdAt = dateRanges[timeRange];
//     }

//     if (typeOfSales) {
//       switch (typeOfSales) {
//         case 'upcoming':
//           filter.status = 'upcoming';
//           filter.startTime = { $gt: new Date() };
//           break;
//         case 'latest':
//           filter.status = 'live';
//           filter.createdAt = { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) };
//           break;
//         case 'live-auction':
//           filter.status = 'live';
//           break;
//         case 'popular':
//           filter.bidCount = { $gt: 5 };
//           break;
//         case 'highest-bidding':
//           filter.currentBid = { $gt: 10000 };
//           break;
//       }
//     }

//     if (searchQuery) {
//       filter.$text = { $search: searchQuery };
//     }

//     const auctions = await Auction.find(filter)
//       .sort('-createdAt')
//       .populate('category', 'name')
//       .populate('seller', 'username');

//     return res.status(200).json({
//       status: true,
//       message: 'Success',
//       results: auctions.length,
//       data: auctions
//     });

//   } catch (err) {
//     console.error('Error in searchAuctions:', err.message);
//     return res.status(500).json({ status: false, message: 'Server error' });
//   }
// };

// Get all related auction for same category
export const getRelatedAuctions = async (req, res) => {
  try {
    const { category } = req.query;

    if (!category) {
      return res.status(400).json({ status: false, message: 'Category name is required in query' });
    }

    // Find the category by its name
    const categoryDoc = await Category.findOne({ name: category.trim() });
    if (!categoryDoc) {
      return res.status(404).json({ status: false, message: 'Category not found with given name' });
    }

    // Now find auctions with the found category ID
    const auctions = await Auction.find({ category: categoryDoc._id })
      .sort('-createdAt')
      .populate('category', 'name')
      .populate('seller', 'username');

    return res.status(200).json({
      status: true,
      message: 'Success',
      results: auctions.length,
      data: auctions
    });

  } catch (err) {
    console.error('Error in getRelatedAuctions:', err.message);
    return res.status(500).json({ status: false, message: 'Server error' });
  }
};

// Check and Update Scheduled Auctions to Live
export const checkScheduledAuctions = async () => {
  try {
    const currentTime = new Date();
    console.log('Current time (UTC) for scheduled check:', currentTime.toISOString());

    const auctions = await Auction.find({
      status: 'scheduled',
      startTime: { $lte: new Date(currentTime.toISOString()) },
    });

    console.log('Checking for scheduled auctions to start... Found:', auctions.length);
    if (auctions.length > 0) {
      auctions.forEach(auction => {
        console.log(`Auction ${auction._id}: startTime=${auction.startTime.toISOString()}`);
      });
    }

    for (const auction of auctions) {
      auction.status = 'live';
      await auction.save();
      console.log(`Auction ${auction._id} started. Status: ${auction.status}`);
    }
  } catch (err) {
    console.error('Error in checkScheduledAuctions:', err.message);
  }
};

// Check and Update Ended Auctions
export const checkEndedAuctions = async () => {
  try {
    const currentTime = new Date();
    console.log('Current time (UTC) for ended check:', currentTime.toISOString());

    const auctions = await Auction.find({
      status: 'live',
      endTime: { $lte: new Date(currentTime.toISOString()) },
    });

    console.log('Checking for ended auctions... Found:', auctions.length);
    if (auctions.length > 0) {
      auctions.forEach(auction => {
        console.log(`Auction ${auction._id}: endTime=${auction.endTime.toISOString()}`);
      });
    }

    for (const auction of auctions) {
      const highestBid = await Bid.findOne({ auction: auction._id })
        .sort('-amount')
        .populate('user', 'username');

      if (highestBid) {
        console.log(`Highest bid for auction ${auction._id}: Amount=${highestBid.amount}, User=${highestBid.user._id}`);
        if (highestBid.amount >= auction.reservePrice) {
          auction.status = 'completed';
          auction.winner = highestBid.user._id;
          auction.reserveMet = true;
        } else {
          auction.status = 'completed';
          auction.winner = null;
          auction.reserveMet = false;
        }
      } else {
        console.log(`No bids found for auction ${auction._id}`);
        auction.status = 'completed';
        auction.winner = null;
        auction.reserveMet = false;
      }

      await auction.save();
      console.log(`Auction ${auction._id} ended. Status: ${auction.status}, Winner: ${auction.winner}`);
    }
  } catch (err) {
    console.error('Error in checkEndedAuctions:', err.message);
  }
};

// Get Seller Dashboard Metrics
export const getSellerMatrics = async (req, res) => {
  try {
    const sellerId = req.user ? req.user._id : null;
    if (!sellerId) {
      return res.status(401).json({
        status: false,
        message: 'Authentication required: seller ID not found',
      });
    }

    // Fetch all auctions for the seller
    const auctions = await Auction.find({ seller: sellerId });

    // Calculate metrics
    let totalRevenue = 0;
    let successfulAuctions = 0;
    let liveAuctions = 0;
    let endAuctions = 0;

    auctions.forEach((auction) => {
      if (auction.status === 'completed') {
        endAuctions += 1;
        if (auction.winner) {
          successfulAuctions += 1;
          totalRevenue += auction.currentBid;
        }
      } else if (auction.status === 'live') {
        liveAuctions += 1;
      }
    });

    // Format the response
    const dashboardData = {
      totalRevenue: totalRevenue.toLocaleString('en-US', {
        style: 'currency',
        currency: 'USD',
      }),
      successfulAuctions,
      liveAuctions,
      endAuctions,
    };

    return res.status(200).json({
      status: true,
      message: 'Seller dashboard metrics retrieved successfully',
      data: dashboardData,
    });
  } catch (err) {
    console.error('Error in getSellerDashboard:', err.message);
    return res.status(500).json({ status: false, message: err.message });
  }
};

// Get live auctions for the homepage
export const getLiveAuctionsForHomePage = async (req, res) => {
  try {
    const auctions = await Auction.find({ status: 'live' })
      .populate('category', 'name')
      .populate('seller', 'username')
      .sort('-createdAt')
      .limit(10); // Limit to 10 live auctions

    return res.status(200).json({
      status: true,
      message: 'Live auctions retrieved successfully',
      results: auctions.length,
      data: auctions
    });
  } catch (err) {
    console.error('Error in getLiveAuctionsForHomePage:', err.message);
    return res.status(500).json({ status: false, message: err.message });
  }
};

// Get latest auctions for the homepage
export const getLatestAuctionsForHomePage = async (req, res) => {
  try {
    const auctions = await Auction.find()
      .populate('category', 'name')
      .populate('seller', 'username')
      .sort('-createdAt')
      .limit(10); // Limit to 10 latest auctions
    return res.status(200).json({
      status: true,
      message: 'Latest auctions retrieved successfully',
      results: auctions.length,
      data: auctions
    });
  }
  catch (err) {
    console.error('Error in getLatestAuctionsForHomePage:', err.message);
    return res.status(500).json({ status: false, message: err.message });
  }
};
