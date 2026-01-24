export interface Comment {
    id: string;
    content: string;
    author_id: string;
    author_name: string;
    author_avatar?: string;
    timestamp: string;
}

export interface Post {
    id: string;
    title: string;
    content: string;
    tags: string[];
    author_id: string;
    author_name: string;
    author_avatar?: string;
    timestamp: string;
    likes: string[];
    comment_count: number;
    is_liked: boolean;
}

export interface PostDetail extends Post {
    comments: Comment[];
}
