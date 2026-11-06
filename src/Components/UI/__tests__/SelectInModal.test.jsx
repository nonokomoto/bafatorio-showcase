import { render, screen, fireEvent } from '@testing-library/react';

// O Modal importa o DevOverlay, que arrasta o lottie-web — que não corre em
// jsdom (precisa de canvas). Nada disto interessa ao Escape.
jest.mock('lottie-react', () => () => null);

import Modal from '../Modal';
import Select from '../Select';

const OPTIONS = [
  { value: 'a', label: 'Alfa' },
  { value: 'b', label: 'Bravo' },
];

// O Modal escuta Escape no `document`; o Select trata-o no seu handler. Sem
// travar a propagação, um Escape destinado a fechar o dropdown sobe até ao
// document e leva o modal — e o formulário todo — com ele.
describe('Select dentro de Modal: Escape', () => {
  beforeEach(() => {
    const root = document.createElement('div');
    root.setAttribute('id', 'modal-root');
    document.body.appendChild(root);
  });

  afterEach(() => {
    document.getElementById('modal-root')?.remove();
  });

  const renderModalWithSelect = (onClose, selectProps = {}) =>
    render(
      <Modal isOpen onClose={onClose} ariaLabelledby="t">
        <Modal.Body>
          <Select name="test" options={OPTIONS} value="a" onChange={() => {}} {...selectProps} />
        </Modal.Body>
      </Modal>
    );

  it('closes only the dropdown, keeping the modal open', () => {
    const onClose = jest.fn();
    renderModalWithSelect(onClose);

    const trigger = screen.getByRole('button', { name: /Alfa/ });
    fireEvent.click(trigger);
    expect(screen.getByText('Bravo')).toBeInTheDocument();

    fireEvent.keyDown(trigger, { key: 'Escape' });

    expect(screen.queryByText('Bravo')).not.toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
  });

  // Com `search`, abrir o dropdown move o foco para o campo de pesquisa — que
  // é irmão do trigger, não descendente. O Escape dispara ali e nunca passa
  // pelo handler do trigger. É o caminho real de qualquer Select com pesquisa,
  // e um teste que dispare no trigger não o cobre.
  it('closes only the dropdown when focus is in the search box', () => {
    const onClose = jest.fn();
    renderModalWithSelect(onClose, { search: true });

    fireEvent.click(screen.getByRole('button', { name: /Alfa/ }));
    const searchBox = screen.getByPlaceholderText('Search...');
    expect(searchBox).toHaveFocus();

    fireEvent.keyDown(searchBox, { key: 'Escape' });

    expect(screen.queryByText('Bravo')).not.toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
  });

  // Com o dropdown fechado, Escape volta a pertencer ao modal.
  it('closes the modal when the dropdown is already closed', () => {
    const onClose = jest.fn();
    renderModalWithSelect(onClose);

    fireEvent.keyDown(document, { key: 'Escape' });

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
