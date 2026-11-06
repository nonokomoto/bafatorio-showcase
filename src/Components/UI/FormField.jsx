import PropTypes from 'prop-types';
import { Controller } from 'react-hook-form';
import { FiAlertCircle } from 'react-icons/fi';
import Input from './Input'; // Import Input directly
import Select from './Select'; // Import Select directly
import CreatableSelect from 'react-select/creatable'; // Import CreatableSelect
import Text from './Text';   // Import Text directly
import FieldLabel from './FieldLabel';

const FormField = ({ 
    icon, 
    name, 
    type = "text", 
    label, 
    register, 
    required, 
    errors, 
    min, 
    isTextarea = false, 
    validation = {}, 
    t, 
    options,
    isSelectField,
    isCreatable = false, // Add isCreatable prop
    control,
    placeholder: customPlaceholder, 
    themeColor = 'primary' // Add themeColor prop, default to primary
}) => {
    // Determine placeholder, prioritize custom, then translation, then default
    const getPlaceholder = () => {
        if (customPlaceholder) return customPlaceholder;
        if (t) {
            const transKey = `form.fields.${name}.placeholder`;
            const translated = t(transKey);
            // Check if translation key exists or returns the key itself
            if (translated !== transKey) return translated; 
        }
        return isTextarea ? `Digite ${label?.toLowerCase()}...` : `Digite ${label?.toLowerCase()}`;
    };
    
    const placeholderText = getPlaceholder();

    // Define color classes based on themeColor
    const labelHoverColorClass = themeColor === 'secondary' ? 'group-hover:text-secondary-600 dark:group-hover:text-secondary-400' : 'group-hover:text-primary-600 dark:group-hover:text-primary-400';
    const iconColorClass = themeColor === 'secondary' ? 'text-secondary-500/70 dark:text-secondary-400/70' : 'text-primary-500/70 dark:text-primary-400/70';
    const requiredColorClass = themeColor === 'secondary' ? 'text-secondary-500/70 dark:text-secondary-400/70' : 'text-primary-500/70 dark:text-primary-400/70';
    const focusRingClass = themeColor === 'secondary' ? 'focus-within:ring-secondary-500 focus:ring-secondary-500' : 'focus-within:ring-primary-500 focus:ring-primary-500';

    // Use the project's design tokens (defined in src/index.css as space-separated RGB
     // values) so the select reacts to dark mode just like Tailwind utility classes do.
    const customReactSelectStyles = {
        control: (provided, state) => ({
            ...provided,
            minHeight: '48px',
            backgroundColor: 'rgb(var(--card))',
            borderColor: state.isFocused ? 'rgb(var(--ring))' : 'rgb(var(--border))',
            boxShadow: state.isFocused ? '0 0 0 1px rgb(var(--ring))' : 'none',
            '&:hover': {
                borderColor: state.isFocused ? 'rgb(var(--ring))' : 'rgb(var(--muted-foreground))',
            },
            borderRadius: '0.375rem',
            transition: 'border-color 0.2s ease-in-out, box-shadow 0.2s ease-in-out',
            fontSize: '0.875rem',
        }),
        valueContainer: (provided) => ({
            ...provided,
            padding: '0 1rem',
        }),
        placeholder: (provided) => ({
            ...provided,
            color: 'rgb(var(--placeholder))',
            fontSize: '0.875rem',
        }),
        input: (provided) => ({
            ...provided,
            color: 'rgb(var(--foreground))',
            fontSize: '0.875rem',
        }),
        singleValue: (provided) => ({
            ...provided,
            color: 'rgb(var(--foreground))',
        }),
        option: (provided, state) => ({
            ...provided,
            backgroundColor: state.isFocused ? 'rgb(var(--accent))' : 'rgb(var(--popover))',
            color: 'rgb(var(--foreground))',
            fontSize: '0.875rem',
            padding: '0.5rem 1rem',
            cursor: 'pointer',
        }),
        menu: (provided) => ({
            ...provided,
            backgroundColor: 'rgb(var(--popover))',
            border: '1px solid rgb(var(--border))',
            borderRadius: '0.375rem',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
            marginTop: '4px',
        }),
        indicatorSeparator: (provided) => ({
            ...provided,
            backgroundColor: 'rgb(var(--border))',
        }),
        dropdownIndicator: (provided) => ({
            ...provided,
            color: 'rgb(var(--muted-foreground))',
            '&:hover': { color: 'rgb(var(--foreground))' },
        }),
        clearIndicator: (provided) => ({
            ...provided,
            color: 'rgb(var(--muted-foreground))',
            '&:hover': { color: 'rgb(var(--foreground))' },
        }),
    };

    return (
        <div className="mb-8 group">
            <FieldLabel
                icon={icon}
                label={label}
                required={!!required}
                className={labelHoverColorClass}
                iconClassName={iconColorClass}
                requiredClassName={requiredColorClass}
            />

            {isCreatable ? ( // Use CreatableSelect if isCreatable is true
                <Controller
                    name={name}
                    control={control}
                    rules={{ required }}
                    render={({ field }) => (
                        <CreatableSelect
                            {...field}
                            isClearable
                            options={options} // react-select expects { value, label } format
                            placeholder={placeholderText}
                            inputId={name}
                            styles={customReactSelectStyles} // Apply basic styling
                            classNamePrefix="react-select" // Optional: for easier global styling
                            formatCreateLabel={(inputValue) => t ? t('reactSelect.createLabel', 'Criar "{{inputValue}}"', { inputValue }) : `Criar "${inputValue}"`}
                            loadingMessage={() => t ? t('reactSelect.loading', 'Carregando...') : 'Carregando...'}
                            noOptionsMessage={() => t ? t('reactSelect.noOptions', 'Nenhuma opção') : 'Nenhuma opção'}
                            theme={(theme) => ({ // Basic theme adjustments
                                ...theme,
                                borderRadius: 6,
                                colors: {
                                  ...theme.colors,
                                   primary: themeColor === 'secondary' ? 'var(--color-secondary-500, #EC4899)' : 'var(--color-primary-500, #6366F1)',
                                   primary75: themeColor === 'secondary' ? 'var(--color-secondary-400, #F472B6)' : 'var(--color-primary-400, #818CF8)',
                                   primary50: themeColor === 'secondary' ? 'var(--color-secondary-100, #FCE7F3)' : 'var(--color-primary-100, #E0E7FF)',
                                   primary25: themeColor === 'secondary' ? 'var(--color-secondary-50, #FDF2F8)' : 'var(--color-primary-50, #EEF2FF)',
                                    // Adjust neutral colors if needed for dark mode
                                },
                            })}
                            // Handle change: react-select gives the whole option object or null
                            onChange={(selectedOption) => {
                                // Pass only the value to react-hook-form
                                field.onChange(selectedOption ? selectedOption.value : '');
                            }}
                            // Value needs to be transformed back to { value, label } object or null.
                            // If the stored value is one of the predefined options, use its full
                            // shape so the label renders. Otherwise the value came from the user
                            // creating a brand-new option — synthesize { value, label } on the fly
                            // so the chip keeps showing in the input. Without this, any created
                            // category disappears visually right after being picked.
                            value={
                                field.value
                                    ? (options.find(option => option.value === field.value)
                                        || { value: field.value, label: field.value })
                                    : null
                            }
                        />
                    )}
                />
            ) : isSelectField ? (
                <Controller
                    name={name}
                    control={control}
                    rules={{ required }}
                    render={({ field }) => (
                        <Select
                            id={name}
                            name={name}
                            fullWidth
                            value={field.value || ''}
                            onChange={field.onChange}
                            onBlur={field.onBlur}
                            options={options ? options.map(option => ({
                                value: option.value,
                                label: option.label
                            })) : []}
                            placeholder={placeholderText}
                            error={errors[name] ? true : false}
                            className={`border-0 ring-1 ring-border ${focusRingClass} hover:ring-neutral-300 dark:hover:ring-neutral-600 transition-all duration-200 shadow-sm rounded-lg bg-card`}
                            selectClassName="text-sm text-neutral-700 dark:text-neutral-300 placeholder:text-neutral-400 dark:placeholder:text-neutral-500 placeholder:text-sm font-normal h-12"
                            containerClassName="transition-all duration-200"
                        />
                    )}
                />
            ) : isTextarea ? (
                <Input
                    as="textarea"
                    rows={4}
                    fullWidth
                    id={name}
                    placeholder={placeholderText}
                    {...(register ? register(name, { required, ...validation }) : {})}
                    aria-invalid={errors[name] ? "true" : "false"}
                    className={`border-0 ring-1 ring-border focus:ring-2 ${focusRingClass} hover:ring-neutral-300 dark:hover:ring-neutral-600 transition-all duration-200 shadow-sm rounded-lg bg-card`}
                    inputClassName="text-sm text-neutral-700 dark:text-neutral-300 placeholder:text-neutral-400 dark:placeholder:text-neutral-500 placeholder:text-sm font-normal resize-vertical py-3"
                />
            ) : (
                <Input
                    type={type}
                    min={min}
                    fullWidth
                    id={name}
                    placeholder={placeholderText}
                    {...(register ? register(name, { required, ...validation }) : {})}
                    aria-invalid={errors[name] ? "true" : "false"}
                    className={`border-0 ring-1 ring-border focus:ring-2 ${focusRingClass} hover:ring-neutral-300 dark:hover:ring-neutral-600 transition-all duration-200 shadow-sm rounded-lg bg-card`}
                    inputClassName="text-sm text-neutral-700 dark:text-neutral-300 placeholder:text-neutral-400 dark:placeholder:text-neutral-500 placeholder:text-sm font-normal h-12 py-3 px-4"
                />
            )}

            {errors[name] && (
                <div className="mt-2 flex items-center gap-2 text-error-500 dark:text-error-400 animate__animated animate__fadeIn">
                    <FiAlertCircle className="w-4 h-4" />
                    <Text variant="caption" color="error" className="font-medium">
                        {errors[name].message || 
                         (t ? (t(`form.fields.${name}.required`) || 'Campo obrigatório') : 'Campo obrigatório')}
                    </Text>
                </div>
            )}
        </div>
    );
};

FormField.propTypes = {
    icon: PropTypes.node, // Icon is now optional
    name: PropTypes.string.isRequired, // Name is required for react-hook-form
    type: PropTypes.string,
    label: PropTypes.string, // Label is optional
    register: PropTypes.func, // Register is optional if using Controller
    required: PropTypes.oneOfType([PropTypes.bool, PropTypes.string]),
    errors: PropTypes.object.isRequired,
    min: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    isTextarea: PropTypes.bool,
    validation: PropTypes.object,
    t: PropTypes.func, // t is optional
    options: PropTypes.arrayOf(PropTypes.shape({
        value: PropTypes.any.isRequired,
        label: PropTypes.string.isRequired
    })),
    isSelectField: PropTypes.bool,
    isCreatable: PropTypes.bool,
    control: PropTypes.object, // Control is optional (needed for Select)
    placeholder: PropTypes.string, // Allow custom placeholder override
    themeColor: PropTypes.oneOf(['primary', 'secondary']), // Add prop type for themeColor
};

export default FormField;
