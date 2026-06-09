import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Bell } from "lucide-react";
import { notificationsApi } from "@/api/notifications";
import { useAuth } from "@/context/AuthContext";

export default function NotificationBell() {
    const { user, isAdmin } = useAuth();
    const [unreadCount, setUnreadCount] = useState(0);

    useEffect(() => {
        if (!user && !isAdmin) return;

        const fetchUnread = async () => {
            try {
                const count = await notificationsApi.getUnreadCount();
                setUnreadCount(count);
            } catch {
                // Stop polling on auth errors
                setUnreadCount(0);
            }
        };

        fetchUnread();
        const interval = setInterval(fetchUnread, 30000);
        return () => clearInterval(interval);
    }, [user, isAdmin]);

    return (
        <Link
            to="/notifications"
            className="relative p-2 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-lg transition-colors"
        >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                    {unreadCount > 9 ? "9+" : unreadCount}
                </span>
            )}
        </Link>
    );
}
