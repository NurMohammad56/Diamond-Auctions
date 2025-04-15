import express from 'express';
import { register, login, forgotPassword, verifyOtp, resendOTP, resetPassword, logout  } from '../controllers/auth.controllers.js    '
import {verifyJWT} from "../middlewares/auth.middlewares.js"

const router = express.Router()


router.post("/register",  register);
router.post("/login", login);
router.post("/forgot-password", forgotPassword);
router.post("/verify-otp", verifyOtp);
router.post("/resend-otp", resendOTP);
router.post("/reset-password", resetPassword);
router.post("/logout", verifyJWT, logout);





export default router