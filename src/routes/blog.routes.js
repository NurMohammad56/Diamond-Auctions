import express from "express";
import  { createBlog, getBlog, getBlogs, updateBlog, deleteBlog, addComment, getComments, deleteComment  } from "../controllers/blog.controllers.js";
import { verifyJWT } from "../middlewares/auth.middlewares.js";            
import { isAdmin} from "../middlewares/role.middlewares.js"
import  upload  from "../middlewares/multer.middlewares.js";

const router = express.Router();

router.post("/create", verifyJWT, isAdmin, upload.single("image"), createBlog);
router.get("/all", getBlogs);
router.get("/:id", getBlog);
router.put("/update/:id", verifyJWT, isAdmin, upload.single("image"), updateBlog);
router.delete("/delete/:id", verifyJWT, isAdmin, deleteBlog);
router.post("/add-comment/:id", verifyJWT, addComment);
router.get("/get-comment/:id", verifyJWT, isAdmin, getComments);    
router.delete("/comment/:id/:commentId", verifyJWT, isAdmin, deleteComment);


export default router;