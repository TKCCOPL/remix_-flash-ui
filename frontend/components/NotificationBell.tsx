import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Bell } from "lucide-react";
import { notificationsApi } from "@/api/notifications";

export default function NotificationBell() {
    const [unreadCount, setUnreadCount] = useState(0);

    useEffect(() => {
        notificationsApi.getUnreadCount().then(setUnreadCount).catch(console.error);
        const interval = setInterval(() => {
            notificationsApi.getUnreadCount().then(setUnreadCount).catch(console.error);
        }, 30000);
        return () => clearInterval(interval);
    }, []);

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
