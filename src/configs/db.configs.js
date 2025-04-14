import mongoose from "mongoose";

const dbconfig = async () => {
  try {
    const connect = await mongoose.connect(`${process.env.MONGODB_URI}`);

    console.log(`MongoDB connected | DB HOST: ${connect.connection.host}`);
  } catch (error) {
    console.log("Error connecting to MongoDB", error.message);
    process.exit(1);
  }
};

export default dbconfig;
