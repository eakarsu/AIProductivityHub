import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import Goals from './Goals';
import Habits from './Habits';
import Notifications from './Notifications';
import { getNotifications } from '../services/api';

jest.mock('../services/api', () => ({ getNotifications: jest.fn() }));

const notices = Array.from({ length: 20 }, (_, index) => ({
  id: index + 1,
  title: `Productivity reminder ${index + 1}`,
  message: 'Review your current work.',
  type: 'info',
  created_at: '2026-10-10T12:00:00Z',
  is_read: false,
}));

afterEach(() => { jest.restoreAllMocks(); });

test('notification view requests and renders 20 project-domain records', async () => {
  getNotifications.mockResolvedValue({ data: { notifications: notices, total: 20, unreadCount: 20, totalPages: 1 } });
  render(<Notifications />);
  await waitFor(() => expect(screen.getAllByText(/Productivity reminder \d+/).length).toBe(20));
  expect(getNotifications).toHaveBeenCalledWith({ page: 1, limit: 20 });
  expect(screen.getByText('Productivity reminder 20')).toBeInTheDocument();
});

test('notification view keeps malformed record payloads out of map', async () => {
  getNotifications.mockResolvedValue({ data: { notifications: { error: 'unavailable' }, total: 0, unreadCount: 0, totalPages: 1 } });
  render(<Notifications />);
  await waitFor(() => expect(screen.getByText(/No notifications/i)).toBeInTheDocument());
});

test('goals view renders 20 rows from the real paginated API shape', async () => {
  const goals = Array.from({ length: 20 }, (_, index) => ({
    id: index + 1, title: `Focus goal ${index + 1}`, status: 'active', progress_pct: 0,
  }));
  const request = jest.spyOn(global, 'fetch').mockResolvedValue({
    json: async () => ({ data: goals, pagination: { page: 1, limit: 50, total: 20, totalPages: 1 } }),
  });
  const page = render(<Goals />);
  await waitFor(() => expect(screen.getByText('Focus goal 20')).toBeInTheDocument());
  expect(page.container.querySelectorAll('.card').length).toBeGreaterThanOrEqual(15);
  expect(request).toHaveBeenCalledWith(expect.stringContaining('/goals?page=1&limit=50'), expect.any(Object));
});

test('goals view does not attempt map on an error object', async () => {
  jest.spyOn(global, 'fetch').mockResolvedValue({ json: async () => ({ error: 'unavailable' }) });
  render(<Goals />);
  await waitFor(() => expect(screen.getByText(/No goals/i)).toBeInTheDocument());
});

test('habits view renders 20 rows from its paginated API and guards invalid data', async () => {
  const habits = Array.from({ length: 20 }, (_, index) => ({
    id: index + 1, name: `Daily habit ${index + 1}`, frequency: 'daily', target_count: 1, streak: 0,
  }));
  jest.spyOn(global, 'fetch').mockImplementation(async (url) => ({
    json: async () => String(url).includes('/streaks/') ? [] : { data: habits, pagination: { page: 1, total: 20 } },
  }));
  render(<Habits />);
  await waitFor(() => expect(screen.getByText('Daily habit 20')).toBeInTheDocument());
  expect(screen.getAllByText(/Daily habit \d+/).length).toBe(20);
});
