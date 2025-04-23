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
            imageUrl = uploadResult.secure_url;
        }

        const category = await Category.create({
            name,
            description,
            image: imageUrl,
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

        // Check if categoryId is valid
        if (!categoryId) {
            return res.status(400).json({ status: false, message: 'Category ID is required' });
        }

        // Find the category first
        const category = await Category.findById(categoryId);
        if (!category) {
            return res.status(404).json({ status: false, message: 'Category not found' });
        }

        // Validate input
        if (!name && !description && !req.file) {
            return res.status(400).json({
                status: false,
                message: 'At least one of name, description, or image is required for update',
            });
        }

        // Handle image upload
        if (req.file) {
            const uploadResult = await uploadOnCloudinary(req.file.buffer);
            category.imageUrl = uploadResult.secure_url;
        }

        // Only update fields that are provided
        if (name) category.name = name;
        if (description) category.description = description;
        category.updatedAt = new Date();

        const updatedCategory = await category.save();

        return res.status(200).json({
            status: true,
            message: 'Category updated successfully',
            data: updatedCategory,
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
            .select('name description image');

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
            .select('name description image');

        // Fetch auctions for each category
        const categoriesWithAuctions = await Promise.all(
            categories.map(async (category) => {
                const auctions = await Auction.find({ category: category._id })
                    .populate('category', 'name')
                    .populate('seller', 'username')
                    .select('title description caratWeight currentBid images status startTime endTime')
                    .sort('-createdAt');

                return {
                    _id: category._id,
                    name: category.name,
                    description: category.description,
                    image: category.image,
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