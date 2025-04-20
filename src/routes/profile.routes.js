import express from "express";
import { getUserProfile, updateUserProfile, updateUserPassword } from "../controllers/profile.controllers.js";
import { verifyJWT } from "../middlewares/auth.middlewares.js";     
import  upload  from "../middlewares/multer.middlewares.js";
const router = express.Router();

router.get("/get/:id", verifyJWT, getUserProfile);
router.put("/update/:id", verifyJWT, upload.single("image"), updateUserProfile);
router.put("/password/:id", verifyJWT, updateUserPassword);



export default router;

