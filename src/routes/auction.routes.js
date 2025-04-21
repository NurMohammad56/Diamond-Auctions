import express from 'express';
import {
    createAuctionData,
    uploadAuctionImages,
    getAllAuctions,
    getAuction,
    updateAuction,
    deleteAuction,
    searchAuctions,
    getRelatedAuctions,
    getSellerMatrics
} from '../controllers/auction.controller.js'
import { getAuctionResult } from '../controllers/bid.controllers.js'
import upload from "../middlewares/multer.middlewares.js";
import { verifyJWT } from "../middlewares/auth.middlewares.js"
import { isSeller } from '../middlewares/role.middlewares.js'


const router = express.Router()


router.post("/create-auction", verifyJWT, isSeller, createAuctionData);
router.post("/upload-auction-images/:id", verifyJWT, isSeller, upload.array('images', 10), uploadAuctionImages);
router.put("/update-auction/:id", verifyJWT, isSeller, updateAuction);
router.delete("/delete-auction/:id", verifyJWT, isSeller, deleteAuction);
router.get("/get-all-auctions", verifyJWT, getAllAuctions);
router.get("/get-seller-statistics", verifyJWT, getSellerMatrics);
router.get("/get-auction/:id", verifyJWT, getAuction);
router.get('/search', verifyJWT, searchAuctions);
router.get('/related-auctions', verifyJWT, getRelatedAuctions);
router.get('/:auctionId/result', getAuctionResult);


export default router