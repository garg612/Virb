import { User, Conversation, Message, Call, Product, Order } from "./types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

const getHeaders = (token?: string | null) => {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  const activeToken =
    token || (typeof window !== "undefined" ? localStorage.getItem("chat_token") : null);
  if (activeToken) {
    headers["Authorization"] = `Bearer ${activeToken}`;
  }
  return headers;
};

export const api = {
  // Users
  async register(data: { name: string; email: string; username: string; password: string }): Promise<{
    user: User;
    accessToken: string;
    refreshToken: string;
  }> {
    const res = await fetch(`${API_BASE}/api/users/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!res.ok) {
      throw new Error(json.message || "Registration failed");
    }
    // Backend returns Apiresponse with message: { user, accessToken, refreshToken }
    const payload = json.message || json.data;
    if (typeof window !== "undefined" && payload.accessToken) {
      localStorage.setItem("chat_token", payload.accessToken);
      localStorage.setItem("chat_user", JSON.stringify(payload.user));
    }
    return payload;
  },

  async getAllUsers(page: number = 1, limit: number = 50): Promise<{ users: User[]; totalUsers: number }> {
    const res = await fetch(`${API_BASE}/api/users/all?page=${page}&limit=${limit}`, {
      headers: getHeaders(),
    });
    const json = await res.json();
    if (!res.ok) {
      throw new Error(json.message || "Failed to load users");
    }
    return {
      users: json.users || [],
      totalUsers: json.pagination?.totalUsers || 0,
    };
  },

  async updatePublicKey(publicKey: string): Promise<void> {
    const res = await fetch(`${API_BASE}/api/users/public-key`, {
      method: "PUT",
      headers: getHeaders(),
      body: JSON.stringify({ publicKey }),
    });
    const json = await res.json();
    if (!res.ok) {
      throw new Error(json.message || "Failed to update public key");
    }
  },

  async logout(): Promise<void> {
    try {
      await fetch(`${API_BASE}/api/users/logout`, {
        method: "POST",
        headers: getHeaders(),
      });
    } catch {
      // Ignore network errors on logout
    }
    if (typeof window !== "undefined") {
      localStorage.removeItem("chat_token");
      localStorage.removeItem("chat_user");
    }
  },

  // Conversations
  async getMyConversations(): Promise<Conversation[]> {
    const res = await fetch(`${API_BASE}/api/conversations/my-conversations`, {
      headers: getHeaders(),
    });
    const json = await res.json();
    if (!res.ok) {
      throw new Error(json.message || "Failed to load conversations");
    }
    return json.conversations || [];
  },

  async createConversation(receiverId: number): Promise<Conversation> {
    const res = await fetch(`${API_BASE}/api/conversations/create`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({ receiverId }),
    });
    const json = await res.json();
    if (!res.ok) {
      throw new Error(json.message || "Failed to create conversation");
    }
    return json.conversation;
  },

  async createGroup(data: { name: string; participantIds: number[]; avatar?: string }): Promise<Conversation> {
    const res = await fetch(`${API_BASE}/api/conversations/create-group`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!res.ok) {
      throw new Error(json.message || "Failed to create group");
    }
    return json.group;
  },

  async getMessages(conversationId: number): Promise<Message[]> {
    const res = await fetch(`${API_BASE}/api/conversations/messages/${conversationId}`, {
      headers: getHeaders(),
    });
    const json = await res.json();
    if (!res.ok) {
      throw new Error(json.message || "Failed to load messages");
    }
    return json.messages || [];
  },

  async sendMessage(params: {
    conversationId: number;
    content: string;
    replyToId?: number | null;
  }): Promise<Message> {
    const res = await fetch(`${API_BASE}/api/conversations/send-message`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(params),
    });
    const json = await res.json();
    if (!res.ok) {
      throw new Error(json.message || "Failed to send message");
    }
    return json.data;
  },

  async deleteMessage(messageId: number): Promise<void> {
    const res = await fetch(`${API_BASE}/api/conversations/messagedelete/${messageId}`, {
      method: "DELETE",
      headers: getHeaders(),
    });
    const json = await res.json();
    if (!res.ok) {
      throw new Error(json.message || "Failed to delete message");
    }
  },

  async editMessage(messageId: number, content: string): Promise<Message> {
    const res = await fetch(`${API_BASE}/api/conversations/messageedit/${messageId}`, {
      method: "PATCH",
      headers: getHeaders(),
      body: JSON.stringify({ content }),
    });
    const json = await res.json();
    if (!res.ok) {
      throw new Error(json.message || "Failed to edit message");
    }
    return json.data;
  },

  // Groups
  async addGroupMember(conversationId: number, newMemberId: number): Promise<Conversation> {
    const res = await fetch(`${API_BASE}/api/conversations/add-member`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({ conversationId, newMemberId }),
    });
    const json = await res.json();
    if (!res.ok) {
      throw new Error(json.message || "Failed to add member");
    }
    return json.group;
  },

  async removeGroupMember(conversationId: number, memberId: number): Promise<Conversation> {
    const res = await fetch(`${API_BASE}/api/conversations/remove-member`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({ conversationId, memberId }),
    });
    const json = await res.json();
    if (!res.ok) {
      throw new Error(json.message || "Failed to remove member");
    }
    return json.group;
  },

  async leaveGroup(conversationId: number): Promise<void> {
    const res = await fetch(`${API_BASE}/api/conversations/leave-group`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({ conversationId }),
    });
    const json = await res.json();
    if (!res.ok) {
      throw new Error(json.message || "Failed to leave group");
    }
  },

  async renameGroup(conversationId: number, newName: string): Promise<Conversation> {
    const res = await fetch(`${API_BASE}/api/conversations/update-name`, {
      method: "PATCH",
      headers: getHeaders(),
      body: JSON.stringify({ conversationId, newName }),
    });
    const json = await res.json();
    if (!res.ok) {
      throw new Error(json.message || "Failed to rename group");
    }
    return json.group;
  },

  // Conversation Requests
  async acceptRequest(conversationId: number): Promise<Conversation> {
    const res = await fetch(`${API_BASE}/api/conversations/accept-request`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({ conversationId }),
    });
    const json = await res.json();
    if (!res.ok) {
      throw new Error(json.message || "Failed to accept request");
    }
    return json.conversation;
  },

  async rejectRequest(conversationId: number): Promise<void> {
    const res = await fetch(`${API_BASE}/api/conversations/reject-request`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({ conversationId }),
    });
    const json = await res.json();
    if (!res.ok) {
      throw new Error(json.message || "Failed to reject request");
    }
  },

  // Calls
  async startCall(receiverId: number, type: "audio" | "video"): Promise<Call> {
    const res = await fetch(`${API_BASE}/api/calls/start`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({ receiverId, type }),
    });
    const json = await res.json();
    if (!res.ok) {
      throw new Error(json.message || "Failed to start call");
    }
    return json.call;
  },

  async getCallHistory(): Promise<Call[]> {
    const res = await fetch(`${API_BASE}/api/calls/history`, {
      headers: getHeaders(),
    });
    const json = await res.json();
    if (!res.ok) {
      throw new Error(json.message || "Failed to load call history");
    }
    return json.calls || [];
  },

  // Marketplace & Sell Requirements
  async createRequirement(data: {
    title: string;
    description: string;
    price: number;
    currency?: string;
    category?: string;
    image?: string;
  }): Promise<Product> {
    const res = await fetch(`${API_BASE}/api/marketplace/requirements`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!res.ok) {
      throw new Error(json.message || "Failed to create requirement");
    }
    return json.product;
  },

  async getMyRequirements(): Promise<Product[]> {
    const res = await fetch(`${API_BASE}/api/marketplace/my-requirements`, {
      headers: getHeaders(),
    });
    const json = await res.json();
    if (!res.ok) {
      throw new Error(json.message || "Failed to load requirements");
    }
    return json.products || [];
  },

  async deleteRequirement(id: number): Promise<void> {
    const res = await fetch(`${API_BASE}/api/marketplace/requirements/${id}`, {
      method: "DELETE",
      headers: getHeaders(),
    });
    const json = await res.json();
    if (!res.ok) {
      throw new Error(json.message || "Failed to delete requirement");
    }
  },

  async searchMarketplace(query: string): Promise<Product[]> {
    if (!query || !query.trim()) return [];
    const res = await fetch(
      `${API_BASE}/api/marketplace/search?q=${encodeURIComponent(query.trim())}`,
      {
        headers: getHeaders(),
      }
    );
    const json = await res.json();
    if (!res.ok) {
      throw new Error(json.message || "Failed to search requirements");
    }
    return json.products || [];
  },

  async startChatWithSeller(productId: number): Promise<{ conversation: Conversation; product: Product }> {
    const res = await fetch(`${API_BASE}/api/marketplace/start-chat`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({ productId }),
    });
    const json = await res.json();
    if (!res.ok) {
      throw new Error(json.message || "Failed to start chat with seller");
    }
    return {
      conversation: json.conversation,
      product: json.product,
    };
  },

  async payForRequirement(
    productId: number,
    paymentMethod: string = "CARD"
  ): Promise<{ order: Order; conversationId: number }> {
    const res = await fetch(`${API_BASE}/api/marketplace/pay`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({ productId, paymentMethod }),
    });
    const json = await res.json();
    if (!res.ok) {
      throw new Error(json.message || "Payment failed");
    }
    return {
      order: json.order,
      conversationId: json.conversationId,
    };
  },
};
