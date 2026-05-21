import type { ApiPaginationMeta } from "@/types/auth";

export interface NotificationActor {
  id: number;
  fullname: string;
  email: string;
}

export interface NotificationData {
  route?: string;
  [key: string]: unknown;
}

export interface UserNotification {
  id: number;
  user_id: number;
  type: string;
  title: string;
  body: string;
  data: NotificationData | null;
  reference_type: string | null;
  reference_id: number | null;
  actor_id: number | null;
  is_read: boolean;
  read_at: string | null;
  sent_at: string | null;
  created_at: string | null;
  updated_at: string | null;
  actor?: NotificationActor | null;
}

export interface NotificationListMeta extends ApiPaginationMeta {
  unread_count: number;
}

export interface NotificationFeed {
  items: UserNotification[];
  meta: NotificationListMeta;
}

export interface MarkAllNotificationsReadResponse {
  updated_count: number;
}
