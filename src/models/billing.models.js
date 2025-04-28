import mongoose, {Schema} from "mongoose";
const billingSchema = new Schema({
  fullName: {
    type: String,
    required: true,
  },
  address: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    match: [/^\S+@\S+\.\S+$/, 'Please use a valid email address.'],
  },
  phoneNumber: {
    type: String,
    required: true,
  },
},
{
    timestamps: true,
}
);

export const Billing = mongoose.model("Billing", billingSchema);