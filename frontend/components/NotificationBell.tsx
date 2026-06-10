import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { Bell } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { notificationsApi } from "@/api/notifications";
import { useAuth } from "@/context/AuthContext";

export default function NotificationBell() {
    const { user, isAdmin } = useAuth();
    const [unreadCount, setUnreadCount] = useState(0);
    const [isAnimating, setIsAnimating] = useState(false);
    const prevCountRef = useRef(0);

    useEffect(() => {
        if (!user && !isAdmin) return;

        const fetchUnread = async () => {
            try {
                const count = await notificationsApi.getUnreadCount();
                // Trigger animation when count increases
                if (count > prevCountRef.current) {
                    setIsAnimating(true);
                    setTimeout(() => setIsAnimating(false), 600);
                }
                prevCountRef.current = count;
                setUnreadCount(count);
            } catch {
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
            className="relative p-2 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-xl transition-colors"
        >
            <motion.div
                animate={
                    isAnimating
                        ? {
                              rotate: [0, -15, 15, -10, 10, -5, 5, 0],
                              transition: { duration: 0.6 },
                          }
                        : {}
                }
            >
                <Bell className="w-5 h-5 text-stone-600 dark:text-stone-300" />
            </motion.div>

            <AnimatePresence>
                {unreadCount > 0 && (
                    <motion.span
                        key={unreadCount}
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0, opacity: 0 }}
                        transition={{
                            type: "spring",
                            stiffness: 500,
                            damping: 15,
                        }}
                        className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-xs rounded-full min-w-[18px] h-[18px] flex items-center justify-center font-medium shadow-sm shadow-red-500/30"
                    >
                        {unreadCount > 9 ? "9+" : unreadCount}
                    </motion.span>
                )}
            </AnimatePresence>
        </Link>
    );
}
