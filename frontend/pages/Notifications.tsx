import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Bell, Check, CheckCheck, MessageCircle, Trash2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { notificationsApi, Notification } from "@/api/notifications";
import { useI18n } from "@/context/Preferences";
import { useAuth } from "@/context/AuthContext";

// Animation variants
const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.05,
        },
    },
};

const itemVariants = {
    hidden: { opacity: 0, y: 12, scale: 0.98 },
    visible: {
        opacity: 1,
        y: 0,
        scale: 1,
        transition: {
            type: "spring",
            stiffness: 300,
            damping: 24,
        },
    },
    exit: {
        opacity: 0,
        x: -20,
        scale: 0.95,
        transition: { duration: 0.2 },
    },
};

const filterVariants = {
    initial: { opacity: 0, y: -8 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: 8 },
};

// Skeleton loader component
function NotificationSkeleton() {
    return (
        <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
                <div
                    key={i}
                    className="p-4 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800"
                >
                    <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-full bg-stone-200 dark:bg-stone-700 animate-pulse" />
                        <div className="flex-1 space-y-2">
                            <div className="h-4 w-3/4 bg-stone-200 dark:bg-stone-700 rounded animate-pulse" />
                            <div className="h-3 w-1/2 bg-stone-200 dark:bg-stone-700 rounded animate-pulse" />
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}

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
        // Optimistic update
        setNotifications((prev) =>
            prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));

        try {
            await notificationsApi.markAsRead(id);
            // Re-fetch to ensure consistency
            fetchNotifications();
        } catch (error) {
            console.error("Failed to mark as read:", error);
            // Revert on error
            fetchNotifications();
        }
    };

    const handleMarkAllRead = async () => {
        // Optimistic update
        setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
        setUnreadCount(0);

        try {
            await notificationsApi.markAllAsRead();
        } catch (error) {
            console.error("Failed to mark all as read:", error);
            fetchNotifications();
        }
    };

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return "刚刚";
        if (diffMins < 60) return `${diffMins} 分钟前`;
        if (diffHours < 24) return `${diffHours} 小时前`;
        if (diffDays < 7) return `${diffDays} 天前`;

        return date.toLocaleDateString("zh-CN", {
            month: "short",
            day: "numeric",
        });
    };

    return (
        <div className="max-w-2xl mx-auto p-4 sm:p-6">
            {/* Header */}
            <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex justify-between items-center mb-8"
            >
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
                            <Bell className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                        </div>
                        {unreadCount > 0 && (
                            <motion.span
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-medium"
                            >
                                {unreadCount > 9 ? "9+" : unreadCount}
                            </motion.span>
                        )}
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-stone-800 dark:text-stone-100">
                            {t.notifications.title}
                        </h1>
                        {unreadCount > 0 && (
                            <p className="text-sm text-stone-500 dark:text-stone-400">
                                {unreadCount} 条未读
                            </p>
                        )}
                    </div>
                </div>

                <AnimatePresence>
                    {unreadCount > 0 && (
                        <motion.button
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            onClick={handleMarkAllRead}
                            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 hover:bg-indigo-100 dark:hover:bg-indigo-900/30 rounded-xl transition-colors"
                        >
                            <CheckCheck className="w-4 h-4" />
                            {t.notifications.markAllRead}
                        </motion.button>
                    )}
                </AnimatePresence>
            </motion.div>

            {/* Filter tabs */}
            <motion.div
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="flex gap-2 mb-6 p-1 bg-stone-100 dark:bg-stone-800/50 rounded-xl"
            >
                {(["all", "unread"] as const).map((f) => (
                    <button
                        key={f}
                        onClick={() => setFilter(f)}
                        className={`relative flex-1 px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                            filter === f
                                ? "text-indigo-600 dark:text-indigo-400"
                                : "text-stone-500 dark:text-stone-400 hover:text-stone-700 dark:hover:text-stone-300"
                        }`}
                    >
                        {filter === f && (
                            <motion.div
                                layoutId="filterTab"
                                className="absolute inset-0 bg-white dark:bg-stone-700 rounded-lg shadow-sm"
                                transition={{ type: "spring", stiffness: 400, damping: 30 }}
                            />
                        )}
                        <span className="relative z-10">
                            {f === "all" ? t.notifications.filterAll : t.notifications.filterUnread}
                            {f === "unread" && unreadCount > 0 && (
                                <span className="ml-1.5 px-1.5 py-0.5 text-xs bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-full">
                                    {unreadCount}
                                </span>
                            )}
                        </span>
                    </button>
                ))}
            </motion.div>

            {/* Content */}
            {loading ? (
                <NotificationSkeleton />
            ) : notifications.length === 0 ? (
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="text-center py-16"
                >
                    <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-stone-100 dark:bg-stone-800 flex items-center justify-center">
                        <Bell className="w-8 h-8 text-stone-300 dark:text-stone-600" />
                    </div>
                    <p className="text-stone-500 dark:text-stone-400">
                        {t.notifications.empty}
                    </p>
                </motion.div>
            ) : (
                <motion.div
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                    className="space-y-3"
                >
                    <AnimatePresence mode="popLayout">
                        {notifications.map((n) => (
                            <motion.div
                                key={n.id}
                                variants={itemVariants}
                                layout
                                exit="exit"
                            >
                                <Link
                                    to={
                                        n.type === "comment_reply" && n.reference_id
                                            ? `/post/${n.reference_id}`
                                            : "#"
                                    }
                                    className={`group block p-4 rounded-xl border transition-all duration-200 ${
                                        n.is_read
                                            ? "bg-white dark:bg-stone-800/50 border-stone-200 dark:border-stone-700/50 hover:border-stone-300 dark:hover:border-stone-600 hover:shadow-sm"
                                            : "bg-gradient-to-r from-indigo-50 to-white dark:from-indigo-900/20 dark:to-stone-800/30 border-indigo-200 dark:border-indigo-800/50 hover:border-indigo-300 dark:hover:border-indigo-700 hover:shadow-md hover:shadow-indigo-100/50 dark:hover:shadow-indigo-900/20"
                                    }`}
                                >
                                    <div className="flex items-start gap-3">
                                        {/* Icon */}
                                        <div
                                            className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition-colors ${
                                                n.is_read
                                                    ? "bg-stone-100 dark:bg-stone-700 text-stone-400"
                                                    : "bg-indigo-100 dark:bg-indigo-900/30 text-indigo-500 dark:text-indigo-400"
                                            }`}
                                        >
                                            <MessageCircle className="w-5 h-5" />
                                        </div>

                                        {/* Content */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-start justify-between gap-2">
                                                <div>
                                                    <p
                                                        className={`font-medium ${
                                                            n.is_read
                                                                ? "text-stone-600 dark:text-stone-400"
                                                                : "text-stone-800 dark:text-stone-100"
                                                        }`}
                                                    >
                                                        {t.notifications.replyTitle}
                                                    </p>
                                                    <p className="text-sm text-stone-500 dark:text-stone-400 mt-0.5">
                                                        {n.type === "comment_reply"
                                                            ? t.notifications.replyType
                                                            : t.notifications.newNotification}
                                                    </p>
                                                </div>

                                                {/* Mark as read button */}
                                                {!n.is_read && (
                                                    <motion.button
                                                        whileHover={{ scale: 1.1 }}
                                                        whileTap={{ scale: 0.9 }}
                                                        onClick={(e) => {
                                                            e.preventDefault();
                                                            e.stopPropagation();
                                                            handleMarkRead(n.id);
                                                        }}
                                                        className="p-1.5 rounded-lg text-stone-400 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 opacity-0 group-hover:opacity-100 transition-all"
                                                        title="标记为已读"
                                                    >
                                                        <Check className="w-4 h-4" />
                                                    </motion.button>
                                                )}
                                            </div>

                                            {/* Time */}
                                            <p className="text-xs text-stone-400 dark:text-stone-500 mt-2">
                                                {formatDate(n.created_at)}
                                            </p>
                                        </div>

                                        {/* Unread indicator dot */}
                                        {!n.is_read && (
                                            <motion.div
                                                initial={{ scale: 0 }}
                                                animate={{ scale: 1 }}
                                                className="w-2 h-2 rounded-full bg-indigo-500 flex-shrink-0 mt-2"
                                            />
                                        )}
                                    </div>
                                </Link>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </motion.div>
            )}
        </div>
    );
}
