import express from "express";
import {
    getAboutUs,
    createAboutUs,
    updateAboutUs,
} from "../controllers/aboutus.controllers.js";

import { verifyJWT } from "../middlewares/auth.middlewares.js";
import  upload  from "../middlewares/multer.middlewares.js";
import { isAdmin } from "../middlewares/role.middlewares.js";
const router = express.Router();


router.post(
    "/create",
    verifyJWT,
    isAdmin,
    upload.single("image"),
    createAboutUs
);
router.get("/", getAboutUs);
router.put(
    "/update/:id",
    verifyJWT,
    isAdmin,
    upload.single("image"),
    updateAboutUs
);

export default router;