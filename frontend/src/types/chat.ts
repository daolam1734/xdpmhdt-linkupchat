export interface User {
  id: string;
  username: string;
  avatar?: string;
  avatar_url?: string;
  bio?: string;
  is_online?: boolean;
  isOnline?: boolean;
  last_seen?: string;
  created_at?: string;
  is_friend?: boolean;
  request_sent?: boolean;
  allow_stranger_messages?: boolean;
  is_superuser?: boolean;
}

export interface Room {
  id: string;
  name: string;
  type: 'public' | 'private' | 'ai' | 'direct';
  icon?: string;
  avatar_url?: string;
  is_online?: boolean;
  last_message?: string;
  last_message_id?: string;
  last_message_sender?: string;
  last_message_at?: string;
  updated_at?: string;
}

export interface Message {
  id: string; // Internal unique ID or backend message_id
  roomId?: string; // Room identifying the message context
  senderId: string;
  senderName: string;
  content: string;
  file_url?: string;
  file_type?: 'image' | 'file';
  timestamp: string; // ISO string
  isBot: boolean;
  isStreaming?: boolean;  // New features
  is_edited?: boolean;
  is_recalled?: boolean;
  is_pinned?: boolean;
  reply_to_id?: string;
  reply_to_content?: string;
  suggestions?: string[];
  shared_post?: {
    id: string;
    title: string;
    content: string;
    author_name: string;
  };
}

export interface ChatState {
  currentUser: User | null;
  activeRoom: Room | null;
  messages: Message[];
  isConnected: boolean;
  error: string | null;
  clientId?: string;
}
