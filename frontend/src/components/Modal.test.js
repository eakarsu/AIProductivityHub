import { render, screen, fireEvent } from '@testing-library/react';
import Modal from './Modal';

test('renders modal when isOpen is true', () => {
  render(
    <Modal isOpen={true} onClose={() => {}} title="Test Modal">
      <p>Modal content</p>
    </Modal>
  );
  expect(screen.getByText('Test Modal')).toBeInTheDocument();
  expect(screen.getByText('Modal content')).toBeInTheDocument();
});

test('does not render modal when isOpen is false', () => {
  render(
    <Modal isOpen={false} onClose={() => {}} title="Test Modal">
      <p>Modal content</p>
    </Modal>
  );
  expect(screen.queryByText('Test Modal')).not.toBeInTheDocument();
});

test('calls onClose when close button is clicked', () => {
  const onClose = jest.fn();
  render(
    <Modal isOpen={true} onClose={onClose} title="Test Modal">
      <p>Content</p>
    </Modal>
  );
  const closeBtn = screen.getByLabelText('Close modal');
  fireEvent.click(closeBtn);
  expect(onClose).toHaveBeenCalledTimes(1);
});

test('renders footer when provided', () => {
  render(
    <Modal isOpen={true} onClose={() => {}} title="Test" footer={<button>Save</button>}>
      <p>Content</p>
    </Modal>
  );
  expect(screen.getByText('Save')).toBeInTheDocument();
});
