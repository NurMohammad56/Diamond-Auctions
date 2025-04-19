import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
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
app.use(cors());

// Set security HTTP headers
app.use(helmet());

// Limit requests from same API
const limiter = rateLimit({
    max: 100,
    windowMs: 60 * 60 * 1000,
    message: 'Too many requests from this IP, please try again in an hour!',
});
app.use('/api', limiter);

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
// import userRoutes from './routes/user.routes.js';

// Mount routers
app.use('/api/v1/auctions', auctionRoutes);
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/bids', bidRoutes);
app.use('/api/v1/wishlist', wishlistRoutes);
app.use('/api/v1/admin/categories', categoryRoutes);
// app.use('/api/v1/users', userRoutes);


// Socket.IO connection
io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

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