import { fireEvent, render, screen, within } from '@testing-library/react';
import EventDatePicker from '../EventDatePicker';

jest.mock('../../UI/DevOverlay', () => () => null);

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    i18n: { language: 'en-US' },
    t: (key) => key,
  }),
}));

const setViewport = (isMobile) => {
  window.matchMedia.mockImplementation((query) => ({
    matches: isMobile && query === '(max-width: 767px)',
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  }));
};

describe('EventDatePicker', () => {
  beforeEach(() => {
    const modalRoot = document.createElement('div');
    modalRoot.id = 'modal-root';
    document.body.appendChild(modalRoot);
    setViewport(false);
  });

  afterEach(() => {
    document.getElementById('modal-root')?.remove();
  });

  it('offers month and year navigation in range and specific date modes', () => {
    render(<EventDatePicker value={null} onChange={jest.fn()} />);

    fireEvent.click(screen.getByText('eventDatePicker.trigger.placeholder'));

    const dialog = screen.getByRole('dialog');
    expect(dialog.querySelectorAll('.rdp-month')).toHaveLength(2);
    expect(within(dialog).getAllByRole('combobox')).toHaveLength(4);

    fireEvent.click(within(dialog).getByRole('button', { name: 'eventDatePicker.modes.specific' }));

    expect(dialog.querySelectorAll('.rdp-month')).toHaveLength(1);
    expect(within(dialog).getAllByRole('combobox')).toHaveLength(2);
  });

  it('shows one range calendar on mobile', () => {
    setViewport(true);
    render(<EventDatePicker value={null} onChange={jest.fn()} />);

    fireEvent.click(screen.getByText('eventDatePicker.trigger.placeholder'));

    const dialog = screen.getByRole('dialog');
    expect(dialog.querySelectorAll('.rdp-month')).toHaveLength(1);
    expect(within(dialog).getAllByRole('combobox')).toHaveLength(2);
  });
});
