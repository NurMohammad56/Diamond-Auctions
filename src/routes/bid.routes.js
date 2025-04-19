import express from 'express';
import {
  placeBid,
  getUserBids,
  getBid,
  getBidsForAuction,
  getBidsHistory,
  setAutoBid,
  getUserAutoBids
} from '../controllers/bid.controllers.js';
import { verifyJWT } from '../middlewares/auth.middlewares.js';

const router = express.Router();

router.post('/auctions/:auctionId', verifyJWT, placeBid);
router.post('/:auctionId/auto', verifyJWT, setAutoBid);
router.get('/user', verifyJWT, getUserBids);
router.get('/user/auto', verifyJWT, getUserAutoBids);
router.get('/:id', verifyJWT, getBid);
router.get('/auction/:auctionId', getBidsForAuction);
router.get('/auction/:auctionId/history', getBidsHistory);

export default router;