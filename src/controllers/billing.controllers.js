import { Billing } from "../models/billing.models.js";
export const createBilling = async (req, res) => {
  try {
    const { fullName, address, email, phoneNumber } = req.body;

    const newBilling = new Billing({
      fullName,
      address,
      email,
      phoneNumber,
    });

    await newBilling.save();
    res.status(201).json({ message: 'Billing information saved successfully!' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getBillings = async (req, res) => {
  try {
    const billings = await Billing.find().sort({ createdAt: -1 });
    res.status(200).json(billings);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};