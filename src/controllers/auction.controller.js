import { Auction } from '../models/auction.models.js';
import { Bid } from '../models/bid.models.js';
import { uploadOnCloudinary } from '../utilty/cloudinary.utilty.js';


export const createAuctionData = async (req, res) => {
  try {
    const auction = await Auction.create({
      ...req.body,
      seller: req.user.id
    });

    res.status(201).json({
      status: 'success',
      data: auction
    });
  } catch (err) {
    console.error("Error creating auction data:", err);
    res.status(400).json({ error: err.message });
  }
};

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
      return res.status(404).json({ error: 'Auction not found' });
    }

    auction.images = auction.images ? auction.images.concat(imageUrls) : imageUrls;
    await auction.save();

    res.status(200).json({
      status: 'success',
      data: imageUrls
    });
  } catch (err) {
    console.error("Error uploading auction images:", err);
    res.status(400).json({ error: err.message });
  }
};


// export const getAllAuctions = async (_, res) => {
//   try {
//     const auctions = await Auction.find()
//       .populate('seller', 'username')
//       .sort('-createdAt');

//     res.status(200).json({
//       status: 'success',
//       results: auctions.length,
//       data: { auctions }
//     });
//   } catch (err) {
//     res.status(400).json({ error: err.message });
//   }
// };

// export const getAuction = async (req, res) => {
//   try {
//     const auction = await Auction.findById(req.params.id)
//       .populate('seller', 'username');

//     if (!auction) {
//       return res.status(404).json({ error: 'Auction not found' });
//     }

//     res.status(200).json({
//       status: 'success',
//       data: { auction }
//     });
//   } catch (err) {
//     res.status(400).json({ error: err.message });
//   }
// };

// export const updateAuction = async (req, res) => {
//   try {
//     const auction = await Auction.findByIdAndUpdate(
//       req.params.id,
//       req.body,
//       { new: true, runValidators: true }
//     );

//     if (!auction) {
//       return res.status(404).json({ error: 'Auction not found' });
//     }

//     res.status(200).json({
//       status: 'success',
//       data: { auction }
//     });
//   } catch (err) {
//     res.status(400).json({ error: err.message });
//   }
// };

// export const deleteAuction = async (req, res) => {
//   try {
//     const auction = await Auction.findByIdAndDelete(req.params.id);

//     if (!auction) {
//       return res.status(404).json({ error: 'Auction not found' });
//     }

//     res.status(204).json({
//       status: 'success',
//       data: null
//     });
//   } catch (err) {
//     res.status(400).json({ error: err.message });
//   }
// };

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