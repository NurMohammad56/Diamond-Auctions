import express from "express";
import {
  createTerms,
  getTerms,
  updateTerms,
  } from "../controllers/terms.controllers.js";
  import { verifyJWT } from "../middlewares/auth.middlewares.js";
  import { isAdmin } from "../middlewares/role.middlewares.js";
  const router = express.Router();

  router.post("/create", verifyJWT, isAdmin, createTerms);
  router.get("/", verifyJWT, getTerms);
  router.put("/update/:id", verifyJWT, isAdmin, updateTerms);

    export default router;