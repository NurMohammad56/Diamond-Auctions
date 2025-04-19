import  mongoose, {Schema} from 'mongoose';

const ContactUsSchema = new Schema({
  firstname: { type: String, required: true },
  lastname: { type: String, required: true },
  email: { type: String, required: true },
  phone: { type: String, required: true },
  subject: { type: String, required: true },
  message: { type: String, required: true },
},
{
  timestamps: true,
});

export const ContactUs = mongoose.model('ContactUs', ContactUsSchema);