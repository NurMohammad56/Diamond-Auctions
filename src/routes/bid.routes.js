import express from 'express';
import {
  placeBid,
  getUserBids

} from '../controllers/bid.controllers.js';
import { verifyJWT } from '../middlewares/auth.middlewares.js';

const router = express.Router();

router.post('/auctions/:auctionId/bid',verifyJWT, placeBid);
router.get('/users/:userId/bid', verifyJWT, getUserBids);   

export default router;