import { User } from '../models/user.model.js';
import { sendMail } from '../utilty/email.utility.js';
import { generateOTP } from '../utilty/otp.utility.js'
import { error } from 'console';

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
        const { username, email, password, confirmPassword } = req.body;

        if (!username || !email || !password || !confirmPassword) {
            return res.status(400).json({ status: false, message: 'All fields are required' });
        }

        if (password !== confirmPassword) {
            return res.status(400).json({ status: false, message: 'Passwords do not match' });
        }

        const existingUser = await User.findOne({ $or: [{ email }, { username }] });
        if (existingUser) {
            return res.status(400).json({ status: false, message: 'User already exists' });
        }

        const newUser = await User.create({ username, email, password });
        await newUser.save();

        return res.status(201).json({
            status: true,
            message: 'User registered successfully',
            data: newUser
        });
    } catch (err) {
        return res.status(500).json({ status: false, message: error.message, });
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


// export const forgotPassword = async (req, res) => {
//     try {
//         const { email } = req.body;

//         const user = await User.findOne({ email });
//         if (!user) return res.status(404).json({ message: 'User not found' });

//         const otp = generateOTP();
//         const otpExpires = Date.now() + 10 * 60 * 1000;

//         user.otp = otp;
//         user.otpExpires = otpExpires;
//         await user.save();

//         await sendMail({
//             to: user.email,
//             subject: 'Your Password Reset OTP',
//             text: `Your OTP is ${otp}. It expires in 10 minutes.`,
//         });

//         res.status(200).json({ message: 'OTP sent to email' });
//     } catch (err) {
//         res.status(500).json({ message: 'Failed to send OTP', error: err.message });
//     }
// };

// export const resetPassword = async (req, res) => {
//     try {
//         const { email, otp, newPassword } = req.body;

//         const user = await User.findOne({
//             email,
//             otp,
//             otpExpires: { $gt: Date.now() },
//         });

//         if (!user) return res.status(400).json({ message: 'Invalid or expired OTP' });

//         user.password = newPassword;
//         user.otp = null;
//         user.otpExpires = null;
//         await user.save();

//         res.status(200).json({ message: 'Password reset successful' });
//     } catch (err) {
//         res.status(500).json({ message: 'Password reset failed', error: err.message });
//     }
// };
