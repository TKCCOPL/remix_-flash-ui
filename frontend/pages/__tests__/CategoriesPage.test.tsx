import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import CategoriesPage from '../CategoriesPage';
import { PreferencesProvider } from '../../context/Preferences';

vi.mock('../../api/categories', () => ({
  categoriesApi: {
    list: vi.fn(),
  },
}));

const mockCategories = [
  { id: 1, name: 'Tech', slug: 'tech', description: 'Technology related posts', post_count: 12 },
  { id: 2, name: 'Design', slug: 'design', description: 'Design related posts', post_count: 8 },
  { id: 3, name: 'Programming', slug: 'programming', description: 'Programming related posts', post_count: 5 },
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
        <PreferencesProvider>
          <CategoriesPage />
        </PreferencesProvider>
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
        <PreferencesProvider>
          <CategoriesPage />
        </PreferencesProvider>
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('暂无分类')).toBeInTheDocument();
    });
  });
});
