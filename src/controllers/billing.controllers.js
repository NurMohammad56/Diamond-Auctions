import { Billing } from "../models/billing.models.js";
import { PaymentInfo } from "../models/paymentInfo.models.js";

// Create Billing
export const createBilling = async (req, res) => {
  try {
    const { fullName, address, email, phoneNumber } = req.body;
    const { auctionId } = req.params;
    const userId = req.user?._id;

    if (!userId) {
      return res.status(401).json({ message: "User not authenticated" });
    }

    if (!auctionId) {
      return res.status(400).json({ message: "Auction ID is required" });
    }

    const newBilling = new Billing({
      user: userId,
      auction: auctionId,
      fullName,
      address,
      email,
      phoneNumber
    });

    await newBilling.save();
    res.status(201).json({ message: "Billing information saved successfully!", data: newBilling });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get All Billings for Authenticated User
export const getBillings = async (req, res) => {
  try {
    const userId = req.user?._id;

    if (!userId) {
      return res.status(401).json({ message: "User not authenticated" });
    }

    const billings = await Billing.find({ user: userId })
      .populate("user", "username email") 
      .populate("auction", "title currentBid")
      .sort({ createdAt: -1 });

    if (billings.length === 0) {
      return res.status(404).json({ status: false, message: "No billing information found" });
    }

    res.status(200).json({ status: true, data: billings });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get Billing by ID for Authenticated User
export const getBillingById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?._id;

    if (!userId) {
      return res.status(401).json({ message: "User not authenticated" });
    }

    const billing = await Billing.findOne({ _id: id, user: userId }).populate("user", "username email");
    if (!billing) {
      return res.status(404).json({ message: "Billing information not found" });
    }

    res.status(200).json({ status: true, data: billing });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Update Billing for Authenticated User
export const updateBilling = async (req, res) => {
  try {
    const { id } = req.params;
    const { fullName, address, email, phoneNumber } = req.body;
    const userId = req.user?._id;

    if (!userId) {
      return res.status(401).json({ message: "User not authenticated" });
    }

    const updatedBilling = await Billing.findOneAndUpdate(
      { _id: id, user: userId },
      { fullName, address, email, phoneNumber },
      { new: true, runValidators: true }
    );

    if (!updatedBilling) {
      return res.status(404).json({ message: "Billing information not found" });
    }

    res.status(200).json({ message: "Billing information updated successfully!", data: updatedBilling });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Delete Billing for Authenticated User
export const deleteBilling = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?._id;

    if (!userId) {
      return res.status(401).json({ message: "User not authenticated" });
    }

    const deletedBilling = await Billing.findOneAndDelete({ _id: id, user: userId });
    if (!deletedBilling) {
      return res.status(404).json({ message: "Billing information not found" });
    }

    res.status(200).json({ message: "Billing information deleted successfully!" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};