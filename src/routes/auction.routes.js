import express from 'express';
import {
    createAuctionData,
    getAllAuctions,
    getAuction,
    updateAuction,
    deleteAuction,

    getRelatedAuctions,
    getSellerMatrics,
    getLiveAuctionsForHomePage,
    getLatestAuctionsForHomePage,
    getAllAuctionsBySeller
} from '../controllers/auction.controller.js'
import { getAuctionResult } from '../controllers/bid.controllers.js'
import upload from "../middlewares/multer.middlewares.js";
import { verifyJWT } from "../middlewares/auth.middlewares.js"
import { isSeller } from '../middlewares/role.middlewares.js'


const router = express.Router()


router.post("/create-auction", verifyJWT, isSeller, upload.array('images', 10), createAuctionData);
router.put("/update-auction/:id", verifyJWT, isSeller, upload.array('images', 10), updateAuction);
router.delete("/delete-auction/:id", verifyJWT, isSeller, deleteAuction);
router.get("/get-all-auctions", getAllAuctions);
router.get("/get-all-auctions-by-seller", verifyJWT, getAllAuctionsBySeller);
router.get("/get-live-auctions", getLiveAuctionsForHomePage);
router.get("/get-latest-auctions", getLatestAuctionsForHomePage);
router.get("/get-seller-statistics", verifyJWT, getSellerMatrics);
router.get("/get-auction/:id",  getAuction);
router.get('/related-auctions', getRelatedAuctions);
router.get('/:auctionId/result', getAuctionResult);


export default router