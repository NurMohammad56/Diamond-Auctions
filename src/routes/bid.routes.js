import express from 'express';
import {
  placeBid,

} from '../controllers/bid.controllers.js';
import { verifyJWT } from '../middlewares/auth.middlewares.js';

const router = express.Router();

router.post('/auctions/:auctionId/bid',verifyJWT, placeBid);

export default router;