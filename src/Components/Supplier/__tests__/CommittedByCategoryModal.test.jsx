import { render, screen, within } from '@testing-library/react';
import CommittedByCategoryModal from '../CommittedByCategoryModal';
import { NO_CATEGORY } from '../utils/eventSupplierTotals';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key, arg) => (arg && typeof arg === 'object'
      ? (arg.defaultValue || key).replace('{{count}}', arg.count)
      : arg || key),
  }),
}));

jest.mock('../../UI', () => {
  const Modal = ({ isOpen, children }) => (isOpen ? <div role="dialog">{children}</div> : null);
  const Section = ({ children }) => <div>{children}</div>;
  Modal.Header = Section;
  Modal.Body = Section;
  Modal.Footer = Section;
  return {
    Modal,
    Badge: ({ children }) => <span>{children}</span>,
    Button: ({ children, onClick }) => <button type="button" onClick={onClick}>{children}</button>,
  };
});

const label = (category) => (category === NO_CATEGORY ? 'Sem categoria' : category);
// Intl uses a narrow no-break space between the amount and "€"
const euros = (text) => text.replace(/\s/g, ' ');

const suppliers = [
  { status: 'APPROVED', quoteAmount: 700, supplier: { category: 'MUSICA_DJ' } },
  { status: 'COUNTING_ON', quoteAmount: 900, supplier: { category: 'MUSICA_DJ' } },
  { status: 'PAID', quoteAmount: 1000.2, supplier: { category: 'Espaço' } },
  { status: 'REJECTED', quoteAmount: 80, supplier: { category: 'BEBIDAS' } },
];

describe('CommittedByCategoryModal', () => {
  it('lists each category with its committed amount and the overall total', () => {
    render(
      <CommittedByCategoryModal isOpen onClose={jest.fn()} eventSuppliers={suppliers} eventCurrency="EUR" categoryLabel={label} />,
    );

    const row = (name) => screen.getByText(name).closest('tr');
    expect(euros(within(row('MUSICA_DJ')).getByText(/700,00/).textContent)).toContain('700,00 €');
    expect(within(row('MUSICA_DJ')).getByText('2')).toBeInTheDocument();
    expect(euros(within(row('Espaço')).getByText(/1000,20/).textContent)).toContain('1000,20 €');
    expect(euros(within(row('BEBIDAS')).getByText(/0,00/).textContent)).toContain('0,00 €');

    const total = screen.getByText('Total comprometido').closest('tr');
    expect(euros(total.textContent)).toContain('1700,20 €');
  });

  it('renders nothing when closed', () => {
    render(
      <CommittedByCategoryModal isOpen={false} onClose={jest.fn()} eventSuppliers={suppliers} eventCurrency="EUR" categoryLabel={label} />,
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
