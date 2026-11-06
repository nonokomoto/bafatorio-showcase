import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import { FiChevronDown, FiX, FiCheck, FiPlus } from 'react-icons/fi';
import RoleBadge from '../RoleBadge';

const CreatableRoleSelect = ({
  value = '',
  onChange,
  roles = [],
  onCreateRole = null,
  participantCounts = {},
}) => {
  const { t } = useTranslation('participant');
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });
  const [isCreating, setIsCreating] = useState(false);

  // Resolve role ID to role object for display (fallback to name match for legacy data)
  const selectedRole = useMemo(() => roles.find(r => r.id === value) || roles.find(r => r.name === value), [roles, value]);

  const triggerRef = useRef(null);
  const dropdownRef = useRef(null);
  const searchInputRef = useRef(null);
  const optionRefs = useRef([]);

  // Filter roles based on search
  const filteredRoles = useMemo(() => {
    if (!searchTerm.trim()) return roles;
    const term = searchTerm.toLowerCase().trim();
    return roles.filter((role) => role.name.toLowerCase().includes(term));
  }, [roles, searchTerm]);

  // Check if we should show the "create new" option
  const showCreateOption = useMemo(() => {
    if (!searchTerm.trim()) return false;
    const term = searchTerm.toLowerCase().trim();
    return !roles.some((role) => role.name.toLowerCase() === term);
  }, [roles, searchTerm]);

  // Total items for keyboard navigation
  const totalItems = filteredRoles.length + (showCreateOption ? 1 : 0);

  // Update dropdown position from trigger rect
  const updatePosition = useCallback(() => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + 4,
        left: rect.left,
        width: rect.width,
      });
    }
  }, []);

  // Open dropdown
  const openDropdown = useCallback(() => {
    setIsOpen(true);
    setSearchTerm('');
    setHighlightedIndex(-1);
    updatePosition();
  }, [updatePosition]);

  // Close dropdown
  const closeDropdown = useCallback(() => {
    setIsOpen(false);
    setSearchTerm('');
    setHighlightedIndex(-1);
  }, []);

  // Select a role by ID
  const selectRole = useCallback(
    (roleId) => {
      onChange(roleId);
      closeDropdown();
    },
    [onChange, closeDropdown]
  );

  // Create a new role and select it by ID
  const handleCreate = useCallback(async () => {
    if (isCreating) return;
    const name = searchTerm.trim();
    if (name && onCreateRole) {
      try {
        setIsCreating(true);
        const newRole = await onCreateRole(name);
        if (newRole?.id) {
          onChange(newRole.id);
        }
      } catch (err) {
        console.error('Failed to create role:', err);
      } finally {
        setIsCreating(false);
      }
    }
    closeDropdown();
  }, [searchTerm, onCreateRole, onChange, closeDropdown, isCreating]);

  // Clear value
  const handleClear = useCallback(
    (e) => {
      e.stopPropagation();
      onChange('');
    },
    [onChange]
  );

  // Focus search input when opened
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      requestAnimationFrame(() => {
        searchInputRef.current?.focus();
      });
    }
  }, [isOpen]);

  // Update position on scroll/resize while open
  useEffect(() => {
    if (!isOpen) return;

    const handleUpdate = () => updatePosition();
    window.addEventListener('scroll', handleUpdate, true);
    window.addEventListener('resize', handleUpdate);

    return () => {
      window.removeEventListener('scroll', handleUpdate, true);
      window.removeEventListener('resize', handleUpdate);
    };
  }, [isOpen, updatePosition]);

  // Close on click outside
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e) => {
      if (
        triggerRef.current &&
        !triggerRef.current.contains(e.target) &&
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target)
      ) {
        closeDropdown();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, closeDropdown]);

  // Scroll highlighted item into view
  useEffect(() => {
    if (highlightedIndex >= 0 && optionRefs.current[highlightedIndex]) {
      optionRefs.current[highlightedIndex].scrollIntoView({
        block: 'nearest',
        behavior: 'smooth',
      });
    }
  }, [highlightedIndex]);

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e) => {
      if (!isOpen) {
        if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
          e.preventDefault();
          openDropdown();
        }
        return;
      }

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setHighlightedIndex((prev) => (prev < totalItems - 1 ? prev + 1 : 0));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : totalItems - 1));
          break;
        case 'Enter':
          e.preventDefault();
          if (highlightedIndex >= 0) {
            if (highlightedIndex < filteredRoles.length) {
              selectRole(filteredRoles[highlightedIndex].id);
            } else if (showCreateOption) {
              handleCreate();
            }
          }
          break;
        case 'Escape':
          e.preventDefault();
          closeDropdown();
          break;
        default:
          break;
      }
    },
    [isOpen, openDropdown, closeDropdown, totalItems, highlightedIndex, filteredRoles, selectRole, showCreateOption, handleCreate]
  );

  const selectedRoleName = selectedRole?.name || '';

  return (
    <div className="relative">
      {/* Trigger */}
      <div
        ref={triggerRef}
        tabIndex={0}
        role="combobox"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-controls="creatable-role-select-listbox"
        onClick={() => (isOpen ? closeDropdown() : openDropdown())}
        onKeyDown={handleKeyDown}
        className={`min-h-[42px] px-3 py-2 rounded-[10px] border bg-card flex items-center cursor-pointer transition-colors outline-none ${
          isOpen
            ? 'border-primary-500 ring-1 ring-primary-500'
            : 'border-input'
        }`}
      >
        {isOpen ? (
          /* Search input when open */
          <input
            ref={searchInputRef}
            type="text"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setHighlightedIndex(-1);
            }}
            onKeyDown={handleKeyDown}
            onClick={(e) => e.stopPropagation()}
            placeholder={t('participantsV2.formModal.roleSelect.searchPlaceholder', 'Pesquisar roles...')}
            className="flex-1 border-none outline-none text-sm text-text-900 dark:text-text-100 bg-transparent p-0 placeholder:text-text-400 dark:placeholder:text-text-500"
          />
        ) : (
          /* Display value or placeholder */
          <div className="flex items-center flex-1 gap-2">
            {selectedRoleName ? (
              <RoleBadge roleName={selectedRoleName} colorKey={selectedRole?.color} />
            ) : (
              <span className="text-sm text-text-400 dark:text-text-500">
                {t('participantsV2.formModal.roleSelect.placeholder', 'Selecionar role...')}
              </span>
            )}
          </div>
        )}

        {/* Right icons */}
        <div className="flex items-center gap-1 ml-2 shrink-0">
          {selectedRoleName && !isOpen && (
            <button
              type="button"
              onClick={handleClear}
              className="flex items-center justify-center w-5 h-5 rounded-full border-none bg-transparent cursor-pointer p-0 text-text-400 dark:text-text-500 hover:text-text-700 dark:hover:text-text-300 transition-colors"
            >
              <FiX size={14} />
            </button>
          )}
          <FiChevronDown
            size={16}
            className={`text-text-400 dark:text-text-500 transition-transform duration-200 ${isOpen ? 'rotate-180' : 'rotate-0'}`}
          />
        </div>
      </div>

      {/* Dropdown (fixed position via portal-like approach) */}
      {isOpen && (
        <div
          ref={dropdownRef}
          id="creatable-role-select-listbox"
          role="listbox"
          className="bg-popover rounded-[10px] border border-border shadow-lg max-h-[300px] overflow-y-auto py-1"
          style={{
            position: 'fixed',
            top: dropdownPosition.top,
            left: dropdownPosition.left,
            width: dropdownPosition.width,
            zIndex: 9999,
          }}
        >
          {/* Header */}
          {filteredRoles.length > 0 && (
            <div className="px-3 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-text-400 dark:text-text-500">
              {t('participantsV2.formModal.roleSelect.existingRoles', 'Roles existentes')}
            </div>
          )}

          {/* Role options */}
          {filteredRoles.map((role, index) => {
            const isSelected = value === role.id;
            const isHighlighted = highlightedIndex === index;
            const count = participantCounts?.[role.name] || 0;

            return (
              <div
                key={role.id}
                ref={(el) => {
                  optionRefs.current[index] = el;
                }}
                role="option"
                aria-selected={isSelected}
                onClick={() => selectRole(role.id)}
                onMouseEnter={() => setHighlightedIndex(index)}
                className={`flex items-center gap-2.5 px-3 py-2 cursor-pointer transition-colors ${
                  isSelected
                    ? 'bg-primary-50 dark:bg-primary-900/20 font-semibold'
                    : isHighlighted
                      ? 'bg-primary-100 dark:bg-primary-900/30'
                      : 'bg-transparent'
                }`}
              >
                {/* Name in the role's highlight color */}
                <span className="flex-1 min-w-0">
                  <RoleBadge roleName={role.name} colorKey={role.color} />
                </span>

                {/* Count */}
                {count > 0 && (
                  <span className="text-xs text-text-400 dark:text-text-500">{count}</span>
                )}

                {/* Check icon for selected */}
                {isSelected && (
                  <FiCheck size={16} className="text-primary-500 shrink-0" />
                )}
              </div>
            );
          })}

          {/* No results + create option */}
          {filteredRoles.length === 0 && !showCreateOption && (
            <div className="p-3 text-[13px] text-text-400 dark:text-text-500 text-center">
              {t('participantsV2.formModal.roleSelect.noResults', 'Nenhum role encontrado')}
            </div>
          )}

          {/* Create new role option */}
          {showCreateOption && (
            <>
              {filteredRoles.length > 0 && (
                <div className="h-px bg-border my-1" />
              )}
              <div
                ref={(el) => {
                  optionRefs.current[filteredRoles.length] = el;
                }}
                role="option"
                aria-selected={false}
                onClick={handleCreate}
                onMouseEnter={() => setHighlightedIndex(filteredRoles.length)}
                className={`flex items-center gap-2.5 px-3 py-2 cursor-pointer transition-colors ${
                  highlightedIndex === filteredRoles.length
                    ? 'bg-success-50 dark:bg-success-900/20'
                    : 'bg-transparent'
                }`}
              >
                {/* Plus icon in green square */}
                <span className="w-5 h-5 rounded-md bg-success-100 dark:bg-success-900/30 flex items-center justify-center shrink-0">
                  <FiPlus size={12} className="text-success-600 dark:text-success-400" />
                </span>

                {/* Create text */}
                <span className="text-[13px] text-success-600 dark:text-success-400 font-medium">
                  {t('participantsV2.formModal.roleSelect.create', 'Criar')}{' '}
                  &quot;<span className="font-bold">{searchTerm.trim()}</span>&quot;
                </span>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

CreatableRoleSelect.propTypes = {
  value: PropTypes.string,
  onChange: PropTypes.func.isRequired,
  roles: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      name: PropTypes.string.isRequired,
      color: PropTypes.string,
    })
  ),
  onCreateRole: PropTypes.func,
  participantCounts: PropTypes.objectOf(PropTypes.number),
};

export default CreatableRoleSelect;
