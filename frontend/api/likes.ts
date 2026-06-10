import { apiFetch } from './client';

export interface LikeResponse {
    liked: boolean;
    like_count: number;
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
};
