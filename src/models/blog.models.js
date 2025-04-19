import mongoose, {Schema} from 'mongoose';

const CommentSchema = new Schema({
  name: { type: String, required: true },
  email: { type: String, required: true },
  message: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

const BlogSchema = new Schema({
  title: { type: String, required: true },
  content: { type: String, required: true },
  image: { type: String }, 
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  comments: [CommentSchema], 
});

export const Blog = mongoose.model('Blog', BlogSchema);