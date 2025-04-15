import express from 'express';
import { createAuctionData, uploadAuctionImages, getAllAuctions } from '../controllers/auction.controller.js'
import upload from "../middlewares/multer.middlewares.js";
import {verifyJWT} from "../middlewares/auth.middlewares.js"
import { isSeller } from '../middlewares/role.middlewares.js'


const router = express.Router()


router.post("/create-auction", verifyJWT, isSeller, createAuctionData);
router.post("/upload-auction-images/:id", verifyJWT, isSeller, upload.array('images', 10), uploadAuctionImages);
router.get("/get-all-auctions", getAllAuctions);


export default router