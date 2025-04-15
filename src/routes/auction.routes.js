import express from 'express';
import { createAuctionData, uploadAuctionImages, getAllAuctions, getAuction, updateAuction, deleteAuction } from '../controllers/auction.controller.js'
import upload from "../middlewares/multer.middlewares.js";
import {verifyJWT} from "../middlewares/auth.middlewares.js"
import { isSeller } from '../middlewares/role.middlewares.js'


const router = express.Router()


router.post("/create-auction", verifyJWT, isSeller, createAuctionData);
router.post("/upload-auction-images/:id", verifyJWT, isSeller, upload.array('images', 10), uploadAuctionImages);
router.put("/update-auction/:id", verifyJWT, isSeller, updateAuction);
router.delete("/delete-auction/:id", verifyJWT, isSeller, deleteAuction);
router.get("/get-all-auctions", getAllAuctions);
router.get("/get-auction/:id", getAuction);


export default router