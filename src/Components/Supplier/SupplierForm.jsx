import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { useParams, useNavigate } from 'react-router-dom';

// Import RTK Query Hooks
import {
    useCreateSupplierMutation,
    useUpdateSupplierMutation,
    useGetSupplierQuery
} from '../../Api/services/supplierApi';

// Import UI Components
import Spinner from '../UI/spinner'; // Import Spinner
import { Card, Button, Input, Text } from '../UI'; // Keep Card, Button, Input, Text for structure
import SupplierFormFields from './SupplierFormFields';

const SupplierForm = () => {
    const { id } = useParams(); // Get ID from URL
    const navigate = useNavigate(); // Initialize navigate
    const { t } = useTranslation('supplier');

    // --- Data Fetching (for edit mode) ---
    const { data: fetchedSupplierData, isLoading: isFetching, error: fetchError } = useGetSupplierQuery(id, {
        skip: !id, // Skip query if no ID (creating new)
    });

    // --- Form Setup ---
    const {
        register,
        handleSubmit,
        reset,
        control,
        formState: { errors }
    } = useForm({
        defaultValues: {
            name: '',
            country: '',
            category: '',
            contactName: '',
            contactEmail: '',
            contactPhone: '',
            website: '',
            vatNumber: '',
            address: '',
            estimateMinAmount: '',
            estimateMaxAmount: '',
            estimateUnit: '',
            currency: '',
            tags: '',
            notes: '',
            beneficiaryName: '',
            iban: '',
            swiftBic: '',
            bankName: '',
        }
    });

    // --- RTK Query Mutations ---
    const [createSupplier, { isLoading: isCreating }] = useCreateSupplierMutation();
    const [updateSupplier, { isLoading: isUpdating }] = useUpdateSupplierMutation();
    const formSubmissionLoading = isCreating || isUpdating;

    // --- State ---
    const [submitError, setSubmitError] = useState(null);

    // --- Effects ---
    useEffect(() => {
        if (id && fetchedSupplierData) {
            let paymentData = {};
            if (fetchedSupplierData.paymentDetails) {
                try {
                    paymentData = JSON.parse(fetchedSupplierData.paymentDetails);
                } catch (e) {
                    console.error("Failed to parse paymentDetails JSON:", e);
                    // Treat as simple string if parsing fails?
                    // Or reset individual fields? Resetting is safer.
                    paymentData = {}; 
                }
            }
            reset({
                name: fetchedSupplierData.name || '',
                country: fetchedSupplierData.country || '',
                category: fetchedSupplierData.category || '',
                contactName: fetchedSupplierData.contactName || '',
                contactEmail: fetchedSupplierData.contactEmail || '',
                contactPhone: fetchedSupplierData.contactPhone || '',
                website: fetchedSupplierData.website || '',
                vatNumber: fetchedSupplierData.vatNumber || '',
                address: fetchedSupplierData.address || '',
                estimateMinAmount: fetchedSupplierData.estimateMinAmount || '',
                estimateMaxAmount: fetchedSupplierData.estimateMaxAmount || '',
                estimateUnit: fetchedSupplierData.estimateUnit || '',
                currency: fetchedSupplierData.currency || '',
                tags: (fetchedSupplierData.tags || []).join(', '),
                notes: fetchedSupplierData.notes || '',
                beneficiaryName: paymentData.beneficiaryName || '',
                iban: paymentData.iban || '',
                swiftBic: paymentData.swiftBic || '',
                bankName: paymentData.bankName || '',
            });
        } else if (!id) {
             reset({
                 name: '', country: '', category: '', contactName: '', contactEmail: '',
                 contactPhone: '', website: '', vatNumber: '', address: '',
                 estimateMinAmount: '', estimateMaxAmount: '', estimateUnit: '',
                 currency: '', tags: '', notes: '',
                 beneficiaryName: '', iban: '', swiftBic: '', bankName: ''
             });
        }
    }, [id, fetchedSupplierData, reset]);

    // --- Event Handlers ---
    const onSubmit = async (data) => {
        setSubmitError(null);
        
        // Construct paymentDetails object (without bankAddress)
        const paymentDetailsObj = {};
        if (data.beneficiaryName?.trim()) paymentDetailsObj.beneficiaryName = data.beneficiaryName.trim();
        if (data.iban?.trim()) paymentDetailsObj.iban = data.iban.trim();
        if (data.swiftBic?.trim()) paymentDetailsObj.swiftBic = data.swiftBic.trim();
        if (data.bankName?.trim()) paymentDetailsObj.bankName = data.bankName.trim();

        const input = {
            name: data.name?.trim() || '',
            country: data.country?.trim() || null,
            category: data.category?.trim() || null,
            contactName: data.contactName?.trim() || null,
            contactEmail: data.contactEmail?.trim() || null,
            contactPhone: data.contactPhone?.trim() || null,
            website: data.website?.trim() || null,
            vatNumber: data.vatNumber?.trim() || null,
            address: data.address?.trim() || null,
            estimateMinAmount: data.estimateMinAmount ? parseFloat(data.estimateMinAmount) : null,
            estimateMaxAmount: data.estimateMaxAmount ? parseFloat(data.estimateMaxAmount) : null,
            estimateUnit: data.estimateUnit || null,
            currency: data.currency || null,
            tags: data.tags ? data.tags.split(',').map(tag => tag.trim()).filter(Boolean) : null,
            notes: data.notes?.trim() || null,
            paymentDetails: Object.keys(paymentDetailsObj).length > 0 
                ? JSON.stringify(paymentDetailsObj) 
                : null,
        };

        // Remove null/undefined values to avoid sending them if not intended
        Object.keys(input).forEach(key => {
            if (input[key] === null || input[key] === undefined || input[key] === '') {
                delete input[key];
            }
        });

        try {
            if (id) {
                // Update existing supplier
                await updateSupplier({ id, ...input }).unwrap();
            } else {
                // Create new supplier
                await createSupplier(input).unwrap();
            }
            navigate('/app/suppliers'); // Navigate back on success
        } catch (err) {
            console.error('Failed to save supplier:', err);
            setSubmitError(err.data?.message || err.message || t('form.errorSubmit', 'Failed to save supplier. Please try again.'));
        }
    };

    const handleCancel = () => {
        navigate('/app/suppliers'); // Navigate back on cancel
    };

    // --- Render Logic ---
    // Handle loading state while fetching for edit
    if (id && isFetching) {
        return <Spinner status="loading" loadingMessage={t('form.loading', 'Loading supplier data...')} />;
    }

    // Handle error state while fetching for edit
    if (id && fetchError) {
        return (
            <Card className="p-6">
                <Text color="error">{t('form.errorLoading', 'Failed to load supplier data.')}</Text>
            </Card>
        );
    }

    // If editing and data is fetched but not found
    if (id && !isFetching && !fetchedSupplierData) {
        return (
            <Card className="p-6">
                <Text color="warning">{t('form.notFound', 'Supplier not found.')}</Text>
            </Card>
        );
    }

    // Render form with structure similar to EventForm
    return (
        <div className="container mx-auto px-4 py-6 max-w-4xl"> {/* Container like EventForm */} 
            <Card
                className="overflow-hidden rounded-lg shadow-sm transition-all duration-300 bg-card border-t-4 border-t-secondary-500/80 dark:border-t-secondary-400/80"
                padded="none"
                elevated="sm"
            >
                {/* Header - Input for Supplier Name */} 
                <div className="px-6 py-5 border-b border-neutral-200/60 dark:border-neutral-800/60">
                    <Input
                        fullWidth
                        variant="unstyled"
                        size="lg"
                        className="text-3xl font-display font-medium placeholder:text-text-400/80 dark:placeholder:text-text-500/70 focus:placeholder:opacity-50 transition-all"
                        placeholder={t('form.fields.name.placeholder', 'Enter supplier name')}
                        {...register("name", { 
                            required: t('form.fields.name.required', 'Supplier name is required'),
                            minLength: { value: 2, message: t('form.fields.name.minLength', 'Name too short') }
                        })}
                         error={errors.name?.message} // Display error here if needed, or rely on FormField style
                    />
                     {errors.name && (
                        <div className="mt-2 flex items-center gap-2 text-error-500 dark:text-error-400 animate__animated animate__fadeIn">
                             <Text variant="caption" color="error" className="font-medium">
                                {errors.name.message}
                             </Text>
                         </div>
                    )} 
                </div>

                {/* Form body */}
                <div className="p-8">
                    <form onSubmit={handleSubmit(onSubmit)}>
                        <SupplierFormFields
                            register={register}
                            control={control}
                            errors={errors}
                            t={t}
                        />

                        {/* Submit Error Display */}
                        {submitError && (
                            <div className="mt-6 p-3 bg-error/10 border border-error/30 rounded-md text-error text-sm">
                                {submitError}
                            </div>
                        )}

                        {/* Action Buttons */} 
                        <div className="mt-12 flex justify-end gap-4">
                             <Button
                                variant="outline"
                                onClick={handleCancel}
                                className="text-muted-foreground border-border hover:bg-accent transition-all duration-200 px-6"
                            >
                                {t('form.buttons.cancel', 'Cancel')}
                            </Button>
                            <Button
                                type="submit"
                                variant="primary"
                                color="secondary"
                                disabled={formSubmissionLoading}
                                loading={formSubmissionLoading}
                                elevated="sm"
                                className="shadow-sm hover:shadow-md transition-all duration-200 px-6 font-medium"
                            >
                                {formSubmissionLoading ? (
                                    id ? t('form.buttons.updating', 'Updating...') : t('form.buttons.creating', 'Creating...')
                                ) : (
                                    id ? t('form.buttons.update', 'Update Supplier') : t('form.buttons.create', 'Create Supplier')
                                )}
                            </Button>
                        </div>
                    </form>
                </div>
            </Card>
        </div>
    );
};

SupplierForm.propTypes = {};

export default SupplierForm; 