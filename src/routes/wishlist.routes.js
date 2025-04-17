import express from 'express';
import { addToWishlist, removeFromWishlist, getWishlist } from '../controllers/wishlist.controllers.js';
import { verifyJWT } from '../middlewares/auth.middlewares.js';

const router = express.Router();

router.post('/add/:auctionId', verifyJWT, addToWishlist);
router.delete('/remove/:auctionId', verifyJWT, removeFromWishlist);
router.get('/', verifyJWT, getWishlist);

export default router;