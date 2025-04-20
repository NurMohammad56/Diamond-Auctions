import mongoose, { Schema } from 'mongoose';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const userSchema = new Schema({
    username: {
        type: String,
        required: true,
        unique: true,
        trim: true,
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
    },
    password: {
        type: String,
        required: true,
        minlength: 6,
    },
    firstName: String,
    lastName: String,
    phone: String,
    address: {
        street: String,
        city: String,
        country: String,
        postalCode: String,
        taxId: String,
    },
    image: {
        type: String,
    },
    bio: {
        type: String,
    },
    role: {
        type: String,
        enum: ['bidder', 'seller', 'admin'],
        default: 'bidder',
    },
    sellerId: { type: String, unique: true },
    otp: {
        type: String,
    },
    otpExpires: {
        type: Date,
    },
    refreshToken: {
        type: String,
    },
}, { timestamps: true });

// Password hashing middleware
userSchema.pre('save', async function (next) {
    if (!this.isModified('password')) return next();
    this.password = await bcrypt.hash(this.password, 12);
    next();
});

// Method to check password
userSchema.methods.isValidPassword = function (password) {
    if (!password || !this.password) {
        throw new Error("Password or hashed password is missing");
    }

    return bcrypt.compare(password, this.password);
};

// generate access token
userSchema.methods.generateAccessToken = function () {
    return jwt.sign(
        {
            _id: this._id,
        },
        process.env.ACCESS_TOKEN_SECRET,
        {
            expiresIn: process.env.ACCESS_TOKEN_EXPIRY,
        }
    );
};

// generate refresh token
userSchema.methods.generateRefreshToken = function () {
    return jwt.sign(
        {
            _id: this._id,
        },
        process.env.REFRESH_TOKEN_SECRET,
        {
            expiresIn: process.env.REFRESH_TOKEN_EXPIRY,
        }
    );
};

export const User = mongoose.model('User', userSchema);