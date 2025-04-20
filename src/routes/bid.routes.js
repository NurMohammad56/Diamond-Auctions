import express from 'express';
import {
  placeBid,
  getUserBids,
  getBid,
  getBidsForAuction,
  getBidsHistory,
  setAutoBid,
  getUserAutoBids,
  getTopBidders,
  getAllBidders
} from '../controllers/bid.controllers.js';
import { verifyJWT } from '../middlewares/auth.middlewares.js';

const router = express.Router();

router.post('/auctions/:auctionId', verifyJWT, placeBid);
router.post('/:auctionId/auto', verifyJWT, setAutoBid);
router.get('/user', verifyJWT, getUserBids);
router.get('/user/auto', verifyJWT, getUserAutoBids);
router.get('/top-bidders',verifyJWT, getTopBidders);
router.get('/all',verifyJWT, getAllBidders);
router.get('/:id', verifyJWT, getBid);
router.get('/auction/:auctionId',verifyJWT, getBidsForAuction);
router.get('/auction/:auctionId/history',verifyJWT, getBidsHistory);

export default router;