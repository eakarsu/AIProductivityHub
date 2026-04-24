import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// Mock api module
jest.mock('./services/api', () => ({
  getMe: jest.fn().mockRejectedValue(new Error('Not authenticated')),
  login: jest.fn(),
  register: jest.fn(),
}));

// Mock i18n
jest.mock('./i18n', () => {});

import App from './App';

test('renders login page when not authenticated', async () => {
  render(
    <MemoryRouter initialEntries={['/login']}>
      <App />
    </MemoryRouter>
  );

  // Should show loading initially, then login
  const heading = await screen.findByText(/AI Productivity Hub/i);
  expect(heading).toBeInTheDocument();
});

test('renders sign in button on login page', async () => {
  render(
    <MemoryRouter initialEntries={['/login']}>
      <App />
    </MemoryRouter>
  );

  const signInBtn = await screen.findByRole('button', { name: /sign in/i });
  expect(signInBtn).toBeInTheDocument();
});
