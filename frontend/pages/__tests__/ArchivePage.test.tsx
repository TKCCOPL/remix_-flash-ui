import { render, screen, waitFor } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import ArchivePage from '../ArchivePage'
import { PreferencesProvider } from '../../context/Preferences'

vi.mock('../../api/posts', () => ({
  postsApi: {
    list: vi.fn(),
    getArchive: vi.fn(),
  },
}))

const mockArchiveData = {
  '2024': [
    {
      month: '12',
      posts: [
        {
          id: 1,
          title: 'Test Post 1',
          created_at: '2024-12-15',
          summary: 'Test summary...',
        },
      ],
    },
  ],
}

describe('ArchivePage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders archive page with timeline', async () => {
    const { postsApi } = await import('../../api/posts')
    vi.mocked(postsApi.getArchive).mockResolvedValue(mockArchiveData as any)

    render(
      <BrowserRouter>
        <PreferencesProvider>
          <ArchivePage />
        </PreferencesProvider>
      </BrowserRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('2024')).toBeInTheDocument()
      expect(screen.getByText('Test Post 1')).toBeInTheDocument()
    })
  })
})
