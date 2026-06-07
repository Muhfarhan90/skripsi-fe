import { ApiError, resolveRequestUrl } from "@/lib/api/client";
import { getStoredAuthToken } from "@/features/auth/lib/token-storage";
import type { ApiEnvelope } from "@/types/auth";
import type {
  MarkAllNotificationsReadResponse,
  NotificationFeed,
  NotificationListMeta,
  UserNotification,
} from "@/types/notification";

interface NotificationApiEnvelope<T> extends ApiEnvelope<T> {
  meta?: NotificationListMeta;
}

export const notificationQueryKeys = {
  all: ["notifications"] as const,
  feed: (page = 1, perPage = 8) => ["notifications", "feed", page, perPage] as const,
  history: (page = 1, perPage = 15) => ["notifications", "history", page, perPage] as const,
};

async function notificationRequestEnvelope<T>(
  endpoint: string,
  init: RequestInit,
): Promise<NotificationApiEnvelope<T>> {
  const token = getStoredAuthToken();
  const response = await fetch(resolveRequestUrl(endpoint), {
    ...init,
    cache: "no-store",
    headers: {
      Accept: "application/json",
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init.headers || {}),
    },
  });

  const payload = (await response
    .json()
    .catch(() => null)) as NotificationApiEnvelope<T> | null;

  if (!response.ok || !payload?.success) {
    throw new ApiError(
      payload?.message ?? `Request failed with status ${response.status}`,
      response.status,
      payload?.errors,
    );
  }

  return payload;
}

export async function getNotifications(options?: {
  page?: number;
  perPage?: number;
}): Promise<NotificationFeed> {
  const page = options?.page ?? 1;
  const perPage = options?.perPage ?? 8;
  const payload = await notificationRequestEnvelope<UserNotification[]>(
    `/api/notifications?per_page=${perPage}&page=${page}`,
    { method: "GET" },
  );
  const items = payload.data ?? [];

  return {
    items,
    meta: {
      current_page: payload.meta?.current_page ?? 1,
      last_page: payload.meta?.last_page ?? 1,
      per_page: payload.meta?.per_page ?? items.length,
      total: payload.meta?.total ?? items.length,
      unread_count:
        payload.meta?.unread_count ?? items.filter((notification) => !notification.is_read).length,
    },
  };
}

export async function markNotificationAsRead(notificationId: number): Promise<UserNotification> {
  const payload = await notificationRequestEnvelope<UserNotification>(
    `/api/notifications/${notificationId}/read`,
    { method: "PATCH" },
  );

  return payload.data as UserNotification;
}

export async function markAllNotificationsAsRead(): Promise<MarkAllNotificationsReadResponse> {
  const payload = await notificationRequestEnvelope<MarkAllNotificationsReadResponse>(
    "/api/notifications/read-all",
    { method: "PATCH" },
  );

  return payload.data ?? { updated_count: 0 };
}
