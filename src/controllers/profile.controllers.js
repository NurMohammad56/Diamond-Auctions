import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utilty/cloudinary.utilty.js";

export const getUserProfile = async (req, res) => {
    const { id } = req.params;

    try {
        const user = await User.findById(id);

        if (!user) {
            return res.status(404).json({ status: false, message: "User not found" });
        }

        return res.status(200).json({
            status: true,
            message: "User profile retrieved successfully",
            data: user,
        });
    } catch (error) {
        console.error(error);

        return res.status(500).json({
            status: false,
            message: "Internal server error",
        });
    }
};

export const updateUserProfile = async (req, res) => {
    const { id } = req.params;
    const { firstName, lastName, phone, email, address, bio } = req.body;

    try {
        const user = await User.findById(id);
        if (!user) {
            return res.status(404).json({ status: false, message: "User not found" });
        }

        if (req.file) {
            const uploadImage = await uploadOnCloudinary(req.file.buffer);
            user.image = uploadImage.secure_url;
            await user.save();
        }

        const updatedUser = await User.findByIdAndUpdate(
            id,
            { firstName, lastName, phone, email, address, bio },
            { new: true }
        );

        return res.status(200).json({
            status: true,
            message: "Profile updated successfully",
            data: updatedUser,
        });
    } catch (error) {
        console.error(error);

        return res.status(500).json({
            status: false,
            message: "Internal server error",
        });
    }
};

export const updateUserPassword = async (req, res) => {
    const { currentPassword, newPassword, confirmPassword } = req.body;
    const { id } = req.params;

    try {
        const user = await User.findById(id);

        if (!user) {
            return res.status(404).json({ status: false, message: "User not found" });
        }

        const isMatch = await user.isValidPassword(currentPassword)
        if (!isMatch) {
            return res.status(400).json({
                status: false,
                message: "Current password is incorrect",
            });
        }

        if (newPassword !== confirmPassword) {
            return res.status(400).json({
                status: false,
                message: "New password and confirm password do not match",
            });
        }

        if (newPassword === currentPassword) {
            return res.status(400).json({
                status: false,
                message: "New password must be different from the current password",
            });
        }

        user.password = newPassword;

        await user.save({ validateBeforeSave: false });

        return res.status(200).json({
            status: true,
            message: "Password updated successfully",
        });
    } catch (error) {
        console.error(error);

        return res.status(500).json({
            status: false,
            message: "Internal server error",
        });
    }
};