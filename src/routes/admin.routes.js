import express from 'express';
import * as adminController from '../controllers/admin.controllers.js';
const router = express.Router();

// Auction Listing Routes
router.get('/auctions/active', adminController.getActiveAuctions);
router.get('/auctions/pending', adminController.getPendingAuctions);
router.get('/auctions/scheduled', adminController.getScheduledAuctions);
router.get('/auctions/ended', adminController.getEndedAuctions);

// Auction Actions
router.post('/auctions/:auctionId/accept', adminController.acceptAuction);
router.post('/auctions/:auctionId/reject', adminController.rejectAuction);
router.delete('/auctions/:auctionId', adminController.deleteAuction);

export default router;