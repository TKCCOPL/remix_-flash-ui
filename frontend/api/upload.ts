import { apiFetch } from './client';

export const uploadApi = {
  uploadImage: async (file: File): Promise<{ url: string }> => {
    const formData = new FormData();
    formData.append('file', file);
    return apiFetch<{ url: string }>('/api/upload', {
      method: 'POST',
      body: formData,
    });
  }
};
