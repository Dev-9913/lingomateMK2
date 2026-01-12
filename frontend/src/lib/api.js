import { axiosInstance } from "./axios";

export const signup = async (signupData) => {
  const response = await axiosInstance.post("/auth/signup", signupData);
  return response.data;
};

export const login = async (loginData) => {
  const response = await axiosInstance.post("/auth/login", loginData);
  return response.data;
};
export const logout = async () => {
  const response = await axiosInstance.post("/auth/logout");
  return response.data;
};

export const getAuthUser = async () => {
  try {
    const res = await axiosInstance.get("/auth/me");
    return res.data;
  } catch (error) {
    console.log("Error in getAuthUser:", error);
    return null;
  }
};

export const completeOnboarding = async (userData) => {
  const response = await axiosInstance.post("/auth/onboarding", userData);
  return response.data;
};

export async function getUserFriends() {
  const res = await axiosInstance.get("/user/friends");
  return res.data.friends;
}

export async function getRecommendedUsers() {
  const res = await axiosInstance.get("/user");
  return res.data.recommendedUsers;
}

export async function getOutgoingFriendReqs() {
  const res = await axiosInstance.get("/user/outgoing-friend-request");
  return res.data; // Make sure your backend returns this key
}




export async function sendFriendRequest(userId) {
  const response = await axiosInstance.post(`/user/friend-request/${userId}`);
  return response.data;
}

export async function getFriendRequests() {
  const response = await axiosInstance.get("/user/friend-request");
  return response.data;
}

export async function acceptFriendRequest(requestId) {
  const response = await axiosInstance.put(`/user/friend-request/${requestId}/accept`);
  return response.data;
}

export async function getStreamToken() {
  const response = await axiosInstance.get("/chat/token");
  return response.data;
}


export const getConversationById = async (conversationId) => {
  const res = await axiosInstance.get(`/conversations/${conversationId}`);
  return res.data;
};

export const getMessages = async (conversationId, { page = 0, take = 20 } = {}) => {
  const res = await axiosInstance.get(
    `/messages/conversation/${conversationId}`, 
    { params: { page, take } }
  );
  return res.data;
};

export const sendMessage = async ({ conversationId, text, media, repliedToId }) => {
  const formData = new FormData();
  if (text) formData.append("text", text);
  if (media) formData.append("media", media);
  if (repliedToId) formData.append("repliedToId", repliedToId);

  const res = await axiosInstance.post(`/messages/conversation/${conversationId}`, formData);
  return res.data;
};

export const editMessage = async (messageId, newContent) => {
  const res = await axiosInstance.put(`/messages/${messageId}`, { text: newContent });
  return res.data;
};

export const deleteMessage = async (messageId) => {
  const res = await axiosInstance.delete(`/messages/${messageId}`);
  return res.data;
};

export const toggleReaction = async (messageId, emoji) => {
  const res = await axiosInstance.post(`/messages/reactions/${messageId}`, { emoji });
  return res.data;
};

export const updateChatMode = async (conversationId, chatMode) => {
  const res = await axiosInstance.put(`/conversations/${conversationId}/mode`, { chatMode }); // assuming this endpoint exists
  return res.data;
};
