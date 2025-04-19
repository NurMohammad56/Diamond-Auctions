import { Auction } from '../models/auction.models.js';
import { Category } from '../models/category.models.js';
import { uploadOnCloudinary } from '../utilty/cloudinary.utilty.js'; // Assuming you have a file upload utility

// Create a new category (admin only)
export const createCategory = async (req, res) => {
    try {
        const { name, description } = req.body;

        // Validate input
        if (!name) {
            return res.status(400).json({ status: false, message: 'Category name is required' });
        }

        // Check if category already exists
        const existingCategory = await Category.findOne({ name });
        if (existingCategory) {
            return res.status(400).json({ status: false, message: 'Category already exists' });
        }

        // Handle file upload
        let imageUrl = null;
        if (req.file) {
            const uploadResult = await uploadOnCloudinary(req.file.buffer);
            imageUrl = uploadResult.secure_url; // Extract the secure URL
        }

        const category = await Category.create({
            name,
            description,
            image: imageUrl, // Save the URL as a string
            createdBy: req.user.id
        });

        return res.status(201).json({
            status: true,
            message: 'Category created successfully',
            data: category
        });
    } catch (err) {
        console.error('Error in createCategory:', err.message);
        return res.status(400).json({ status: false, message: err.message });
    }
};

// Update a category (admin only)
export const updateCategory = async (req, res) => {
    try {
        const { categoryId } = req.params;
        const { name, description } = req.body;

        // Validate input
        if (!name) {
            return res.status(400).json({ status: false, message: 'Category name is required' });
        }

        // Handle file upload
        let imageUrl = null;
        if (req.file) {
            imageUrl = await uploadFile(req.file.buffer);
        }

        // Find and update category
        const updateData = {
            name,
            description,
            updatedAt: new Date()
        };

        if (imageUrl) {
            updateData.imageUrl = imageUrl;
        }

        const category = await Category.findByIdAndUpdate(
            categoryId,
            updateData,
            { new: true, runValidators: true }
        );

        if (!category) {
            return res.status(404).json({ status: false, message: 'Category not found' });
        }

        return res.status(200).json({
            status: true,
            message: 'Category updated successfully',
            data: category
        });
    } catch (err) {
        console.error('Error in updateCategory:', err.message);
        return res.status(400).json({ status: false, message: err.message });
    }
};

// Delete a category (admin only)
export const deleteCategory = async (req, res) => {
    try {
        const { categoryId } = req.params;

        // Check if category is used by any auctions
        const auctionCount = await Auction.countDocuments({ category: categoryId });
        if (auctionCount > 0) {
            return res.status(400).json({
                status: false,
                message: 'Cannot delete category; it is used by existing auctions'
            });
        }

        // Delete category
        const category = await Category.findByIdAndDelete(categoryId);
        if (!category) {
            return res.status(404).json({ status: false, message: 'Category not found' });
        }

        return res.status(200).json({
            status: true,
            message: 'Category deleted successfully'
        });
    } catch (err) {
        console.error('Error in deleteCategory:', err.message);
        return res.status(400).json({ status: false, message: err.message });
    }
};

// Get all categories (for sellers and others)
export const getAllCategories = async (req, res) => {
    try {
        const categories = await Category.find()
            .sort('name')
            .select('name description');

        return res.status(200).json({
            status: true,
            message: 'Categories retrieved successfully',
            results: categories.length,
            data: categories
        });
    } catch (err) {
        console.error('Error in getAllCategories:', err.message);
        return res.status(400).json({ status: false, message: err.message });
    }
};

// Get all categories with their auctions
export const getCategoriesWithAuctions = async (req, res) => {
    try {
      const categories = await Category.find()
        .sort('name')
        .select('name description');
  
      // Fetch auctions for each category
      const categoriesWithAuctions = await Promise.all(
        categories.map(async (category) => {
          const auctions = await Auction.find({ category: category._id })
            .populate('category', 'name')
            .populate('seller', 'username')
            .select('title description caratWeight currentBid status startTime endTime')
            .sort('-createdAt');
  
          return {
            _id: category._id,
            name: category.name,
            description: category.description,
            auctions: auctions
          };
        })
      );
  
      return res.status(200).json({
        status: true,
        message: 'Categories with auctions retrieved successfully',
        results: categoriesWithAuctions.length,
        data: categoriesWithAuctions
      });
    } catch (err) {
      console.error('Error in getCategoriesWithAuctions:', err.message);
      return res.status(400).json({ status: false, message: err.message });
    }

}