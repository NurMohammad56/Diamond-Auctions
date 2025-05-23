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
  getAllBidders,
  deleteBidder,
  getUserBidHistory,
  getAuctionDetails,
  getUserNotifications,
  markNotificationsAsRead,
  getAllBiddersAdmin
} from '../controllers/bid.controllers.js';
import { verifyJWT } from '../middlewares/auth.middlewares.js';

const router = express.Router();

router.post('/auctions/:auctionId', verifyJWT, placeBid);
router.post('/:auctionId/auto', verifyJWT, setAutoBid);
router.get('/user', verifyJWT, getUserBids);
router.get('/user/auto', verifyJWT, getUserAutoBids);
router.get('/top-bidders',verifyJWT, getTopBidders);
router.get('/all-bidders-admin',verifyJWT, getAllBiddersAdmin);
router.get('/specific-seller-bidders',verifyJWT, getAllBidders);   
router.get('/user-bid-histroy',verifyJWT, getUserBidHistory);
router.get('/notifications', verifyJWT, getUserNotifications);
router.post('/notifications/mark-as-read', verifyJWT, markNotificationsAsRead);
router.get('/:id', verifyJWT, getBid);
router.get('/auction/:auctionId',verifyJWT, getAuctionDetails);
router.get('/auction/:auctionId',verifyJWT, getBidsForAuction);
router.get('/auction/:auctionId/history',verifyJWT, getBidsHistory);
router.delete('/delete/:id',verifyJWT, deleteBidder);

export default router;