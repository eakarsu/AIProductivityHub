import { render, screen, fireEvent } from '@testing-library/react';
import Pagination from './Pagination';

test('renders correct number of page buttons', () => {
  render(<Pagination currentPage={1} totalPages={5} onPageChange={() => {}} />);
  expect(screen.getByText('1')).toBeInTheDocument();
  expect(screen.getByText('5')).toBeInTheDocument();
});

test('disables previous button on first page', () => {
  render(<Pagination currentPage={1} totalPages={5} onPageChange={() => {}} />);
  const prevBtn = screen.getByLabelText('Previous page');
  expect(prevBtn).toBeDisabled();
});

test('disables next button on last page', () => {
  render(<Pagination currentPage={5} totalPages={5} onPageChange={() => {}} />);
  const nextBtn = screen.getByLabelText('Next page');
  expect(nextBtn).toBeDisabled();
});

test('calls onPageChange when page button clicked', () => {
  const onPageChange = jest.fn();
  render(<Pagination currentPage={1} totalPages={5} onPageChange={onPageChange} />);
  fireEvent.click(screen.getByText('3'));
  expect(onPageChange).toHaveBeenCalledWith(3);
});

test('highlights current page', () => {
  render(<Pagination currentPage={3} totalPages={5} onPageChange={() => {}} />);
  const currentPageBtn = screen.getByText('3');
  expect(currentPageBtn).toHaveClass('active');
});
