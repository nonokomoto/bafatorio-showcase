import { forwardRef, useState, useRef, useEffect } from 'react';
import PropTypes from 'prop-types';
import { Text } from './index';

const Select = forwardRef(({
  id,
  name,
  label,
  placeholder,
  helperText,
  options = [],
  optionGroups = null,
  value,
  defaultValue,
  error,
  size = 'md',
  required = false,
  disabled = false,
  fullWidth = true,
  search = false,
  clearable = false,
  multiple = false,
  startIcon = null,
  endIcon = null,
  className = '',
  containerClassName = '',
  labelClassName = '',
  selectClassName = '',
  optionClassName = '',
  helperTextClassName = '',
  t = null, // Função de tradução que pode ser passada
  translationKey = '', // Chave base para tradução (ex: 'form.fields')
  onChange,
  onBlur,
  ...props
}, ref) => {
  // Estados internos
  const [internalValue, setInternalValue] = useState(multiple ? [] : '');
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [dropdownDirection, setDropdownDirection] = useState('down'); // 'down' or 'up'
  
  // Refs
  const selectContainerRef = useRef(null);
  const optionsContainerRef = useRef(null);
  const searchInputRef = useRef(null);
  const buttonRef = useRef(null);
  
  // Inicialização do valor
  useEffect(() => {
    if (value !== undefined) {
      setInternalValue(value);
    } else if (defaultValue !== undefined) {
      setInternalValue(defaultValue);
    }
  }, [value, defaultValue]);
  
  // Manipulação de clique fora para fechar o dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (selectContainerRef.current && !selectContainerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [selectContainerRef]);
  
  // Foco no campo de pesquisa quando o dropdown é aberto
  useEffect(() => {
    if (isOpen && search && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen, search, searchInputRef]);

  // Bloquear scroll do body em mobile quando dropdown está aberto
  useEffect(() => {
    if (isOpen) {
      const isMobile = window.innerWidth < 768;
      if (isMobile) {
        document.body.style.overflow = 'hidden';
      }
      return () => {
        document.body.style.overflow = '';
      };
    }
  }, [isOpen]);

  // Calcular direção do dropdown (abrir para cima ou para baixo)
  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const buttonRect = buttonRef.current.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const spaceBelow = viewportHeight - buttonRect.bottom;
      const spaceAbove = buttonRect.top;
      const dropdownHeight = 240; // max-h-60 = 15rem = 240px
      
      // Se não há espaço suficiente abaixo mas há acima, abrir para cima
      if (spaceBelow < dropdownHeight && spaceAbove > spaceBelow) {
        setDropdownDirection('up');
      } else {
        setDropdownDirection('down');
      }
    }
  }, [isOpen]);
  
  // Rolagem para opção destacada
  useEffect(() => {
    if (isOpen && highlightedIndex >= 0 && optionsContainerRef.current) {
      const highlightedElement = optionsContainerRef.current.children[highlightedIndex];
      if (highlightedElement) {
        highlightedElement.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [highlightedIndex, isOpen, optionsContainerRef]);
  
  // Determinar placeholder com base em tradução ou valor direto
  const getPlaceholder = () => {
    if (t && translationKey && placeholder === undefined) {
      return t(`${translationKey}.${name}.placeholder`);
    }
    return placeholder || '';
  };

  // Determinar label com base em tradução ou valor direto
  const getLabel = () => {
    if (t && translationKey && label === undefined) {
      return t(`${translationKey}.${name}.label`);
    }
    return label;
  };

  // Determinar texto de ajuda com base em tradução ou valor direto
  const getHelperText = () => {
    if (t && translationKey && helperText === undefined && !error) {
      const key = `${translationKey}.${name}.helperText`;
      const translated = t(key);
      return translated !== key ? translated : '';
    }
    return helperText;
  };

  // Determinar erro com base em tradução ou valor direto
  const getError = () => {
    if (typeof error === 'string') {
      return error;
    }
    if (t && translationKey && error === true) {
      return t(`${translationKey}.${name}.error`);
    }
    return '';
  };
  
  // Formatar opções para incluir grupos se necessário
  const getFormattedOptions = () => {
    if (optionGroups) {
      return optionGroups;
    }
    
    return [{ options }];
  };
  
  // Filtrar opções baseado no termo de pesquisa
  const getFilteredOptions = () => {
    const formattedOptions = getFormattedOptions();
    
    if (!search || !searchTerm) {
      return formattedOptions;
    }
    
    return formattedOptions.map(group => {
      const filteredOptions = group.options.filter(option => {
        return option.label.toLowerCase().includes(searchTerm.toLowerCase());
      });
      
      return { ...group, options: filteredOptions };
    }).filter(group => group.options.length > 0);
  };
  
  // Encontrar o label para um valor
  const getOptionLabel = (val) => {
    const formattedOptions = getFormattedOptions();
    
    for (const group of formattedOptions) {
      for (const option of group.options) {
        if (option.value === val) {
          return option.label;
        }
      }
    }
    
    return '';
  };
  
  // Encontrar o label para valores múltiplos
  const getMultipleValues = () => {
    if (!multiple || !internalValue || internalValue.length === 0) {
      return getPlaceholder();
    }
    
    return internalValue.map(val => getOptionLabel(val)).join(', ');
  };
  
  // Verificar se uma opção está selecionada
  const isOptionSelected = (optionValue) => {
    if (multiple) {
      return internalValue.includes(optionValue);
    }
    return internalValue === optionValue;
  };
  
  // Manipular seleção de uma opção
  const handleOptionSelect = (optionValue) => {
    let newValue;
    
    if (multiple) {
      if (isOptionSelected(optionValue)) {
        newValue = internalValue.filter(val => val !== optionValue);
      } else {
        newValue = [...internalValue, optionValue];
      }
    } else {
      newValue = optionValue;
      setIsOpen(false);
    }
    
    setInternalValue(newValue);
    
    if (onChange) {
      // Simulando um evento de evento change
      const event = {
        target: {
          name,
          value: newValue
        }
      };
      onChange(event);
    }
  };
  
  // Manipular clique no botão de limpar
  const handleClear = (e) => {
    e.stopPropagation();
    
    const newValue = multiple ? [] : '';
    setInternalValue(newValue);
    
    if (onChange) {
      const event = {
        target: {
          name,
          value: newValue
        }
      };
      onChange(event);
    }
  };
  
  // Manipular clique para abrir/fechar o dropdown
  const toggleDropdown = () => {
    if (!disabled) {
      setIsOpen(!isOpen);
      setSearchTerm('');
      setHighlightedIndex(-1);
    }
  };
  
  // Manipular teclas de navegação
  const handleKeyDown = (e) => {
    if (disabled) return;
    
    // Abrir dropdown com seta para baixo
    if (e.key === 'ArrowDown' && !isOpen) {
      e.preventDefault();
      setIsOpen(true);
      setHighlightedIndex(0);
      return;
    }
    
    if (!isOpen) return;
    
    const filteredGroups = getFilteredOptions();
    const allOptions = filteredGroups.flatMap(group => group.options);
    const optionsCount = allOptions.length;
    
    switch (e.key) {
      case 'Escape':
        e.preventDefault();
        // O Escape que fecha o dropdown pertence ao dropdown. Sem travar a
        // propagação sobe até ao listener do Modal no document e leva o
        // formulário todo. preventDefault não chega — não trava a subida.
        // Só chegamos aqui com o dropdown aberto (guard acima), portanto o
        // Escape continua a fechar o modal quando não há dropdown.
        e.stopPropagation();
        setIsOpen(false);
        break;
        
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex(prev => (prev + 1) % optionsCount);
        break;
        
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(prev => (prev <= 0 ? optionsCount - 1 : prev - 1));
        break;
        
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0 && highlightedIndex < optionsCount) {
          handleOptionSelect(allOptions[highlightedIndex].value);
        }
        break;
        
      default:
        break;
    }
  };
  
  // Classes por tamanho
  const sizes = {
    sm: 'h-8 px-2 text-sm',
    md: 'h-10 px-3 text-base',
    lg: 'h-12 px-4 text-lg',
  };

  const showClear = clearable && !disabled && (multiple ? internalValue?.length > 0 : !!internalValue);

  // Os controlos da direita (limpar + seta) vivem fora do botão do trigger:
  // <button> dentro de <button> é DOM inválido. O trigger reserva espaço à
  // direita para eles não taparem o texto.
  const triggerRightPad = {
    sm: showClear ? 'pr-12' : 'pr-7',
    md: showClear ? 'pr-14' : 'pr-9',
    lg: showClear ? 'pr-16' : 'pr-10',
  };

  const controlsInset = { sm: 'pr-2', md: 'pr-3', lg: 'pr-4' };
  
  const errorMessage = getError();
  const displayHelperText = getHelperText();
  const displayLabel = getLabel();
  const filteredGroups = getFilteredOptions();
  
  return (
    // O handler vive no contentor, não no trigger: abrir o dropdown com
    // `search` move o foco para a caixa de pesquisa, que é irmã do trigger. Um
    // handler só no trigger nunca via essas teclas — o Escape subia ao Modal e
    // as setas não navegavam durante a pesquisa.
    <div
      className={`${fullWidth ? 'w-full' : ''} ${containerClassName}`}
      ref={selectContainerRef}
      onKeyDown={handleKeyDown}
    >
      {displayLabel && (
        <label 
          htmlFor={id || name} 
          className={`block mb-2 font-medium text-foreground ${labelClassName}`}
        >
          {displayLabel}
          {required && <span className="ml-1 text-error-500">*</span>}
        </label>
      )}
      
      <div className="relative">
        <button
          type="button"
          id={id || name}
          ref={(node) => {
            // Combine refs: forwardRef and buttonRef
            buttonRef.current = node;
            if (typeof ref === 'function') {
              ref(node);
            } else if (ref) {
              ref.current = node;
            }
          }}
          className={`
            flex items-center justify-between w-full
            ${sizes[size]}
            ${triggerRightPad[size]}
            rounded-md border
            ${error ? 'border-error-500 focus:ring-error-500 focus:border-error-500 dark:border-error-600' : 'border-input focus:ring-primary-500 focus:border-primary-500'}
            bg-card
            text-foreground text-left
            disabled:bg-muted disabled:opacity-70 disabled:cursor-not-allowed
            shadow-sm focus:outline-none focus:ring-2 
            transition-all duration-200 ease-in-out
            ${selectClassName}
            ${className}
          `}
          onClick={toggleDropdown}
          aria-haspopup="listbox"
          aria-expanded={isOpen}
          aria-labelledby={id || name}
          disabled={disabled}
          onBlur={onBlur}
          {...props}
        >
          <div className="flex items-center w-full overflow-hidden">
            {startIcon && (
              <span className="mr-2 text-muted-foreground flex-shrink-0">
                {startIcon}
              </span>
            )}
            
            <span className={`block truncate ${(!internalValue || (multiple && internalValue.length === 0)) && 'text-muted-foreground'}`}>
              {multiple 
                ? getMultipleValues()
                : (internalValue ? getOptionLabel(internalValue) : getPlaceholder())
              }
            </span>
          </div>
          
        </button>

        {/* pointer-events-none deixa o clique atravessar para o trigger; só o
            botão de limpar volta a captá-lo. */}
        <div className={`absolute inset-y-0 right-0 flex items-center gap-1 pointer-events-none ${controlsInset[size]}`}>
          {showClear && (
            <button
              type="button"
              className="pointer-events-auto p-1 rounded-full text-muted-foreground hover:text-foreground focus:outline-none focus:ring-2 focus:ring-primary-500"
              onClick={handleClear}
              aria-label="Clear selection"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="h-4 w-4">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}

          {endIcon || (
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className={`h-5 w-5 text-muted-foreground transition-transform duration-200 ${isOpen ? 'transform rotate-180' : ''}`}>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          )}
        </div>

        {isOpen && (
          <div 
            className={`absolute z-[9999] w-full bg-popover shadow-lg rounded-md max-h-60 overflow-auto border border-border animate-dropdown-slide overscroll-contain touch-pan-y ${
              dropdownDirection === 'up' ? 'bottom-full mb-1' : 'top-full mt-1'
            }`}
            onTouchMove={(e) => e.stopPropagation()}
          >
            {search && (
              <div className="p-2 border-b border-border sticky top-0 bg-popover z-10">
                <input
                  ref={searchInputRef}
                  type="text"
                  className="w-full p-2 text-sm border border-input rounded-md focus:ring-primary-500 focus:border-primary-500"
                  placeholder={t ? t('common:search') : 'Search...'}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
            )}
            
            <ul 
              className="py-1" 
              role="listbox"
              ref={optionsContainerRef}
            >
              {filteredGroups.map((group, groupIndex) => (
                <li 
                  key={group.label || `group-${groupIndex}`}
                  className={groupIndex > 0 ? 'border-t border-border mt-1' : ''}
                >
                  {group.label && (
                    <div className="px-3 py-1.5 text-[11px] font-bold uppercase tracking-widest text-primary-700 dark:text-primary-300 bg-primary-50 dark:bg-primary-900/20">
                      {group.label}
                    </div>
                  )}
                  
                  <ul>
                    {group.options.map((option, optionIndex) => {
                      // Calcular índice global para todos os grupos
                      const globalIndex = filteredGroups
                        .slice(0, groupIndex)
                        .reduce((count, g) => count + g.options.length, 0) + optionIndex;
                        
                      const isSelected = isOptionSelected(option.value);
                      const isHighlighted = highlightedIndex === globalIndex;
                      
                      return (
                        <li
                          key={option.value}
                          role="option"
                          aria-selected={isSelected}
                          className={`
                            px-3 py-2 cursor-pointer flex items-center
                            ${isSelected 
                              ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300' 
                              : 'text-text-700 dark:text-text-300'
                            }
                            ${isHighlighted 
                              ? 'bg-neutral-100 dark:bg-background-700' 
                              : ''
                            }
                            hover:bg-neutral-100 dark:hover:bg-background-700 transition-colors duration-150
                            ${optionClassName}
                          `}
                          onClick={() => handleOptionSelect(option.value)}
                        >
                          {multiple && (
                            <span className="mr-2 flex-shrink-0">
                              <span className={`
                                h-4 w-4 rounded border flex items-center justify-center
                                ${isSelected 
                                  ? 'bg-primary-500 border-primary-500 dark:bg-primary-600 dark:border-primary-600' 
                                  : 'border-neutral-300 dark:border-neutral-600'
                                }
                              `}>
                                {isSelected && (
                                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="h-3 w-3 text-white">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                  </svg>
                                )}
                              </span>
                            </span>
                          )}
                          
                          {option.label}
                          
                          {!multiple && isSelected && (
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="h-4 w-4 ml-auto text-primary-500 dark:text-primary-400">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </li>
              ))}
              
              {filteredGroups.every(group => group.options.length === 0) && (
                <li className="px-3 py-2 text-neutral-500 dark:text-neutral-400 text-sm">
                  {t ? t('common:noResults') : 'No results found'}
                </li>
              )}
            </ul>
          </div>
        )}
      </div>
      
      {(errorMessage || displayHelperText) && (
        <Text
          variant="body2"
          color={error ? 'error' : 'light'}
          className={`mt-1.5 ${helperTextClassName} ${error ? 'animate-fade-in' : ''}`}
        >
          {errorMessage || displayHelperText}
        </Text>
      )}
    </div>
  );
});

Select.displayName = 'Select';

Select.propTypes = {
  id: PropTypes.string,
  name: PropTypes.string.isRequired,
  label: PropTypes.string,
  placeholder: PropTypes.string,
  helperText: PropTypes.string,
  options: PropTypes.arrayOf(
    PropTypes.shape({
      value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
      label: PropTypes.string.isRequired,
    })
  ),
  optionGroups: PropTypes.arrayOf(
    PropTypes.shape({
      label: PropTypes.string,
      options: PropTypes.arrayOf(
        PropTypes.shape({
          value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
          label: PropTypes.string.isRequired,
        })
      ).isRequired,
    })
  ),
  value: PropTypes.oneOfType([
    PropTypes.string, 
    PropTypes.number, 
    PropTypes.arrayOf(PropTypes.oneOfType([PropTypes.string, PropTypes.number]))
  ]),
  defaultValue: PropTypes.oneOfType([
    PropTypes.string, 
    PropTypes.number, 
    PropTypes.arrayOf(PropTypes.oneOfType([PropTypes.string, PropTypes.number]))
  ]),
  error: PropTypes.oneOfType([PropTypes.bool, PropTypes.string]),
  size: PropTypes.oneOf(['sm', 'md', 'lg']),
  required: PropTypes.bool,
  disabled: PropTypes.bool,
  fullWidth: PropTypes.bool,
  search: PropTypes.bool,
  clearable: PropTypes.bool,
  multiple: PropTypes.bool,
  startIcon: PropTypes.node,
  endIcon: PropTypes.node,
  className: PropTypes.string,
  containerClassName: PropTypes.string,
  labelClassName: PropTypes.string,
  selectClassName: PropTypes.string,
  optionClassName: PropTypes.string,
  helperTextClassName: PropTypes.string,
  t: PropTypes.func,
  translationKey: PropTypes.string,
  onChange: PropTypes.func,
  onBlur: PropTypes.func
};

export default Select;
