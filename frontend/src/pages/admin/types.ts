export interface Stats {
    total_users: number;
    total_admins: number;
    total_messages: number;
    total_rooms: number;
    new_messages_24h: number;
    online_users: number;
    new_users_24h: number;
    new_users_7d: number;
    pending_support: number;
    ai_usage_count: number;
    unhandled_reports: number;
    db_size_mb: number;
    system_alerts: Array<{
        type: string;
        level: 'critical' | 'warning' | 'info';
        message: string;
        timestamp: string;
    }>;
    top_rooms: Array<{
        name: string;
        message_count: number;
        type: string;
    }>;
    hourly_stats: number[];
    latency_ms: number;
}

export interface User {
    id: string;
    username: string;
    full_name?: string;
    email?: string;
    phone?: string;
    is_active: boolean;
    is_superuser: boolean;
    role: string;
    permissions: string[];
    is_online?: boolean;
    created_at: string;
    avatar_url?: string;
}

export interface SystemConfig {
    google_api_key?: string;
    openai_api_key?: string;
    ai_auto_reply: boolean;
    ai_sentiment_analysis: boolean;
    ai_system_prompt: string;
}

export interface SupportConversation {
    user_id: string;
    username: string;
    last_message: string;
    timestamp: string;
    unread_count: number;
}

export interface SupportMessage {
    id: string;
    content: string;
    sender_id: string | null;
    sender_name: string;
    is_bot: boolean;
    timestamp: string;
}

export interface Room {
    id: string;
    name: string;
    description: string;
    type: string;
    is_private: boolean;
    created_at: string;
    created_by: string;
    message_count: number;
    member_count: number;
    is_locked?: boolean;
}

export interface OverviewTabProps {
    stats: Stats;
    loading: boolean;
    onManualRefresh: () => void;
    onSetActiveTab: (tab: any) => void;
}

export interface UsersTabProps {
    users: User[];
    searchTerm: string;
    filter: 'all' | 'admin' | 'user' | 'inactive';
    onSearchChange: (val: string) => void;
    onFilterChange: (val: any) => void;
    onRefresh: () => void;
    onAddUser: () => void;
    onEditUser: (user: User) => void;
    onToggleRole: (userId: string, currentIsAdmin: boolean) => void;
    onDeleteUser: (userId: string) => void;
    onExportCSV: () => void;
}

export interface RoomsTabProps {
    rooms: Room[];
    searchTerm: string;
    onSearchChange: (val: string) => void;
    onRefresh: () => void;
    onToggleLock: (roomId: string) => void;
    onDelete: (roomId: string) => void;
    onCleanup: () => void;
}

export interface SettingsTabProps {
    config: SystemConfig;
    saving: boolean;
    showGoogleKey: boolean;
    showOpenAIKey: boolean;
    onToggleGoogleKey: () => void;
    onToggleOpenAIKey: () => void;
    onConfigChange: (config: SystemConfig) => void;
    onSave: () => void;
}

export interface SupportTabProps {
    conversations: SupportConversation[];
    selectedUser: SupportConversation | null;
    messages: SupportMessage[];
    replyContent: string;
    sendingReply: boolean;
    onSelectUser: (user: SupportConversation) => void;
    onReplyChange: (content: string) => void;
    onSendReply: () => void;
}

export interface ReportsTabProps {
    stats: Stats;
}

export interface AIAssistantTabProps {
    config: SystemConfig;
    saving: boolean;
    onConfigChange: (config: SystemConfig) => void;
    onSave: () => void;
}
