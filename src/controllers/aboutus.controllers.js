import { AboutUs } from "../models/aboutus.models.js";
import { uploadOnCloudinary } from "../utilty/cloudinary.utilty.js";

export const createAboutUs = async (req, res) => {
    try {
        const { text } = req.body;
        if (!text) {
            return res.status(400).json({ status: false, message: "Text and image are required" });
        }
        let imageUrl = null;
        if (req.file) {
            const uploadImage = await uploadOnCloudinary(req.file.buffer);
            imageUrl = uploadImage.secure_url;
        }
        const aboutUs = new AboutUs({
            text,
            image: imageUrl,
        });
        await aboutUs.save();
        return res.status(201).json({ status: true, message: "About Us created successfully", data: aboutUs });
    } catch (error) {
        return res.status(500).json({ status: false, message: error.message});
    }
};

export const getAboutUs = async (req, res) => {
    try {
        const aboutUs = await AboutUs.find();
        return res.status(200).json({ status: true, message: "About Us retrieved successfully", data: aboutUs });
    } catch (error) {
        return res.status(500).json({ status: false, message: error.message });
    }
};

export const updateAboutUs = async (req, res) => {
    try {
        const { id } = req.params;
        const { text } = req.body;
        const aboutUs = await AboutUs.findById(id);
        if (!aboutUs) {
            return res.status(404).json({ status: false, message: "About Us not found" });
        }
        if (req.file) {
            const uploadImage = await uploadOnCloudinary(req.file.buffer);
            aboutUs.image = uploadImage.secure_url;
        }
        aboutUs.text = text || aboutUs.text;
        await aboutUs.save();
        return res.status(200).json({ status: true, message: "About Us updated successfully", data: aboutUs });
    } catch (error) {
        return res.status(500).json({ status: false, message: error.message });
    }
};
