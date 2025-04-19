import express from "express";
import { createContactUs, getAllContactUs } from "../controllers/contactus.controllers.js";
const router = express.Router();
import { verifyJWT } from "../middlewares/auth.middlewares.js";

import { isAdmin } from "../middlewares/role.middlewares.js";

router.post("/create", verifyJWT, createContactUs);
router.get("/all", verifyJWT, isAdmin, getAllContactUs);


export default router;