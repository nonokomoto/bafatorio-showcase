import { render, screen, fireEvent } from '@testing-library/react';

jest.mock('react-icons/fi', () => ({
  FiX: () => <span data-testid="fi-x">x</span>,
}));

import DetailPanelShell from '../DetailPanelShell';

describe('DetailPanelShell', () => {
  it('does not render when isOpen is false', () => {
    render(
      <DetailPanelShell isOpen={false} onClose={() => {}}>
        <div>Panel content</div>
      </DetailPanelShell>,
    );
    expect(screen.queryByText('Panel content')).not.toBeInTheDocument();
  });

  it('renders children when isOpen is true', () => {
    render(
      <DetailPanelShell isOpen onClose={() => {}}>
        <div>Panel content</div>
      </DetailPanelShell>,
    );
    expect(screen.getByText('Panel content')).toBeInTheDocument();
  });

  it('calls onClose when the backdrop is clicked', () => {
    const onClose = jest.fn();
    render(
      <DetailPanelShell isOpen onClose={onClose}>
        <div>Panel content</div>
      </DetailPanelShell>,
    );
    fireEvent.click(screen.getByTestId('detail-panel-backdrop'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('does NOT call onClose when clicking inside the panel', () => {
    const onClose = jest.fn();
    render(
      <DetailPanelShell isOpen onClose={onClose}>
        <div>Panel content</div>
      </DetailPanelShell>,
    );
    fireEvent.click(screen.getByText('Panel content'));
    expect(onClose).not.toHaveBeenCalled();
  });

  it('calls onClose when pressing Escape', () => {
    const onClose = jest.fn();
    render(
      <DetailPanelShell isOpen onClose={onClose}>
        <div>Panel content</div>
      </DetailPanelShell>,
    );
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('renders the close button and wires it to onClose', () => {
    const onClose = jest.fn();
    render(
      <DetailPanelShell isOpen onClose={onClose} ariaLabel="Supplier panel">
        <div>Body</div>
      </DetailPanelShell>,
    );
    const closeBtn = screen.getByRole('button', { name: /close/i });
    fireEvent.click(closeBtn);
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
