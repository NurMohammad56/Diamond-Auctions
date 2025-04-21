import { Policy } from "../models/policy.models.js";



export const createPolicy = async (req, res) => {
    try {
        const { text } = req.body;
        if (!text) {
            return res.status(400).json({ status: false, message: "Text is required" });
        }
        const policy = new Policy({
            text,
        });
        await policy.save();
        return res.status(201).json({ status: true, message: "Policy created successfully", data: policy });
    } catch (error) {
        return res.status(500).json({ status: false, message: error.message });
    }
}

export const getPolicy = async (_, res) => {
    try {
        const policy = await Policy.find();
        return res.status(200).json({ status: true, message: "Policy retrieved successfully", data: policy });
    } catch (error) {
        return res.status(500).json({ status: false, message: error.message });
    }
};

export const updatePolicy = async (req, res) => {
    try {
        const { id } = req.params;
        const { text } = req.body;
        const policy = await Policy.findById(id);
        if (!policy) {
            return res.status(404).json({ status: false, message: "Policy not found" });
        }
        policy.text = text || policy.text;
        await policy.save();
        return res.status(200).json({ status: true, message: "Policy updated successfully", data: policy });
    } catch (error) {
        return res.status(500).json({ status: false, message: error.message });
    }
};