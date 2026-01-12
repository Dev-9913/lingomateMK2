import express from "express";
import { login, logout, onboard, signup } from "../controller/auth.controller.js";
import { protectRoute } from "../middleware/auth.middleware.js";

const Router = express.Router();

Router.post("/signup", signup);
Router.post("/login", login);
Router.post("/logout", logout);

Router.post("/onboarding",protectRoute,onboard);

//check if the user is logged in
Router.get("/me",protectRoute,(req,res)=>{
  res.status(200).json({
    success:true,
    user:req.user,
  });
}) ;

export default Router;
