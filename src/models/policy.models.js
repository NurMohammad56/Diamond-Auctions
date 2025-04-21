import mongoose, { Schema } from "mongoose";


const policySchema = new Schema({
    text: {
        type: String,
        required: true,
    }
}, { timestamps: true });
export const Policy = mongoose.model("Policy", policySchema);