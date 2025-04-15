import express from 'express';
import { createAuction } from '../controllers/auction.controller.js'
import upload from "../middlewares/multer.middlewares.js";
import {verifyJWT} from '../middlewares/auth.middlewares.js'
import { isSeller } from '../middlewares/role.middlewares.js'


const router = express.Router()


router.post("/create-auction", verifyJWT, isSeller, upload.array("images", 5), createAuction);


export default router