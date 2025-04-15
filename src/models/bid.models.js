import mongoose, {Schema} from "mongoose";

const bidSchema = new Schema({
    amount: {
        type: Number,
        required: true,
    },
    auction: {
        type: Schema.Types.ObjectId,
        ref: 'Auction',
        required: true,
    },
    user: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    isAuto: {
        type: Boolean,
        default: false,
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
});

bidSchema.pre(/^find/, function (next) {
    this.populate({
        path: 'user',
        select: 'username',
    });
    next();
});

export const Bid = mongoose.model('Bid', bidSchema);