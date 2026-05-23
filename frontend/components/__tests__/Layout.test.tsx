import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { describe, it, expect } from 'vitest';
import { PreferencesProvider } from '../../context/Preferences';
import Layout from '../Layout';

describe('Layout', () => {
  it('renders navigation links for new pages', () => {
    render(
      <BrowserRouter>
        <PreferencesProvider>
          <Layout />
        </PreferencesProvider>
      </BrowserRouter>
    );

    expect(screen.getByText('归档')).toBeInTheDocument();
    expect(screen.getByText('分类')).toBeInTheDocument();
    expect(screen.getByText('搜索')).toBeInTheDocument();
  });
});
