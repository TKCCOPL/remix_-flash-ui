import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { List, X } from "lucide-react";

export interface TocItem {
    id: string;
    title: string;
    level: number;
}

interface TOCDrawerProps {
    headings: TocItem[];
    activeId: string;
}

export default function TOCDrawer({ headings, activeId }: TOCDrawerProps) {
    const [isOpen, setIsOpen] = useState(false);

    const handleClick = (id: string) => {
        const element = document.getElementById(id);
        if (element) {
            element.scrollIntoView({ behavior: "smooth" });
        }
        setIsOpen(false);
    };

    return (
        <>
            <button
                className="fixed bottom-6 right-6 z-40 xl:hidden
                           bg-indigo-500 hover:bg-indigo-600 text-white
                           rounded-full p-3 shadow-lg transition-colors"
                onClick={() => setIsOpen(true)}
                aria-label="打开目录"
            >
                <List className="w-5 h-5" />
            </button>

            <AnimatePresence>
                {isOpen && (
                    <>
                        <motion.div
                            className="fixed inset-0 bg-black/50 z-40 xl:hidden"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsOpen(false)}
                        />

                        <motion.aside
                            className="fixed right-0 top-0 h-full w-72
                                       bg-white dark:bg-stone-800 z-50
                                       p-4 overflow-y-auto shadow-xl xl:hidden"
                            initial={{ x: "100%" }}
                            animate={{ x: 0 }}
                            exit={{ x: "100%" }}
                            transition={{ type: "spring", damping: 25, stiffness: 200 }}
                        >
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="font-bold text-lg">目录</h3>
                                <button
                                    onClick={() => setIsOpen(false)}
                                    className="p-1 hover:bg-stone-100 dark:hover:bg-stone-700 rounded"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <nav className="space-y-1">
                                {headings.map((h) => (
                                    <button
                                        key={h.id}
                                        onClick={() => handleClick(h.id)}
                                        className={`block w-full text-left py-2 px-3 rounded transition-colors
                                                   hover:bg-stone-100 dark:hover:bg-stone-700
                                                   ${h.level === 3 ? "pl-6 text-sm" : ""}
                                                   ${activeId === h.id ? "bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600" : ""}`}
                                    >
                                        {h.title}
                                    </button>
                                ))}
                            </nav>
                        </motion.aside>
                    </>
                )}
            </AnimatePresence>
        </>
    );
}
