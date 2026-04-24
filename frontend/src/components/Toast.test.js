import { render, screen, act } from '@testing-library/react';
import Toast from './Toast';

test('renders toast with message', () => {
  render(<Toast message="Test message" type="success" onClose={() => {}} />);
  expect(screen.getByText('Test message')).toBeInTheDocument();
});

test('renders success toast with correct styling', () => {
  render(<Toast message="Success!" type="success" onClose={() => {}} />);
  const toast = screen.getByText('Success!').closest('.toast');
  expect(toast).toHaveClass('toast-success');
});

test('renders error toast with correct styling', () => {
  render(<Toast message="Error!" type="error" onClose={() => {}} />);
  const toast = screen.getByText('Error!').closest('.toast');
  expect(toast).toHaveClass('toast-error');
});

test('calls onClose after timeout', () => {
  jest.useFakeTimers();
  const onClose = jest.fn();
  render(<Toast message="Auto close" type="success" onClose={onClose} />);
  act(() => { jest.advanceTimersByTime(4000); });
  expect(onClose).toHaveBeenCalled();
  jest.useRealTimers();
});
