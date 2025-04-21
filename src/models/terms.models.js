import mongoose, { Schema } from "mongoose";


const termsSchema = new Schema({
    text: {
        type: String,
        required: true,
    }
}, { timestamps: true });
export const Terms = mongoose.model("Terms", termsSchema);