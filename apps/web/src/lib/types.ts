export interface User {
  id: number;
  name: string;
  email: string;
  username: string;
  avatar?: string | null;
  createdAt?: string;
}

export interface MessageSender {
  id: number;
  name: string;
  username?: string;
  avatar?: string | null;
}

export interface ReplyToMessage {
  id: number;
  content: string | null;
  sender?: {
    id: number;
    name: string;
  };
}

export interface Message {
  id: number;
  content: string | null;
  image?: string | null;
  SenderId?: number;
  senderId?: number;
  sender: MessageSender;
  conversationId: number;
  replyToId?: number | null;
  replyTo?: ReplyToMessage | null;
  isSeen: boolean;
  seenAt?: string | null;
  isDeleted: boolean;
  deletedAt?: string | null;
  isEdited: boolean;
  editedAt?: string | null;
  createdAt: string;
}

export interface Conversation {
  id: number;
  isGroup: boolean;
  groupName?: string | null;
  groupAvatar?: string | null;
  groupAdminId?: number | null;
  participants: User[];
  messages?: Message[];
  acceptedUserIds?: number[];
  createdAt: string;
  updatedAt: string;
}

export interface Call {
  id: number;
  callerId: number;
  caller: User;
  receiverId: number;
  receiver: User;
  type: "audio" | "video";
  status: "ringing" | "accepted" | "rejected" | "ended" | "missed";
  startedAt: string;
  endedAt?: string | null;
  duration?: number | null;
  createdAt: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
}

export interface Product {
  id: number;
  title: string;
  description: string;
  price: number;
  currency: string;
  category: string;
  images: string[];
  status: "ACTIVE" | "SOLD" | "ARCHIVED";
  sellerId: number;
  seller: {
    id: number;
    name: string;
    username: string;
    email?: string;
    avatar?: string | null;
  };
  orders?: Order[];
  createdAt: string;
  updatedAt?: string;
}

export interface Order {
  id: number;
  productId: number;
  product?: Product;
  buyerId: number;
  buyer?: User;
  sellerId: number;
  seller?: User;
  amount: number;
  currency: string;
  status: string;
  paymentMethod: string;
  transactionId: string;
  createdAt: string;
}
