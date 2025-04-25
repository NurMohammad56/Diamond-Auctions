import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import compression from 'compression';
import { createServer } from 'http';
import { Server } from 'socket.io';
import './src/utilty/auctions.cron.utility.js'

import dbconfig from './src/configs/db.configs.js';

// Load env vars
dotenv.config({ path: './.env' });


const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: {
        origin: '*', 
        methods: ['GET', 'POST']
    }
});

// Enable CORS
app.use(cors(
    {
        origin: "*"
    }
));

// Set security HTTP headers
app.use(helmet());

// Body parser
app.use(express.json());
app.use(express.urlencoded());
app.use(cookieParser());

// Compress all responses
app.use(compression());

// Route files
import auctionRoutes from './src/routes/auction.routes.js';
import authRoutes from './src/routes/auth.routes.js';
import wishlistRoutes from './src/routes/wishlist.routes.js';
import bidRoutes from './src/routes/bid.routes.js';
import categoryRoutes from './src/routes/category.routes.js';
import blogRoutes from './src/routes/blog.routes.js';
import contactUsRoutes from './src/routes/contactus.routes.js';
import profileRoutes from './src/routes/profile.routes.js';
import adminRoutes from './src/routes/admin.routes.js';
import aboutUsRoutes from './src/routes/aboutus.routes.js';
import policyRoutes from './src/routes/policy.routes.js';
import termsRoutes from './src/routes/terms.routes.js';
import paymentRoutes from './src/routes/payment.routes.js'


// import userRoutes from './routes/user.routes.js';

// Mount routers
app.use('/api/v1/auctions', auctionRoutes);
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/bids', bidRoutes);
app.use('/api/v1/wishlist', wishlistRoutes);
app.use('/api/v1/admin/categories', categoryRoutes);
app.use('/api/v1/admin/blogs', blogRoutes);
app.use('/api/v1/contactus', contactUsRoutes);
app.use('/api/v1/profile', profileRoutes);
app.use('/api/v1/admin', adminRoutes);
app.use('/api/v1/aboutus', aboutUsRoutes);
app.use('/api/v1/policy', policyRoutes);
app.use('/api/v1/terms', termsRoutes);
app.use('/api/v1', paymentRoutes)

// app.use('/api/v1/users', userRoutes);


// Socket.IO connection
io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

    // Join user room
    socket.on('joinUser', (userId) => {
        socket.join(userId);
        console.log(`User ${socket.id} joined their user room: ${userId}`);
      });

    // Join auction room
    socket.on('joinAuction', (auctionId) => {
        socket.join(auctionId);
        console.log(`Client ${socket.id} joined auction ${auctionId}`);
    });

    // Leave auction room
    socket.on('leaveAuction', (auctionId) => {
        socket.leave(auctionId);
        console.log(`Client ${socket.id} left auction ${auctionId}`);
    });

    socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
    });
});

export { io };


// Database and port
dbconfig()
    .then(() => {
        app.on("error", (err) => {
            console.log(`Error while listening on port: ${process.env.PORT}`, err);
            throw err;
        });

        app.listen(process.env.PORT || 5003, () => {
            console.log(`The server is listening on port ${process.env.PORT}`);
        });
    })
    .catch((err) => {
        console.log(`Error connecting to database`, err);
        throw err;
    });