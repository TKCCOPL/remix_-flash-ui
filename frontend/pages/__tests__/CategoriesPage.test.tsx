import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import CategoriesPage from '../CategoriesPage';

vi.mock('../../api/categories', () => ({
  categoriesApi: {
    list: vi.fn(),
  },
}));

const mockCategories = [
  { name: 'Tech', slug: 'tech', post_count: 12 },
  { name: 'Design', slug: 'design', post_count: 8 },
  { name: 'Programming', slug: 'programming', post_count: 5 },
];

describe('CategoriesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders categories page with tag cloud', async () => {
    const { categoriesApi } = await import('../../api/categories');
    vi.mocked(categoriesApi.list).mockResolvedValue(mockCategories);

    render(
      <BrowserRouter>
        <CategoriesPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Tech')).toBeInTheDocument();
      expect(screen.getByText('Design')).toBeInTheDocument();
      expect(screen.getByText('Programming')).toBeInTheDocument();
    });
  });

  it('renders empty state when no categories', async () => {
    const { categoriesApi } = await import('../../api/categories');
    vi.mocked(categoriesApi.list).mockResolvedValue([]);

    render(
      <BrowserRouter>
        <CategoriesPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('暂无分类')).toBeInTheDocument();
    });
  });
});
