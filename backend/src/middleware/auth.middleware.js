import jwt from "jsonwebtoken";
import prisma from "../lib/db.js";

export const protectRoute = async (req, res, next) => {
  try {
    // ✅ Accept token from either cookie or Authorization header
    const token =
      req.cookies?.jwt ||
      (req.headers.authorization?.startsWith("Bearer ")
        ? req.headers.authorization.split(" ")[1]
        : null);

    if (!token) {
      return res
        .status(401)
        .json({ message: "Unauthorized-no token provided" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (!decoded) {
      return res.status(401).json({ message: "Unauthorized-invalid token" });
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      include: {
        friends: true,
        friendOf: true,
      },
    });

    if (user) {
      delete user.password; // still hide the password before sending the response
    }

    if (!user) {
      return res.status(401).json({ message: "Unauthorized-user not found" });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error("Error in protectRoute middleware", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
