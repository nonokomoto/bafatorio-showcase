import PropTypes from 'prop-types';
import {
    FiUser, FiMail, FiPhone, FiGlobe, FiTag,
    FiMapPin, FiFileText, FiCreditCard, FiHome
} from 'react-icons/fi';

import FormField from '../UI/FormField';
import { Text } from '../UI';
import {
    getEstimateUnitOptions,
    getCurrencyOptions,
    getCategoryOptions
} from './utils/formOptions';

const SupplierFormFields = ({
    register,
    control,
    errors,
    t,
    includeName = false,
    themeColor = 'secondary',
}) => {
    const estimateUnitOptions = getEstimateUnitOptions(t);
    const currencyOptions = getCurrencyOptions(t);
    const categoryOptions = getCategoryOptions(t);

    return (
        <div className="space-y-6">
            {includeName && (
                <FormField
                    icon={<FiUser className="text-primary-500" />}
                    name="name"
                    label={t('form.fields.name.label', 'Supplier Name')}
                    register={register}
                    errors={errors}
                    t={t}
                    required={t('form.fields.name.required', 'Supplier name is required')}
                    validation={{
                        minLength: {
                            value: 2,
                            message: t('form.fields.name.minLength', 'Name too short'),
                        },
                    }}
                    placeholder={t('form.fields.name.placeholder', 'Enter supplier name')}
                    themeColor={themeColor}
                />
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                    icon={<FiTag className="text-violet-500" />}
                    name="category"
                    label={t('form.fields.category.label', 'Category')}
                    isCreatable={true}
                    options={categoryOptions}
                    control={control}
                    errors={errors}
                    t={t}
                    placeholder={t('form.fields.category.placeholder', 'e.g., Catering, AV, Venue')}
                    themeColor={themeColor}
                />
                <FormField
                    icon={<FiGlobe className="text-sky-500" />}
                    name="country"
                    label={t('form.fields.country.label', 'Country')}
                    register={register}
                    errors={errors}
                    t={t}
                    placeholder={t('form.fields.country.placeholder', 'Enter country')}
                    themeColor={themeColor}
                />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                    icon={<FiUser className="text-violet-500" />}
                    name="contactName"
                    label={t('form.fields.contactName.label', 'Contact Name')}
                    register={register}
                    errors={errors}
                    t={t}
                    placeholder={t('form.fields.contactName.placeholder', 'Primary contact person')}
                    themeColor={themeColor}
                />
                <FormField
                    icon={<FiPhone className="text-green-500" />}
                    name="contactPhone"
                    label={t('form.fields.contactPhone.label', 'Contact Phone')}
                    register={register}
                    errors={errors}
                    t={t}
                    placeholder={t('form.fields.contactPhone.placeholder', 'Enter phone number')}
                    themeColor={themeColor}
                />
            </div>

            <FormField
                icon={<FiMail className="text-sky-500" />}
                name="contactEmail"
                type="email"
                label={t('form.fields.contactEmail.label', 'Contact Email')}
                register={register}
                errors={errors}
                t={t}
                placeholder={t('form.fields.contactEmail.placeholder', 'Enter email address')}
                validation={{
                    pattern: {
                        value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                        message: t('form.fields.email.pattern', 'Invalid email'),
                    },
                }}
                themeColor={themeColor}
            />

            <FormField
                icon={<FiGlobe className="text-sky-500" />}
                name="website"
                label={t('form.fields.website.label', 'Website')}
                register={register}
                errors={errors}
                t={t}
                placeholder={t('form.fields.website.placeholder', 'https://...')}
                themeColor={themeColor}
            />

            <FormField
                icon={<FiMapPin className="text-rose-500" />}
                name="address"
                label={t('form.fields.address.label', 'Address')}
                register={register}
                errors={errors}
                isTextarea={true}
                t={t}
                placeholder={t('form.fields.address.placeholder', 'Street, City, Postal Code...')}
                themeColor={themeColor}
            />

            <FormField
                name="vatNumber"
                label={t('form.fields.vatNumber.label', 'VAT Number')}
                register={register}
                errors={errors}
                t={t}
                placeholder={t('form.fields.vatNumber.placeholder', 'Optional VAT number')}
                themeColor={themeColor}
            />

            <div className="pt-6 border-t border-neutral-200/60 dark:border-neutral-800/60">
                <Text variant="h6" weight="medium" className="mb-6 text-text-700 dark:text-text-200">
                    {t('form.sections.budgetDetails', 'Budget Details')}
                </Text>
                <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <FormField
                            icon={<FiCreditCard className="text-emerald-500" />}
                            name="estimateMinAmount"
                            type="number"
                            label={t('form.fields.estimateMin.label', 'Min Amount')}
                            register={register}
                            errors={errors}
                            t={t}
                            placeholder={t('form.fields.estimateMin.placeholder', 'e.g., 500')}
                            validation={{ min: { value: 0, message: 'Cannot be negative' } }}
                            themeColor={themeColor}
                        />
                        <FormField
                            icon={<FiCreditCard className="text-emerald-500" />}
                            name="estimateMaxAmount"
                            type="number"
                            label={t('form.fields.estimateMax.label', 'Max Amount')}
                            register={register}
                            errors={errors}
                            t={t}
                            placeholder={t('form.fields.estimateMax.placeholder', 'e.g., 1500')}
                            validation={{ min: { value: 0, message: 'Cannot be negative' } }}
                            themeColor={themeColor}
                        />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <FormField
                            name="estimateUnit"
                            label={t('form.fields.estimateUnit.label', 'Unit')}
                            errors={errors}
                            t={t}
                            options={estimateUnitOptions}
                            isSelectField={true}
                            control={control}
                            placeholder={t('form.fields.estimateUnit.placeholder', 'Select Unit')}
                            themeColor={themeColor}
                        />
                        <FormField
                            name="currency"
                            label={t('form.fields.currency.label', 'Currency')}
                            errors={errors}
                            t={t}
                            options={currencyOptions}
                            isSelectField={true}
                            control={control}
                            placeholder={t('form.fields.currency.placeholder', 'Select Currency')}
                            themeColor={themeColor}
                        />
                    </div>
                </div>
            </div>

            <div className="pt-6 border-t border-neutral-200/60 dark:border-neutral-800/60">
                <Text variant="h6" weight="medium" className="mb-6 text-text-700 dark:text-text-200">
                    {t('form.sections.financial', 'Financial Information')}
                </Text>
                <div className="space-y-6">
                    <FormField
                        icon={<FiUser className="text-violet-500" />}
                        name="beneficiaryName"
                        label={t('form.fields.beneficiaryName.label', 'Beneficiary Name')}
                        register={register}
                        errors={errors}
                        t={t}
                        placeholder={t('form.fields.beneficiaryName.placeholder', 'Account holder name')}
                        themeColor={themeColor}
                    />
                    <FormField
                        icon={<FiCreditCard className="text-emerald-500" />}
                        name="iban"
                        label={t('form.fields.iban.label', 'IBAN')}
                        register={register}
                        errors={errors}
                        t={t}
                        placeholder={t('form.fields.iban.placeholder', 'International Bank Account Number')}
                        themeColor={themeColor}
                    />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <FormField
                            icon={<FiGlobe className="text-sky-500" />}
                            name="swiftBic"
                            label={t('form.fields.swiftBic.label', 'SWIFT/BIC')}
                            register={register}
                            errors={errors}
                            t={t}
                            placeholder={t('form.fields.swiftBic.placeholder', 'Bank Identifier Code')}
                            themeColor={themeColor}
                        />
                        <FormField
                            icon={<FiHome className="text-orange-500" />}
                            name="bankName"
                            label={t('form.fields.bankName.label', 'Bank Name')}
                            register={register}
                            errors={errors}
                            t={t}
                            placeholder={t('form.fields.bankName.placeholder', 'Name of the bank')}
                            themeColor={themeColor}
                        />
                    </div>
                </div>
            </div>

            <div className="pt-6 border-t border-neutral-200/60 dark:border-neutral-800/60">
                <Text variant="h6" weight="medium" className="mb-6 text-text-700 dark:text-text-200">
                    {t('form.sections.other', 'Other Details')}
                </Text>
                <div className="space-y-6">
                    <FormField
                        icon={<FiTag className="text-violet-500" />}
                        name="tags"
                        label={t('form.fields.tags.label', 'Tags')}
                        register={register}
                        errors={errors}
                        t={t}
                        placeholder={t('form.fields.tags.placeholder', 'Comma-separated, e.g., preferred, local')}
                        themeColor={themeColor}
                    />
                    <FormField
                        icon={<FiFileText className="text-amber-500" />}
                        name="notes"
                        label={t('form.fields.notes.label', 'Notes')}
                        register={register}
                        errors={errors}
                        isTextarea={true}
                        t={t}
                        placeholder={t('form.fields.notes.placeholder', 'Any additional notes about this supplier...')}
                        themeColor={themeColor}
                        rows={3}
                    />
                </div>
            </div>
        </div>
    );
};

SupplierFormFields.propTypes = {
    register: PropTypes.func.isRequired,
    control: PropTypes.object.isRequired,
    errors: PropTypes.object.isRequired,
    t: PropTypes.func.isRequired,
    includeName: PropTypes.bool,
    themeColor: PropTypes.string,
};

export default SupplierFormFields;
