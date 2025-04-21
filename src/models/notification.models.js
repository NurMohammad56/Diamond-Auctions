import mongoose, { Schema } from 'mongoose';

const notificationSchema = new Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    auction: { type: mongoose.Schema.Types.ObjectId, ref: 'Auction', required: true },
    message: { type: String, required: true },
    type: { type: String, enum: ['outbid', 'newBid'], required: true },
    read: { type: Boolean, default: false },
},
    { timestamps: true });


export const Notification = mongoose.model('Notification', notificationSchema);