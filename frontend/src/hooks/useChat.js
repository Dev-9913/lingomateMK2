import { useQuery, useMutation, useQueryClient,useInfiniteQuery } from "@tanstack/react-query";
import {
  getConversationById,
  getMessages,
  sendMessage,
  editMessage,
  deleteMessage,
  toggleReaction,
  updateChatMode,
} from "../lib/api";

// in hooks/useChat.js
export const useConversation = (conversationId) =>{
 return useQuery({
    queryKey: ["conversation", conversationId],
    queryFn: () => getConversationById(conversationId),
    enabled: !!conversationId,
  });
};


const PAGE_SIZE = 20;

export const useMessages = (conversationId) => {
  return useInfiniteQuery({
    queryKey: ["messages", conversationId],
    queryFn: ({ pageParam = 0 }) =>
      getMessages(conversationId, {
        page: pageParam,
        take: PAGE_SIZE,
      }),
    getNextPageParam: (lastPage) => {
      return lastPage.hasMore ? lastPage.page + 1 : undefined;
    },
    enabled: !!conversationId,
  });
};



export const useSendMessage = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: sendMessage,
    onSuccess: (newMessage) => {
      const key = ["messages", newMessage.conversationId];
      queryClient.setQueryData(key, (data) => {
        if (!data) return data;
        // append to the last page
        const lastIdx = data.pages.length - 1;
        const pages = data.pages.map((page, i) =>
          i === lastIdx
            ? { ...page, messages: [...page.messages, newMessage] }
            : page
        );
        return { ...data, pages };
      });
    },
  });
};


export const useEditMessage = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ messageId, newContent }) => editMessage(messageId, newContent),
    onSuccess: (updatedMessage) => {
      queryClient.setQueryData(["messages", updatedMessage.conversationId], (oldMessages = []) =>
        oldMessages.map((msg) => (msg.id === updatedMessage.id ? updatedMessage : msg))
      );
    },
  });
};

export const useDeleteMessage = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ messageId }) => deleteMessage(messageId),
    onSuccess: (_, variables) => {
      queryClient.setQueryData(["messages", variables.conversationId], (oldMessages = []) =>
        oldMessages.filter((msg) => msg.id !== variables.messageId)
      );
    },
  });
};


export const useToggleReaction = () => {
  const queryClient = useQueryClient();

  return useMutation({
    // accept { conversationId, messageId, emoji }
    mutationFn: ({ messageId, emoji }) =>
      toggleReaction(messageId, emoji),

    // ✅ apply to cache immediately after success
    onSuccess: (updated, { messageId, conversationId }) => {
      const key = ["messages", conversationId];

      queryClient.setQueryData(key, (data) => {
        if (!data) return data;
        const { pages, pageParams } = data;

        return {
          pages: pages.map((page) => ({
            ...page,
            messages: page.messages.map((m) => {
              if (m.id !== messageId) return m;

              // backend may return whole message object with reactions
              // or just a reactions array → handle both
              if (updated.reactions) {
                return { ...m, reactions: updated.reactions };
              } else if (updated.reaction) {
                // merge the single reaction (add/update/remove)
                const filtered = (m.reactions || []).filter(
                  (r) => r.userId !== updated.reaction.userId
                );
                return {
                  ...m,
                  reactions: updated.reaction.deleted
                    ? filtered
                    : [...filtered, updated.reaction],
                };
              }
              return m;
            }),
          })),
          pageParams,
        };
      });
    },
  });
};


export const useUpdateChatMode = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ conversationId, chatMode }) =>
      updateChatMode(conversationId, chatMode),
    onSuccess: (_, { conversationId }) => {
      queryClient.invalidateQueries(["conversation", conversationId]);
    },
  });
};