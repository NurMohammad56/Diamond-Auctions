import express from 'express';
import {
  placeBid,
  getUserBids,
  getBid,
  getBidsForAuction,
  getBidsHistory
} from '../controllers/bid.controllers.js';
import { verifyJWT } from '../middlewares/auth.middlewares.js';

const router = express.Router();

router.post('/auctions/:auctionId/bid',verifyJWT, placeBid);
router.get('/users/:userId/bid', verifyJWT, getUserBids);   
router.get('/:id/bid', verifyJWT, getBid);
router.get('/:auctionId/bid', verifyJWT, getBidsForAuction);
router.get('/:auctionId/bid', verifyJWT, getBidsHistory);

export default router;