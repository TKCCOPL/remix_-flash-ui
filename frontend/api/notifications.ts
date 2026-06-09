import { apiFetch } from './client';

export interface Notification {
    id: number;
    user_id: number;
    type: string;
    reference_id: number;
    is_read: boolean;
    created_at: string;
}

export interface NotificationsResponse {
    notifications: Notification[];
    unread_count: number;
}

export const notificationsApi = {
    async getNotifications(unreadOnly: boolean = false): Promise<NotificationsResponse> {
        const params = new URLSearchParams();
        if (unreadOnly) params.append("unread_only", "true");
        const query = params.toString();
        return apiFetch<NotificationsResponse>(`/api/notifications${query ? `?${query}` : ""}`);
    },

    async getUnreadCount(): Promise<number> {
        const data = await apiFetch<{ unread_count: number }>("/api/notifications/unread-count");
        return data.unread_count;
    },

    async markAsRead(notificationId: number): Promise<void> {
        await apiFetch<void>(`/api/notifications/${notificationId}/read`, {
            method: "PATCH",
        });
    },

    async markAllAsRead(): Promise<void> {
        await apiFetch<void>("/api/notifications/read-all", {
            method: "PATCH",
        });
    },
};
