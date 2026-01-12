import prisma from "../lib/db.js";

export const getRecommendedUsers = async (req, res) => {
  try {
    const currentUser = req.user;
    const currentUserId = currentUser.id;

    const recommendedUsers = await prisma.user.findMany({
      where: {
        id: {
          not: currentUserId,
          notIn: currentUser.friends.map((friend) => friend.id),
        },
        isOnboarded: true,
      },
      select: {
        id: true,
        fullName: true,
        profilePic: true,
        nativeLanguage: true,
        learningLanguage: true,
        bio: true,
        location: true,
      },
    });

    
    const groupA = []; // nativeLanguage == learningLanguage
    const groupB = []; // nativeLanguage == nativeLanguage
    const groupC = []; // others

    for (const user of recommendedUsers) {
      if (user.nativeLanguage === currentUser.learningLanguage) {
        groupA.push(user);
      } else if (user.nativeLanguage === currentUser.nativeLanguage) {
        groupB.push(user);
      } else {
        groupC.push(user);
      }
    }

    // Interleave groupA and groupB
    const interleaved = [];
    let i = 0, j = 0;

    while (i < groupA.length || j < groupB.length) {
      if (i < groupA.length) interleaved.push(groupA[i++]);
      if (j < groupB.length) interleaved.push(groupB[j++]);
    }

    // Final sorted list
    const sortedUsers = [...interleaved, ...groupC];

    res.status(200).json({
      success: true,
      message: "Recommended users fetched successfully",
      recommendedUsers: sortedUsers,
    });
  } catch (error) {
    console.error("Error in getRecommendedUsers controller", error);
    res.status(500).json({ message: "Internal server error" });
  }
};


export async function getMyFriends(req, res) {
  try {
    const userId = req.user.id;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        friends: {
          select: {
            id: true,
            fullName: true,
            profilePic: true,
            nativeLanguage: true,
            learningLanguage: true,
          },
        },
      },
    });

    const friendsWithMeta = await Promise.all(
      user.friends.map(async (friend) => {
        // Find conversation between the two users
        const convo = await prisma.conversation.findFirst({
          where: {
            participants: {
              some: { userId },
            },
            AND: {
              participants: {
                some: { userId: friend.id },
              },
            },
          },
          select: {
            id: true,
            participants: {
              where: { userId }, // current user’s participant row
              select: { unreadCount: true },
            },
          },
        });

        return {
          ...friend,
          conversationId: convo?.id || null,
          unreadCount: convo?.participants[0]?.unreadCount || 0,
        };
      })
    );

    res.status(200).json({
      success: true,
      message: "Friends fetched successfully",
      friends: friendsWithMeta,
    });
  } catch (error) {
    console.error("Error in getMyFriends controller", error);
    res.status(500).json({ message: "Internal server error" });
  }
}



export async function sendFriendRequest(req, res) {
  try {
    const myId = parseInt(req.user.id);
    const recipientId = parseInt(req.params.id);

    if (myId === recipientId) {
      return res.status(400).json({ message: "You can't send friend request to yourself" });
    }

    const recipient = await prisma.user.findUnique({ where: { id: recipientId } });
    if (!recipient) {
      return res.status(404).json({ message: "Recipient not found" });
    }

    const isAlreadyFriend = await prisma.user.findFirst({
      where: {
        id: recipientId,
        friends: {
          some: {
            id: myId,
          },
        },
      },
    });

    if (isAlreadyFriend) {
      return res.status(400).json({ message: "You are already friends with this user" });
    }

    const existingRequest = await prisma.friendRequest.findFirst({
      where: {
        OR: [
          { senderId: myId, recipientId },
          { senderId: recipientId, recipientId: myId },
        ],
      },
    });

    if (existingRequest) {
      return res
        .status(400)
        .json({ message: "A friend request already exists between you and this user" });
    }

    const friendRequest = await prisma.friendRequest.create({
      data: {
        senderId: myId,
        recipientId,
      },
    });

    res.status(201).json(friendRequest);
  } catch (error) {
    console.error("Error in sendFriendRequest controller", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
}
export async function acceptFriendRequest(req, res) {
  try {
    const requestId = parseInt(req.params.id);
    const userId = parseInt(req.user.id);

    const friendRequest = await prisma.friendRequest.findUnique({
      where: { id: requestId },
    });

    if (!friendRequest) {
      return res.status(404).json({ message: "Friend request not found" });
    }

    if (friendRequest.recipientId !== userId) {
      return res.status(403).json({ message: "You are not authorized to accept this request" });
    }

    // Update request status
    await prisma.friendRequest.update({
      where: { id: requestId },
      data: { status: "accepted" },
    });

    // Add each user to the other's friends list
    const [updatedSender, updatedRecipient] = await Promise.all([
      prisma.user.update({
        where: { id: friendRequest.senderId },
        data: {
          friends: { connect: { id: friendRequest.recipientId } },
        },
      }),
      prisma.user.update({
        where: { id: friendRequest.recipientId },
        data: {
          friends: { connect: { id: friendRequest.senderId } },
        },
      }),
    ]);

    // Create a new conversation
    const conversation = await prisma.conversation.create({
      data: {
        participants: {
          create: [
            { userId: friendRequest.senderId },     // sender
            { userId: friendRequest.recipientId },  // recipient
          ],
        },
      },
    });

    res.status(200).json({
      message: "Friend request accepted, conversation created",
      conversationId: conversation.id,
    });
  } catch (error) {
    console.error("Error in acceptFriendRequest controller:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

export async function getFriendRequests(req, res) {
  try {
    const userId = parseInt(req.user.id);

    const incomingReqs = await prisma.friendRequest.findMany({
      where: {
        recipientId: userId,
        status: "pending",
      },
      include: {
        sender: {
          select: {
            id: true,
            fullName: true,
            profilePic: true,
            nativeLanguage: true,
            learningLanguage: true,
          },
        },
      },
    });

    const acceptedReqs = await prisma.friendRequest.findMany({
      where: {
        senderId: userId,
        status: "accepted",
      },
      include: {
        recipient: {
          select: {
            id: true,
            fullName: true,
            profilePic: true,
          },
        },
      },
    });

    res.status(200).json({ incomingReqs, acceptedReqs });
  } catch (error) {
    console.log("Error in getFriendRequests controller", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

export async function getOutgoingFriendReqs(req, res) {
  try {
    const userId = parseInt(req.user.id);

    const outgoingRequests = await prisma.friendRequest.findMany({
      where: {
        senderId: userId,
        status: "pending",
      },
      include: {
        recipient: {
          select: {
            id: true,
            fullName: true,
            profilePic: true,
            nativeLanguage: true,
            learningLanguage: true,
          },
        },
      },
    });

    res.status(200).json(outgoingRequests);
  } catch (error) {
    console.log("Error in getOutgoingFriendReqs controller", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
}


