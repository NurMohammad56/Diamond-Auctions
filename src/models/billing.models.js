import mongoose, {Schema} from "mongoose";
const billingSchema = new Schema(
  {
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  auction: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Auction",
    required: true,
  },
  fullName: {
    type: String,
    required: true,
  },
  address: {
    type: String,
    required: true,
  },
  paymentStatus: {
    type: String,
    enum: ['paid', 'unpaid'],
    default: 'unpaid',
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