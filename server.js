import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import compression from "compression";
import { createServer } from "http";
import { Server } from "socket.io";
import "./src/utilty/auctions.cron.utility.js";
import dbconfig from "./src/configs/db.configs.js";
// Load env vars
dotenv.config({ path: "./.env" });
// Allowed CORS origins
// const allowedOrigins = ["http://localhost:3000", "http://localhost:5100"];
// Initialize express app
const app = express();
const httpServer = createServer(app);
// Initialize Socket.IO
const io = new Server(httpServer, {
  cors: {
    origin: process.env.ALLOWORIGIN,
    methods: ["GET", "POST"],
    credentials: true,
  },
});
// Middlewares
app.use(cors({ origin: process.env.ALLOWORIGIN, credentials: true }));
app.use(helmet());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(compression());
// Import routes
import auctionRoutes from "./src/routes/auction.routes.js";
import authRoutes from "./src/routes/auth.routes.js";
import wishlistRoutes from "./src/routes/wishlist.routes.js";
import bidRoutes from "./src/routes/bid.routes.js";
import categoryRoutes from "./src/routes/category.routes.js";
import blogRoutes from "./src/routes/blog.routes.js";
import contactUsRoutes from "./src/routes/contactus.routes.js";
import profileRoutes from "./src/routes/profile.routes.js";
import adminRoutes from "./src/routes/admin.routes.js";
import aboutUsRoutes from "./src/routes/aboutus.routes.js";
import policyRoutes from "./src/routes/policy.routes.js";
import termsRoutes from "./src/routes/terms.routes.js";
import paymentRoutes from "./src/routes/payment.routes.js";
import billingRoutes from "./src/routes/billing.routes.js";


// Mount all routes
app.use("/api/v1/auctions", auctionRoutes);
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/bids", bidRoutes);
app.use("/api/v1/wishlist", wishlistRoutes);
app.use("/api/v1/admin/categories", categoryRoutes);
app.use("/api/v1/admin/blogs", blogRoutes);
app.use("/api/v1/contactus", contactUsRoutes);
app.use("/api/v1/profile", profileRoutes);
app.use("/api/v1/admin", adminRoutes);
app.use("/api/v1/aboutus", aboutUsRoutes);
app.use("/api/v1/policy", policyRoutes);
app.use("/api/v1/terms", termsRoutes);
app.use("/api/v1", paymentRoutes);
app.use("/api/v1/billing", billingRoutes);


// Initialize Socket.IO events
io.on("connection", (socket) => {
  console.log("Client connected:", socket.id);
  // Join user room
  socket.on("joinUser", (userId) => {
    socket.join(userId);
    console.log(`User ${socket.id} joined room: ${userId}`);
  });
  // Join auction room
  socket.on("joinAuction", (auctionId) => {
    socket.join(auctionId);
    console.log(`Client ${socket.id} joined auction ${auctionId}`);
  });
  // Leave auction room
  socket.on("leaveAuction", (auctionId) => {
    socket.leave(auctionId);
    console.log(`Client ${socket.id} left auction ${auctionId}`);
  });
  // On disconnect
  socket.on("disconnect", () => {
    console.log("Client disconnected:", socket.id);
  });
});
// Connect to DB and start server
dbconfig()
  .then(() => {
    const PORT = process.env.PORT || 5003;
    httpServer.listen(PORT, () => {
      console.log(`🚀 Server is running on http://localhost:5100`);
    });
    app.on("error", (err) => {
      console.error("Server error:", err);
      throw err;
    });
  })
  .catch((err) => {
    console.error("DB connection failed:", err);
    throw err;
  });
// Export io for emitting events elsewhere
export { io };