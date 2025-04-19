import { Blog } from "../models/blog.models.js";
import { uploadOnCloudinary } from "../utilty/cloudinary.utilty.js";

// Create a Blog Post
export const createBlog = async (req, res) => {
    try {
        const { title, content } = req.body;
        if (!title || !content) {
            return res.status(400).json({ status: false, message: 'Title and content are required' });
        }

        const existingBlog = await Blog.findOne({ title });
        if (existingBlog) {
            return res.status(400).json({ status: false, message: 'Blog post with this title already exists' });
        }

        let imageUrl = null;
        if (req.file) {
            const uploadResult = await uploadOnCloudinary(req.file.buffer);
            imageUrl = uploadResult.secure_url;
        }

        const blog = new Blog({
            title,
            content,
            image: imageUrl,
            createdAt: new Date(),
            updatedAt: new Date(),
        });

        await blog.save();
        return res.status(201).json({
            status: true,
            message: 'Blog post created successfully',
            data: blog,
        });
    } catch (err) {
        console.error('Error in createBlog:', err.message);
        return res.status(500).json({ status: false, message: err.message });
    }
};

// // Get All Blog Posts
// export const getBlogs = async (_, res) => {
//     try {
//         const blogs = await Blog.find().sort({ createdAt: -1 });
//         return res.status(200).json({
//             status: true,
//             message: 'Blog posts retrieved successfully',
//             results: blogs.length,
//             data: blogs,
//         });
//     } catch (err) {
//         console.error('Error in getBlogs:', err.message);
//         return res.status(500).json({ status: false, message: err.message });
//     }
// };

// // Get a Single Blog Post
// export const getBlog = async (req, res) => {
//     try {
//         const blog = await Blog.findById(req.params.id);
//         if (!blog) {
//             return res.status(404).json({ status: false, message: 'Blog post not found' });
//         }
//         return res.status(200).json({
//             status: true,
//             message: 'Blog post retrieved successfully',
//             data: blog,
//         });
//     } catch (err) {
//         console.error('Error in getBlog:', err.message);
//         return res.status(500).json({ status: false, message: err.message });
//     }
// };

// // Update a Blog Post
// export const updateBlog = async (req, res) => {
//     try {
//         const { id } = req.params;
//         const { title, content } = req.body;

//         // Validate input
//         if (!title && !content && !req.file) {
//             return res.status(400).json({
//                 status: false,
//                 message: 'At least one of title, content, or image is required',
//             });
//         }

//         // Find blog post
//         const blog = await Blog.findById(id);
//         if (!blog) {
//             return res.status(404).json({
//                 status: false,
//                 message: 'Blog post not found',
//             });
//         }

//         // Handle image upload if file is provided
//         if (req.file) {
//             const uploadResult = await uploadOnCloudinary(req.file.buffer);
//             blog.image = uploadResult.secure_url;
//         }

//         // Update fields if provided
//         if (title) blog.title = title;
//         if (content) blog.content = content;
//         blog.updatedAt = new Date();

//         await blog.save();

//         return res.status(200).json({
//             status: true,
//             message: 'Blog post updated successfully',
//             data: blog,
//         });
//     } catch (err) {
//         console.error('Error in updateBlog:', err.message);
//         return res.status(500).json({
//             status: false,
//             message: 'Server error: ' + err.message,
//         });
//     }
// };

// // Delete a Blog Post
// export const deleteBlog = async (req, res) => {
//     try {
//         const blog = await Blog.findByIdAndDelete(req.params.id);
//         if (!blog) {
//             return res.status(404).json({ status: false, message: 'Blog post not found' });
//         }
//         return res.status(200).json({
//             status: true,
//             message: 'Blog post deleted successfully',
//         });
//     } catch (err) {
//         console.error('Error in deleteBlog:', err.message);
//         return res.status(500).json({ status: false, message: err.message });
//     }
// };

// // Add a Comment to a Blog Post
// export const addComment = async (req, res) => {
//     try {
//         const { name, email, message } = req.body;
//         if (!name || !email || !message) {
//             return res.status(400).json({ status: false, message: 'Name, email, and message are required' });
//         }

//         const blog = await Blog.findById(req.params.id);
//         if (!blog) {
//             return res.status(404).json({ status: false, message: 'Blog post not found' });
//         }

//         const comment = {
//             name,
//             email,
//             message,
//             createdAt: new Date(),
//         };

//         blog.comments.push(comment);
//         await blog.save();

//         return res.status(201).json({
//             status: true,
//             message: 'Comment added successfully',
//             data: comment,
//         });
//     } catch (err) {
//         console.error('Error in addComment:', err.message);
//         return res.status(500).json({ status: false, message: err.message });
//     }
// };

// // Get Comments for a Blog Post
// export const getComments = async (req, res) => {
//     try {
//         const blog = await Blog.findById(req.params.id);
//         if (!blog) {
//             return res.status(404).json({
//                 status: false, message: 'Blog post not found'
//             });
//         }
//         return res.status(200).json({
//             status: true,
//             message: 'Comments retrieved successfully',
//             results: blog.comments.length,
//             data: blog.comments,
//         });
//     }
//     catch (err) {
//         console.error('Error in getComments:', err.message);
//         return res.status(500).json({ status: false, message: err.message });
//     }
// }

// // Delete a Comment from a Blog Post
// export const deleteComment = async (req, res) => {
//     try {
//         const blog = await Blog.findById(req.params.id);
//         if (!blog) {
//             return res.status(404).json({ status: false, message: 'Blog post not found' });
//         }
//         const commentIndex = blog.comments.findIndex(comment => comment._id?.toString() === req.params.commentId);
//         if (commentIndex === -1) {
//             return res.status(404).json({ status: false, message: 'Comment not found' });
//         }
//         blog.comments.splice(commentIndex, 1);
//         await blog.save();
//         return res.status(200).json({
//             status: true,
//             message: 'Comment deleted successfully',
//         });
//     }
//     catch (err) {
//         console.error('Error in deleteComment:', err.message);
//         return res.status(500).json({ status: false, message: err.message });
//     }
// }