
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

import prisma from "../lib/db.js";



export async function signup(req, res) {
  const { email, password, fullName } = req.body;
  try {
    if (!email || !password || !fullName) {
      res.status(400).json({ message: "All fields are required" });
    }
    if (password.length < 6) {
      res
        .status(400)
        .json({ message: "Password must be at least 6 characters" });
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: "Invalid email format" });
    }
    const existingUser = await prisma.user.findUnique({
      where: {
        email: email,
      },
    });
    if (existingUser) {
      return res.status(400).json({ message: "Email already exists" });
    }
    const idx = Math.floor(Math.random() * 60)+1;
    const randomAvatar = `https://avatar.iran.liara.run/public/430/${idx}.png`;
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    const newUser = await prisma.user.create({
      data: {
        email,
        password:hashedPassword,
        fullName,
        profilePic: randomAvatar,
      },
    });
    // Generate JWT
    // The JWT is signed with the user's ID and email, and expires in 7 days.
    // The JWT is then set as a cookie in the response.
    // The cookie is set to expire in 7 days, is HTTP-only, and has the SameSite attribute set to "strict".
    
    const token = jwt.sign(
      { id: newUser.id, email: newUser.email },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );
    res.cookie("jwt", token, {
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        httpOnly: true,
        sameSite: "strict",
        secure: process.env.NODE_ENV === "production", // Set to true if using HTTPS
  })

    res.status(201).json({success:true, message: "User created successfully", user: newUser });
  } catch (error) {
    console.log(
        "Error in signup controller",
        error
    );
    res.status(500).json({ message: "Internal server error" });
    
  }
}
export async function login(req, res) {
  const { email, password } = req.body;

  try {
    // 1. Check for missing fields
    if (!email || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    // 2. Check if user exists
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    // 3. Compare password with hashed password
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    // 4. Generate JWT
    const token = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    // 5. Set cookie
    res.cookie("jwt", token, {
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      httpOnly: true,
      sameSite: "strict",
      secure: process.env.NODE_ENV === "production", // HTTPS only in production
    });

    // 6. Send success response
    res.status(200).json({
      success: true,
      message: "Login successful",
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        profilePic: user.profilePic,
        // add more fields if needed
      },
    });
  } catch (error) {
    console.error("Error in login controller", error);
    res.status(500).json({ message: "Internal server error" });
  }
}
// Logout function
// This function clears the JWT cookie and sends a response
// indicating that the user has been logged out.
export async function logout(req, res) {
  try {
    // Clear the JWT cookie
    res.clearCookie("jwt");
    res.status(200).json({success:true, message: "Logout successful" });
  } catch (error) {
    console.error("Error in logout controller", error);
    res.status(500).json({ message: "Internal server error" });
  }
}
// Onboarding function
export async function onboard(req, res) {
  try {
    const userId = req.user.id;
    const {fullName,bio,nativeLanguage,learningLanguage,location} = req.body;
    if (!fullName || !bio || !nativeLanguage || !learningLanguage || !location) {
      return res.status(400).json({ 
        message: "All fields are required",
        missingFields: [
          !fullName&&"fullName",
          !bio&&"bio",
          !nativeLanguage&&"nativeLanguage",
          !learningLanguage&&"learningLanguage",
          !location&&"location",
        ].filter(Boolean),
       });
    }
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { ...req.body, isOnboarded: true },
    });
    if (!updatedUser) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json({success:true, message: "User onboarded successfully", user: updatedUser });
  } catch (error) {
    console.error("Error in onboard controller", error);
    res.status(500).json({ message: "Internal server error" });
    
  }};