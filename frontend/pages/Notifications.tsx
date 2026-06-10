import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Bell, Check, CheckCheck } from "lucide-react";
import { notificationsApi, Notification } from "@/api/notifications";
import { useI18n } from "@/context/Preferences";
import { useAuth } from "@/context/AuthContext";

export default function Notifications() {
    const t = useI18n();
    const navigate = useNavigate();
    const { user, isAdmin, loading: authLoading } = useAuth();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [filter, setFilter] = useState<"all" | "unread">("all");
    const [loading, setLoading] = useState(true);
    const cancelledRef = useRef(false);

    useEffect(() => {
        if (authLoading) return;
        if (!user && !isAdmin) {
            navigate("/login");
            return;
        }
        cancelledRef.current = false;
        fetchNotifications();
        return () => {
            cancelledRef.current = true;
        };
    }, [filter, user, isAdmin, authLoading, navigate]);

    const fetchNotifications = async () => {
        setLoading(true);
        try {
            const data = await notificationsApi.getNotifications(filter === "unread");
            if (cancelledRef.current) return;
            setNotifications(data.notifications);
            setUnreadCount(data.unread_count);
        } catch (error) {
            if (cancelledRef.current) return;
            console.error(error);
        } finally {
            if (!cancelledRef.current) setLoading(false);
        }
    };

    const handleMarkRead = async (id: number) => {
        try {
            await notificationsApi.markAsRead(id);
            fetchNotifications();
        } catch (error) {
            console.error("Failed to mark as read:", error);
        }
    };

    const handleMarkAllRead = async () => {
        try {
            await notificationsApi.markAllAsRead();
            fetchNotifications();
        } catch (error) {
            console.error("Failed to mark all as read:", error);
        }
    };

    if (loading) {
        return <div className="text-center py-8">{t.notifications.loading}</div>;
    }

    return (
        <div className="max-w-2xl mx-auto p-4">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold flex items-center gap-2">
                    <Bell className="w-6 h-6" /> {t.notifications.title}
                </h1>
                {unreadCount > 0 && (
                    <button
                        onClick={handleMarkAllRead}
                        className="flex items-center gap-1 text-indigo-500 hover:text-indigo-600"
                    >
                        <CheckCheck className="w-4 h-4" /> {t.notifications.markAllRead}
                    </button>
                )}
            </div>

            <div className="flex gap-2 mb-4">
                <button
                    onClick={() => setFilter("all")}
                    className={`px-3 py-1 rounded ${filter === "all" ? "bg-indigo-500 text-white" : "bg-stone-200 dark:bg-stone-700"}`}
                >
                    {t.notifications.filterAll}
                </button>
                <button
                    onClick={() => setFilter("unread")}
                    className={`px-3 py-1 rounded ${filter === "unread" ? "bg-indigo-500 text-white" : "bg-stone-200 dark:bg-stone-700"}`}
                >
                    {t.notifications.filterUnread} ({unreadCount})
                </button>
            </div>

            {notifications.length === 0 ? (
                <div className="text-center py-8 text-stone-500">{t.notifications.empty}</div>
            ) : (
                <div className="space-y-2">
                    {notifications.map((n) => (
                        <Link
                            key={n.id}
                            to={n.type === "comment_reply" && n.reference_id ? `/post/${n.reference_id}` : "#"}
                            className={`block p-4 rounded-lg border transition-colors ${
                                n.is_read
                                    ? "bg-white dark:bg-stone-800 border-stone-200 dark:border-stone-700 hover:border-stone-300 dark:hover:border-stone-600"
                                    : "bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800 hover:border-indigo-300 dark:hover:border-indigo-700"
                            }`}
                        >
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="font-medium">{t.notifications.replyTitle}</p>
                                    <p className="text-sm text-stone-500">
                                        {n.type === "comment_reply" ? t.notifications.replyType : t.notifications.newNotification}
                                    </p>
                                </div>
                                {!n.is_read && (
                                    <button
                                        onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            handleMarkRead(n.id);
                                        }}
                                        className="text-stone-400 hover:text-indigo-500"
                                    >
                                        <Check className="w-4 h-4" />
                                    </button>
                                )}
                            </div>
                            <p className="text-xs text-stone-400 mt-2">
                                {new Date(n.created_at).toLocaleString()}
                            </p>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    );
}
