import { render, screen, fireEvent } from '@testing-library/react';
import Select from '../Select';

const OPTIONS = [
  { value: 'a', label: 'Alfa' },
  { value: 'b', label: 'Bravo' },
];

describe('Select', () => {
  // O botão de limpar vivia dentro do botão do trigger. <button> dentro de
  // <button> é DOM inválido: o React avisa, e o browser é livre de desfazer o
  // aninhamento, o que põe o botão de limpar fora do sítio.
  it('does not nest the clear button inside the trigger button', () => {
    const { container } = render(
      <Select name="test" options={OPTIONS} value="a" onChange={() => {}} clearable />
    );

    for (const button of container.querySelectorAll('button')) {
      expect(button.querySelector('button')).toBeNull();
    }
  });

  it('clears the selection without opening the dropdown', () => {
    const onChange = jest.fn();
    render(<Select name="test" options={OPTIONS} value="a" onChange={onChange} clearable />);

    fireEvent.click(screen.getByLabelText('Clear selection'));

    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({
      target: expect.objectContaining({ name: 'test', value: '' }),
    }));
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('clears every value in multiple mode', () => {
    const onChange = jest.fn();
    render(
      <Select name="test" options={OPTIONS} value={['a', 'b']} onChange={onChange} clearable multiple />
    );

    fireEvent.click(screen.getByLabelText('Clear selection'));

    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({
      target: expect.objectContaining({ value: [] }),
    }));
  });

  it('has no clear button when there is nothing to clear', () => {
    render(<Select name="test" options={OPTIONS} value="" onChange={() => {}} clearable />);

    expect(screen.queryByLabelText('Clear selection')).not.toBeInTheDocument();
  });

  it('opens the dropdown when the trigger is clicked', () => {
    render(<Select name="test" options={OPTIONS} value="a" onChange={() => {}} clearable />);

    fireEvent.click(screen.getByRole('button', { name: /Alfa/ }));

    expect(screen.getByText('Bravo')).toBeInTheDocument();
  });
});
