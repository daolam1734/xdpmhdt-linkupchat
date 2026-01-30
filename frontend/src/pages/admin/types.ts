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
    ai_calls_today: number;
    ai_errors_count: number;
    ai_feedback_positive: number;
    ai_feedback_negative: number;
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
    ai_enabled: boolean;
    ai_auto_reply: boolean;
    ai_sentiment_analysis: boolean;
    ai_limit_per_user: number;
    ai_limit_per_group: number;
    ai_system_prompt: string;
    // New system settings
    max_message_length: number;
    max_file_size_mb: number;
    file_upload_enabled: boolean;
    maintenance_mode: boolean;
    system_notifications_enabled: boolean;
}

export interface SupportConversation {
    user_id: string;
    username: string;
    full_name?: string;
    last_message: string;
    timestamp: string;
    unread_count: number;
    status: 'ai_processing' | 'waiting' | 'resolved';
    internal_note?: string;
}

export interface SupportMessage {
    id: string;
    content: string;
    sender_id: string | null;
    sender_name: string;
    is_bot: boolean;
    timestamp: string;
    is_edited?: boolean;
    is_recalled?: boolean;
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

export interface Report {
    id: string;
    _id?: string;
    reporter_id: string;
    reporter_name?: string;
    reported_id: string;
    reported_name?: string;
    type: 'spam' | 'harassment' | 'inappropriate' | 'other';
    content?: string;
    message_id?: string;
    message_snippet?: string;
    status: 'pending' | 'resolved' | 'dismissed';
    timestamp: string;
    room_id?: string;
    action_taken?: string;
    admin_note?: string;
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
    filterTerm?: string;
    filter: 'all' | 'active' | 'banned' | 'admin' | 'user';
    processingIds?: string[];
    onSearchChange: (val: string) => void;
    onFilterChange: (val: any) => void;
    onRefresh: () => void;
    onAddUser: () => void;
    onEditUser: (user: User) => void;
    onToggleRole: (userId: string, currentIsAdmin: boolean) => void;
    onToggleBan: (userId: string) => void;
    onForceLogout: (userId: string) => void;
    onResetStatus: (userId: string) => void;
    onDeleteUser: (userId: string) => void;
    onExportCSV: () => void;
}

export interface RoomsTabProps {
    rooms: Room[];
    searchTerm: string;
    filterTerm?: string;
    processingIds?: string[];
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
    onStatusChange: (userId: string, status: string) => void;
    onNoteChange: (userId: string, note: string) => void;
    onUpdateMessage: (messageId: string, content: string) => void;
    onDeleteMessage: (messageId: string) => void;
}

export interface ReportsTabProps {
    stats: Stats;
    reports: Report[];
    onRefresh: () => void;
    onAction: (reportId: string, action: string, note?: string) => void;
}

export interface AIAssistantTabProps {
    stats: Stats;
    config: SystemConfig;
    saving: boolean;
    onConfigChange: (config: SystemConfig) => void;
    onSave: () => void;
    restrictedUsers?: string[];
    restrictedRooms?: string[];
    onToggleUserRestriction?: (userId: string) => void;
    onToggleRoomRestriction?: (roomId: string) => void;
}
