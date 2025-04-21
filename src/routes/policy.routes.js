import express from "express";
import {
  createPolicy,
  getPolicy,
  updatePolicy,
} from "../controllers/policy.controllers.js";
import { verifyJWT } from "../middlewares/auth.middlewares.js";
import { isAdmin } from "../middlewares/role.middlewares.js";

const router = express.Router();


router.post("/create", verifyJWT, isAdmin, createPolicy);
router.get("/", verifyJWT, getPolicy);
router.put("/update/:id", verifyJWT, isAdmin, updatePolicy);


export default router;