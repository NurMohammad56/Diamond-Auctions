import mongoose, { Schema } from "mongoose";


const aboutUsSchema = new Schema({
    text: {
        type: String,
        required: true,
        trim: true
    },
    image: {
        type: String,
        required: true
    },
});


export const AboutUs = mongoose.model('AboutUs', aboutUsSchema);