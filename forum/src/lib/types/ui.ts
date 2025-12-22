
// Notification types
export type NotificationType = 
  | 'comment_on_post' 
  | 'reply_to_comment' 
  | 'bookmark_summary';

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  issue_id: string | null;
  comment_id: string | null;
  actor_id: string | null;
  content_preview: string | null;
  aggregate_count: number;
  is_read: boolean;
  created_at: string;
  
  // Joined data (from API)
  actor_username?: string;
  actor_avatar_url?: string;
  issue_title?: string;
}

export interface NotificationSettings {
  user_id: string;
  comment_on_post_enabled: boolean;
  reply_to_comment_enabled: boolean;
  bookmark_summary_enabled: boolean;
  updated_at: string;
}
