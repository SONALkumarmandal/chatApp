export interface User {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
  isOnline: boolean;
  lastSeen: Date | string;
  status?: string | null;
}

export interface MessageReaction {
  id: string;
  emoji: string;
  userId: string;
  messageId: string;
  user: Pick<User, "id" | "name">;
}

export interface Message {
  id: string;
  content: string;
  type: string;
  fileUrl?: string | null;
  fileName?: string | null;
  fileSize?: number | null;
  createdAt: Date | string;
  updatedAt: Date | string;
  isEdited: boolean;
  isDeleted: boolean;
  isRead: boolean;
  senderId: string;
  conversationId: string;
  sender: Pick<User, "id" | "name" | "image" | "email">;
  reactions: MessageReaction[];
}

export interface Conversation {
  id: string;
  createdAt: Date | string;
  updatedAt: Date | string;
  user1Id: string;
  user2Id: string;
  user1: User;
  user2: User;
  messages: Message[];
  _count: { messages: number };
}