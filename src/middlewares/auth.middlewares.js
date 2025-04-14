import jwt from "jsonwebtoken";
import { User } from "../models/user.models.js"

// Middleware to verify JWT token
const verifyJWT = async (req, res, next) => {

    try {
        const authHeader = req.header("Authorization");

        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(400).json({
                status: false,
                message: "Authorization header missing or invalid.",
            });
        }

        const token = authHeader.replace("Bearer ", "").trim();

        // Verify the token
        const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

        // Find the user by decoded token and exclude password
        const user = await User.findById(decodedToken?._id).select("-password");

        // If user doesn't exist, return an error
        if (!user) {
            return res.status(400).json({
                status: false,
                message: "User not found.",
            });
        }

        // Add user to req
        req.user = user;
        next();
    } catch (error) {
        return res.status(500).json({
            status: false,
            message: error.message,
        });
    }
};

export { verifyJWT };
