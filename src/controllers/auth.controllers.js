import { User } from '../models/user.model.js';
import { sendMail } from '../utilty/email.utility.js';
import { generateOTP } from '../utilty/otp.utility.js'

// generate token
const generateAccessAndRefreshToken = async (userId) => {
    try {
        const user = await User.findById(userId);
        const accessToken = await user.generateAccessToken();
        const refreshToken = await user.generateRefreshToken();

        user.refreshToken = refreshToken;
        await user.save({ validateBeforeSave: true });

        return { accessToken, refreshToken };
    } catch (error) {
        return {
            status: false,
            message: error.message,
        };
    }
};

// User register
export const register = async (req, res) => {
    try {
        const { username, email, password, confirmPassword, role } = req.body;

        if (!username || !email || !password || !confirmPassword || !role) {
            return res.status(400).json({ status: false, message: 'All fields are required' });
        }

        if (password !== confirmPassword) {
            return res.status(400).json({ status: false, message: 'Passwords do not match' });
        }

        if (!['bidder', 'seller'].includes(role)) {
            return res.status(400).json({ status: false, message: 'Invalid role selected' });
        }

        const existingUser = await User.findOne({ $or: [{ email }, { username }] });
        if (existingUser) {
            return res.status(400).json({ status: false, message: 'User already exists' });
        }

        const newUser = await User.create({ username, email, password, role });
        await newUser.save();

        return res.status(201).json({
            status: true,
            message: 'User registered successfully',
            data: newUser
        });
    } catch (err) {
        return res.status(500).json({ status: false, message: err.message });
    }
};

// User login
export const login = async (req, res) => {
    try {
        const { username, password } = req.body;

        const user = await User.findOne({ username }).select('+password');
        if (!user || !(await user.isValidPassword(password))) {
            return res.status(400).json({ status: false, message: 'Invalid credentials' });
        }

        const { accessToken, refreshToken } = await generateAccessAndRefreshToken(user._id)

        user.refreshToken = refreshToken;
        await user.save();

        return res.status(200).json({
            status: true,
            message: 'Login successful',
            accessToken,
            refreshToken,
        });
    } catch (err) {
        return res.status(500).json({ status: true, message: error.message });
    }
};

// User logout
export const logout = async (req, res) => {
    try {
        const user = req.user;

        if (!user) {
            return res
                .status(400)
                .json({ status: false, message: "User not found." });
        }

        await User.findByIdAndUpdate(user._id, { refreshToken: null });

        return res
            .status(200)
            .json({ status: true, message: "Logged out successfully" });
    } catch (error) {
        return res.status(500).json({
            status: false,
            message: error.message,
        });
    }
};

// Forget password
export const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;

        const user = await User.findOne({ email });
        if (!user) return res.status(404).json({ status: false, message: 'User not found' });

        const otp = generateOTP();
        const otpExpires = Date.now() + 10 * 60 * 1000;

        user.otp = otp;
        user.otpExpires = otpExpires;
        await user.save();

        await sendMail({
            to: user.email,
            subject: 'Your Password Reset OTP',
            text: `Your OTP is ${otp}. It expires in 10 minutes.`,
        });

        return res.status(200).json({ status: true, message: 'OTP sent to email' });
    } catch (err) {
        return res.status(500).json({ status: false, message: error.message });
    }
};

// Verify otp
export const verifyOtp = async (req, res) => {
    try {
        const { otp } = req.body;

        const user = await User.findOne({ otp });

        if (user.otp !== otp || new Date() > user.otpExpires) {
            return res
                .status(400)
                .json({ status: false, message: "Invalid or expired OTP" });
        }

        user.otp = undefined;
        user.otpExpires = undefined;
        await user.save();

        return res.json({ status: true, message: "OTP verified successfully" });
    } catch (error) {
        console.log("Error in verifyOtp:", error);
        return res.status(500).json({ status: false, message: error.message });
    }
};

// Resend otp
export const resendOTP = async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({
                status: false,
                message: "Email is required to resend OTP",
            });
        }

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({
                status: false,
                message: "User not found",
            });
        }

        const newOtp = generateOTP();
        const otpExpires = new Date(Date.now() + 10 * 60 * 1000);

        user.otp = newOtp;
        user.otpExpires = otpExpires;
        await user.save();

        await sendMail({
            to: user.email,
            subject: 'Your Password Reset OTP',
            text: `Your OTP is ${otp}. It expires in 10 minutes.`,
        });

        return res.status(200).json({
            status: true,
            message: "OTP has been resent successfully",
        });
    } catch (error) {
        return res.status(500).json({ status: false, message: error.message });
    }
};

// Resett password
export const resetPassword = async (req, res) => {
    try {
        const { oldPassword, newPassword } = req.body;

        if (!oldPassword || !newPassword) {
            return res.status(400).json({
                status: false,
                message: "Old password and new password are required",
            });
        }

        const user = await User.findOne();
        if (!user)
            return res.status(404).json({ status: false, message: "User not found" });

        const isOldPasswordCorrect = await user.isValidPassword(oldPassword);
        if (!isOldPasswordCorrect)
            return res
                .status(400)
                .json({ status: false, message: "Old password is incorrect" });

        user.password = newPassword;
        await user.save();

        // Send a success response
        return res.status(200).json({
            status: true,
            message: "Password updated successfully",
        });
    } catch (error) {
        return res.status(500).json({ status: false, message: error.message });
    }
};