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
  message_count?: number;
  friend_count?: number;
  blocked_users?: string[];
  blocked_by?: string[];
  app_settings?: {
    theme?: 'light' | 'dark';
    language?: 'vi' | 'en';
    notifications?: boolean;
  };
  ai_settings?: {
    context_access?: boolean;
    personalized_training?: boolean;
  };
}

export interface Room {
  id: string;
  name: string;
  type: 'public' | 'private' | 'ai' | 'direct';
  other_user_id?: string;
  icon?: string;
  avatar_url?: string;
  is_online?: boolean;
  is_pinned?: boolean;
  last_message?: string;
  last_message_id?: string;
  last_message_sender?: string;
  last_message_at?: string;
  updated_at?: string;
  blocked_by_other?: boolean;
}

export interface Message {
  id: string; // Internal unique ID or backend message_id
  roomId?: string; // Room identifying the message context
  senderId: string;
  senderName: string;
  receiver_id?: string;
  content: string;
  file_url?: string;
  file_type?: 'image' | 'file';
  timestamp: string; // ISO string
  isBot: boolean;
  status?: 'sending' | 'sent' | 'delivered' | 'seen';
  isStreaming?: boolean;  // New features
  is_edited?: boolean;
  is_recalled?: boolean;
  is_pinned?: boolean;
  reply_to_id?: string;
  reply_to_content?: string;
  reactions?: Record<string, string[]>;
  suggestions?: string[];
  suggestionsDismissed?: boolean;
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
