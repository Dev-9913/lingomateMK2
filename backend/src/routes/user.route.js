import express from 'express';
import { protectRoute } from "../middleware/auth.middleware.js";
import { acceptFriendRequest, getFriendRequests, getMyFriends, getOutgoingFriendReqs, getRecommendedUsers, sendFriendRequest } from '../controller/user.controller.js';
import { getOnlineUsers } from "../lib/socket.js";
const Router = express.Router();

//apply middleware to all routes
Router.use(protectRoute);

Router.get("/",getRecommendedUsers);
Router.get("/friends",getMyFriends);

Router.post("/friend-request/:id",sendFriendRequest);
Router.put("/friend-request/:id/accept",acceptFriendRequest);

Router.get("/friend-request",getFriendRequests);
Router.get("/outgoing-friend-request",getOutgoingFriendReqs);

Router
.get("/online", (req, res) => {
  res.json({
    onlineUsers: Object.keys(getOnlineUsers()),
  });
});

export default Router;