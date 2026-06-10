import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Heart } from "lucide-react";
import { likesApi } from "@/api/likes";
import { ApiError } from "@/api/client";

interface LikeButtonProps {
    postId: number;
    initialLiked: boolean;
    initialCount: number;
    size?: "sm" | "md" | "lg";
}

export default function LikeButton({
    postId,
    initialLiked,
    initialCount,
    size = "md",
}: LikeButtonProps) {
    const [liked, setLiked] = useState(initialLiked);
    const [count, setCount] = useState(initialCount);
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    const mountedRef = useRef(true);

    useEffect(() => {
        return () => {
            mountedRef.current = false;
        };
    }, []);

    const handleClick = async () => {
        if (loading) return;

        const prevLiked = liked;
        const prevCount = count;
        setLiked(!liked);
        setCount(liked ? count - 1 : count + 1);
        setLoading(true);

        try {
            const result = await likesApi.toggleLike(postId);
            if (mountedRef.current) {
                setLiked(result.liked);
                setCount(result.like_count);
            }
        } catch (error) {
            if (mountedRef.current) {
                setLiked(prevLiked);
                setCount(prevCount);
            }
            if (error instanceof ApiError && error.status === 401) {
                navigate("/login");
            }
        } finally {
            if (mountedRef.current) {
                setLoading(false);
            }
        }
    };

    const sizeClasses = {
        sm: "w-4 h-4",
        md: "w-5 h-5",
        lg: "w-6 h-6",
    };

    return (
        <button
            onClick={handleClick}
            disabled={loading}
            className={`flex items-center gap-1 transition-colors ${
                liked
                    ? "text-indigo-500 hover:text-indigo-600"
                    : "text-stone-400 hover:text-indigo-400"
            } ${loading ? "opacity-50" : ""}`}
        >
            <Heart
                className={`${sizeClasses[size]} transition-transform ${
                    liked ? "fill-current scale-110" : ""
                }`}
            />
            <span className="text-sm">{count}</span>
        </button>
    );
}
