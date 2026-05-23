import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import SearchPage from '../SearchPage'
import { PreferencesProvider } from '../../context/Preferences'

vi.mock('../../api/posts', () => ({
  postsApi: {
    search: vi.fn()
  }
}))

const mockSearchResults = {
  results: [
    {
      id: 1,
      title: 'React Tutorial',
      summary: 'Learn React basics...',
      category: 'Tech',
      created_at: '2024-12-15'
    }
  ],
  total: 1
}

describe('SearchPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
  })

  it('renders search page with input', async () => {
    render(
      <BrowserRouter>
        <PreferencesProvider>
          <SearchPage />
        </PreferencesProvider>
      </BrowserRouter>
    )

    expect(screen.getByPlaceholderText('输入关键词搜索...')).toBeInTheDocument()
  })

  it('performs search on form submit', async () => {
    const { postsApi } = await import('../../api/posts')
    vi.mocked(postsApi.search).mockResolvedValue(mockSearchResults as any)

    render(
      <BrowserRouter>
        <PreferencesProvider>
          <SearchPage />
        </PreferencesProvider>
      </BrowserRouter>
    )

    const input = screen.getByPlaceholderText('输入关键词搜索...')
    fireEvent.change(input, { target: { value: 'React' } })
    fireEvent.submit(input.closest('form')!)

    await waitFor(() => {
      expect(postsApi.search).toHaveBeenCalledWith('React')
      expect(screen.getByText('React Tutorial')).toBeInTheDocument()
    })
  })
})