import { Terms } from "../models/terms.models.js";


export const createTerms = async (req, res) => {
    try {
        const { text } = req.body;
        if (!text) {
            return res.status(400).json({ status: false, message: "Text is required" });
        }
        const terms = new Terms({
            text,
        });
        await terms.save();
        return res.status(201).json({ status: true, message: "Terms created successfully", data: terms });
    } catch (error) {
        return res.status(500).json({ status: false, message: error.message });
    }
}

export const getTerms = async (_, res) => {
    try {
        const terms = await Terms.find();
        return res.status(200).json({ status: true, message: "Terms retrieved successfully", data: terms });
    } catch (error) {
        return res.status(500).json({ status: false, message: error.message });
    }
};

export const updateTerms = async (req, res) => {
    try {
        const { id } = req.params;
        const { text } = req.body;
        const terms = await Terms.findById(id);
        if (!terms) {
            return res.status(404).json({ status: false, message: "Terms not found" });
        }
        terms.text = text || terms.text;
        await terms.save();
        return res.status(200).json({ status: true, message: "Terms updated successfully", data: terms });
    } catch (error) {
        return res.status(500).json({ status: false, message: error.message });
    }
};