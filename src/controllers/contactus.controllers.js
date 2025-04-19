import { ContactUs } from "../models/contactus.models.js";


// Create a Contact Us message
export const createContactUs = async (req, res) => {
    try {
        const { firstname, lastname, email, phone, subject, message } = req.body;
        if (!firstname || !lastname || !email || !phone || !subject || !message) {
            return res.status(400).json({ status: false, message: 'All fields are required' });
        }
        const contactUs = new ContactUs({
            firstname,
            lastname,
            email,
            phone,
            subject,
            message,
        });
        await contactUs.save();
        return res.status(201).json({
            status: true,
            message: 'Contact Us message created successfully',
            data: contactUs,
        });
    }
    catch (error) {
        console.error('Error in createContactUs:', err.message);
        return res.status(500).json({ status: false, message: err.message });
    }
}

// Get all Contact Us messages
export const getAllContactUs = async (req, res) => {
    try {
        const {page = 1, limit = 10} = req.query;
        const skip = (page - 1) * limit;

        const contactUs = await ContactUs.find()
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);
        return res.status(200).json({
            status: true,
            message: 'Contact Us messages retrieved successfully',
            results: contactUs.length,
            totalPages: Math.ceil(contactUs.length / limit),
            currentPage: parseInt(page),
            data: contactUs,
        });
    }
    catch (err) {
        console.error('Error in getAllContactUs:', err.message);
        return res.status(500).json({ status: false, message: err.message });
    }
}

