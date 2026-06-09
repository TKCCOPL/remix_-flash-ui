import { apiFetch } from './client';

export interface LikeResponse {
    liked: boolean;
    like_count: number;
}

export interface BatchLikeStatus {
    [postId: string]: {
        liked: boolean;
        count: number;
    };
}

export const likesApi = {
    async toggleLike(postId: number): Promise<LikeResponse> {
        return apiFetch<LikeResponse>(`/api/posts/${postId}/like`, {
            method: "POST",
        });
    },

    async checkLiked(postId: number): Promise<LikeResponse> {
        return apiFetch<LikeResponse>(`/api/posts/${postId}/is-liked`);
    },

    async getBatchStatus(postIds: number[]): Promise<BatchLikeStatus> {
        return apiFetch<BatchLikeStatus>(`/api/likes/batch?ids=${postIds.join(",")}`);
    },
};
