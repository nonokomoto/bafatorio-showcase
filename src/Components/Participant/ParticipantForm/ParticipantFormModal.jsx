import { useState, useEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useForm } from 'react-hook-form';
import { useSelector, useDispatch } from 'react-redux';
import { useTranslation } from 'react-i18next';
import PropTypes from 'prop-types';
import { FiX } from 'react-icons/fi';
import { uploadData } from 'aws-amplify/storage';

import {
  useCreateParticipantMutation,
  useUpdateParticipantMutation,
  participantApi,
} from '../../../Api/services/participantApi';
import {
  useCreateDependentMutation,
  useUpdateDependentMutation,
  useDeleteDependentMutation,
} from '../../../Api/services/dependentsApi';
import {
  useListEventRolesQuery,
  useCreateEventRoleMutation,
} from '../../../Api/services/roleApi';
import { selectSelectedEventId } from '../../../Api/eventSelectors';
import { billingGateReasonFromError, billingGateMessageKey } from '../../../Hook/useAuthz';
import { showToast } from '../../../Redux/UI/toastSlice';

import ParticipantAvatar from '../ParticipantAvatar';
import FormTabs from './FormTabs';
import { TAB_KEYS } from './formTabsConfig';
import UnsavedChangesDialog from './UnsavedChangesDialog';

// Tab content components
import BasicInfoTab from './tabs/BasicInfoTab';
import IdentificationTab from './tabs/IdentificationTab';
import TravelTab from './tabs/TravelTab';
import AccommodationTab from './tabs/AccommodationTab';
import DependentsTab from './tabs/DependentsTab';

// --- Default values builder ---
const getDefaults = (participant, dependentsList, { mode } = {}) => ({
  participantName: participant?.participantName || '',
  participantEmail: participant?.participantEmail || '',
  participantPhone: participant?.participantPhone || '',
  roleId: participant?.roleId || '',
  participantStatus: participant?.participantStatus || 'REGISTERED',
  participantJob: participant?.participantJob || '',
  participantNote: participant?.participantNote || '',
  organization: participant?.organization || '',
  photoUrl: participant?.photoUrl || '',
  // Identification
  documentationType: participant?.documentationType || '',
  documentLast4: participant?.documentLast4 || '',
  nationality: participant?.nationality || '',
  residenceCountry: participant?.residenceCountry || '',
  emergencyContact: participant?.emergencyContact || '',
  internalId: mode === 'edit' ? (participant?.id || '') : '',
  // Visa
  visaRequired: participant?.visaRequired || false,
  visaSupport: participant?.visaSupport || false,
  // Arrival
  arrivalDate: participant?.arrivalDate || '',
  arrivalTime: participant?.arrivalTime || '',
  arrivalFlight: participant?.arrivalFlight || '',
  arrivalLayovers: participant?.arrivalLayovers || '',
  arrivalAirport: participant?.arrivalAirport || '',
  // Transfer
  transferRequired: participant?.transferRequired || false,
  transferDetails: participant?.transferDetails || '',
  transferCost: participant?.transferCost ?? '',
  transferCurrency: participant?.transferCurrency || 'EUR',
  // Accommodation
  hotelName: participant?.hotel || '',
  roomType: participant?.roomType || '',
  checkInDate: participant?.checkInDate || '',
  checkOutDate: participant?.checkOutDate || '',
  nights: participant?.nights ?? '',
  ratePerNight: participant?.ratePerNight ?? '',
  accommodationCurrency: participant?.rateCurrency || 'EUR',
  accommodationCost: participant?.accommodationCost ?? '',
  // Departure
  departureDate: participant?.departureDate || '',
  departureTime: participant?.departureTime || '',
  departureFlight: participant?.departureFlight || '',
  departureAirport: participant?.departureAirport || '',
  // Financial
  ticketFare: participant?.ticketFare ?? '',
  ticketCurrency: participant?.ticketCurrency || 'EUR',
  taxesExtras: participant?.taxesExtras ?? '',
  taxesCurrency: participant?.taxesCurrency || 'EUR',
  totalTravelCost: participant?.totalTravelCost ?? '',
  travelCurrency: participant?.totalTravelCurrency || 'EUR',
  paymentStatus: participant?.paymentStatus || '',
  bookingReference: participant?.bookingReference || '',
  bookingAgency: participant?.bookingAgency || '',
  // Other
  dietaryRestriction: participant?.dietaryRestriction || '',
  protocol: participant?.protocol || '',
  // Dependents
  dependents: dependentsList?.map(dep => ({
    id: dep.id,
    name: dep.name,
    age: dep.age,
    participantId: dep.participantId,
  })) || [],
});

// Map field names to their tab for auto-navigation on validation errors
const FIELD_TAB_MAP = {
  participantName: 'basic', participantEmail: 'basic', participantPhone: 'basic',
  participantJob: 'basic', organization: 'basic', roleId: 'basic',
  participantStatus: 'basic', participantNote: 'basic',
  documentationType: 'identification', documentLast4: 'identification',
  nationality: 'identification', residenceCountry: 'identification',
  emergencyContact: 'identification', internalId: 'identification',
};

const ParticipantFormModal = ({
  isOpen,
  onClose,
  participant = null,
  mode = 'create',
  existingDependents = [],
  participantCount = 0,
  participantCounts = {},
}) => {
  const { t } = useTranslation('participant');
  const dispatch = useDispatch();
  const selectedEventId = useSelector(selectSelectedEventId);

  // Form state
  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isDirty },
    reset,
    watch,
  } = useForm({
    mode: 'onTouched',
    defaultValues: getDefaults(participant, existingDependents, { mode, participantCount }),
  });

  const [activeTab, setActiveTab] = useState('basic');
  const [showUnsavedWarning, setShowUnsavedWarning] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [photoFile, setPhotoFile] = useState(null);
  const [, setShowRoleManager] = useState(false);

  // Mutations
  const [createParticipant] = useCreateParticipantMutation();
  const [updateParticipant] = useUpdateParticipantMutation();
  const [createDependent] = useCreateDependentMutation();
  const [updateDependent] = useUpdateDependentMutation();
  const [deleteDependent] = useDeleteDependentMutation();
  const [createRole] = useCreateEventRoleMutation();

  // Roles data
  const { data: rolesData } = useListEventRolesQuery(
    { eventId: selectedEventId },
    { skip: !selectedEventId }
  );
  const roles = useMemo(() => {
    if (!rolesData?.length) return [];
    return rolesData.map(r => ({ id: r.id, name: r.name, color: r.color }));
  }, [rolesData]);

  // Block body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = '';
      };
    }
  }, [isOpen]);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      reset(getDefaults(participant, existingDependents, { mode, participantCount }));
      setActiveTab('basic');
      setPhotoFile(null);
      setIsSubmitting(false);
      setShowRoleManager(false);
    }
  }, [isOpen, participant, existingDependents, reset, mode, participantCount]);

  // ESC key handler
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (isDirty || photoFile) {
          setShowUnsavedWarning(true);
        } else {
          onClose();
        }
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isDirty, photoFile, onClose]);

  const handleClose = useCallback(() => {
    if (isDirty || photoFile) {
      setShowUnsavedWarning(true);
    } else {
      onClose();
    }
  }, [isDirty, photoFile, onClose]);

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) handleClose();
  };

  const handleCreateRole = async (name) => {
    try {
      const result = await createRole({ name, eventId: selectedEventId }).unwrap();
      return result;
    } catch (err) {
      console.error('Failed to create role:', err);
      // Sem isto a recusa era invisível: o dropdown fechava e o papel não
      // aparecia, sem explicação. Gate de billing tem copy própria (com o
      // porquê); resto cai no genérico.
      const gateReason = billingGateReasonFromError(err);
      dispatch(showToast({
        message: gateReason ? `common:${billingGateMessageKey(gateReason)}` : 'toast.roleCreateError',
        variant: 'error',
      }));
      return null;
    }
  };

  // Photo upload helper — returns the S3 path (not a signed URL)
  const uploadPhoto = async (participantId, file) => {
    const ext = file.name.split('.').pop();
    const s3Path = `event-documents/${selectedEventId}/participant-photos/${participantId}.${ext}`;
    await uploadData({ path: s3Path, data: file });
    return s3Path;
  };

  const onFormError = useCallback((fieldErrors) => {
    const firstErrorField = Object.keys(fieldErrors)[0];
    const targetTab = FIELD_TAB_MAP[firstErrorField];
    if (targetTab && targetTab !== activeTab) {
      setActiveTab(targetTab);
    }
  }, [activeTab]);

  // Submit handler
  const onSubmit = async (data) => {
    setIsSubmitting(true);

    const toFloat = (val) => val !== '' && val != null ? parseFloat(val) : null;
    const toInt = (val) => val !== '' && val != null ? parseInt(val, 10) : null;
    const toStr = (val) => val || undefined;

    const payload = {
      id: mode === 'edit' ? participant.id : undefined,
      eventId: selectedEventId,
      participantName: data.participantName,
      participantEmail: toStr(data.participantEmail),
      participantPhone: toStr(data.participantPhone),
      roleId: toStr(data.roleId),
      participantStatus: data.participantStatus,
      participantJob: toStr(data.participantJob),
      participantNote: toStr(data.participantNote),
      organization: toStr(data.organization),
      // Identification
      documentationType: toStr(data.documentationType),
      documentLast4: toStr(data.documentLast4),
      nationality: toStr(data.nationality),
      residenceCountry: toStr(data.residenceCountry),
      emergencyContact: toStr(data.emergencyContact),
      internalId: toStr(data.internalId),
      // Visa
      visaRequired: data.visaRequired || false,
      visaSupport: data.visaSupport || false,
      // Arrival
      arrivalDate: toStr(data.arrivalDate),
      arrivalTime: toStr(data.arrivalTime),
      arrivalFlight: toStr(data.arrivalFlight),
      arrivalLayovers: toStr(data.arrivalLayovers),
      arrivalAirport: toStr(data.arrivalAirport),
      // Transfer
      transferRequired: data.transferRequired || false,
      transferDetails: toStr(data.transferDetails),
      transferCost: toFloat(data.transferCost),
      transferCurrency: toStr(data.transferCurrency),
      // Accommodation
      hotel: toStr(data.hotelName),
      roomType: toStr(data.roomType),
      checkInDate: toStr(data.checkInDate),
      checkOutDate: toStr(data.checkOutDate),
      nights: toInt(data.nights),
      ratePerNight: toFloat(data.ratePerNight),
      rateCurrency: toStr(data.accommodationCurrency),
      accommodationCost: toFloat(data.accommodationCost),
      // Departure
      departureDate: toStr(data.departureDate),
      departureTime: toStr(data.departureTime),
      departureFlight: toStr(data.departureFlight),
      departureAirport: toStr(data.departureAirport),
      // Financial
      ticketFare: toFloat(data.ticketFare),
      ticketCurrency: toStr(data.ticketCurrency),
      taxesExtras: toFloat(data.taxesExtras),
      taxesCurrency: toStr(data.taxesCurrency),
      totalTravelCost: toFloat(data.totalTravelCost),
      totalTravelCurrency: toStr(data.travelCurrency),
      paymentStatus: toStr(data.paymentStatus),
      bookingReference: toStr(data.bookingReference),
      bookingAgency: toStr(data.bookingAgency),
      // Other
      dietaryRestriction: toStr(data.dietaryRestriction),
      protocol: toStr(data.protocol),
      ...(mode !== 'edit' && {
        registrationDate: new Date().toISOString(),
        dependentsCount: 0,
      }),
    };

    // Helper: process dependent operations in parallel
    // dependentsCount is managed by optimistic cache + DynamoDB stream handlers
    const handleDependentOps = async (effectiveId, formDependents, existing) => {
      const existingIds = new Set(existing.map(d => d.id));
      const formIds = new Set(formDependents.filter(d => d.id).map(d => d.id));

      const ops = [];

      // Delete removed
      for (const dep of existing) {
        if (!formIds.has(dep.id)) {
          ops.push(
            deleteDependent({ id: dep.id, participantId: effectiveId, eventId: selectedEventId }).unwrap()
              .catch(err => { console.error('[Dependents] Delete failed:', dep.id, err); throw err; })
          );
        }
      }

      // Create/update
      for (const dep of formDependents) {
        if (dep.id && existingIds.has(dep.id)) {
          // Skip unchanged dependents to avoid unnecessary API calls
          const existingDep = existing.find(d => d.id === dep.id);
          if (existingDep && existingDep.name === dep.name && existingDep.age === dep.age) {
            continue;
          }
          ops.push(
            updateDependent({
              id: dep.id,
              name: dep.name,
              age: dep.age,
              participantId: effectiveId,
              eventId: selectedEventId,
            }).unwrap()
              .catch(err => { console.error('[Dependents] Update failed:', dep.id, err); throw err; })
          );
        } else if (dep.name) {
          ops.push(
            createDependent({
              name: dep.name,
              age: dep.age,
              participantId: effectiveId,
              eventId: selectedEventId,
            }).unwrap()
              .catch(err => { console.error('[Dependents] Create failed:', dep.name, err); throw err; })
          );
        }
      }

      // Skip if no operations needed (all dependents unchanged)
      if (ops.length === 0) return;

      const results = await Promise.allSettled(ops);
      const failures = results.filter(r => r.status === 'rejected');

      if (failures.length > 0) {
        console.error(`[Dependents] ${failures.length}/${results.length} operations failed`);
        dispatch(showToast({ message: 'toast.dependentOpsError', variant: 'error' }));
      }
    };

    try {
      if (mode === 'edit') {
        // ── OPTIMISTIC EDIT ──
        // Fire mutation and close immediately — onQueryStarted handles cache + toasts
        updateParticipant({
          id: participant.id,
          eventId: selectedEventId,
          ...payload,
        });

        // Optimistic patch: update dependents array in cache immediately
        if (data.dependents) {
          const optimisticDeps = data.dependents
            .filter(d => d.name) // only valid entries
            .map(d => ({
              id: d.id || `__temp_dep_${Date.now()}_${Math.random()}`,
              name: d.name,
              age: d.age,
              participantId: participant.id,
              eventId: selectedEventId,
              status: 'REGISTERED',
            }));

          dispatch(
            participantApi.util.updateQueryData(
              'listParticipantsByEventLambda',
              { eventId: selectedEventId },
              (draft) => {
                if (!draft?.items) return;
                const idx = draft.items.findIndex(p => p.id === participant.id);
                if (idx !== -1) {
                  draft.items[idx].dependents = optimisticDeps;
                  draft.items[idx].dependentsCount = optimisticDeps.length;
                }
              }
            )
          );
        }

        onClose();

        // Background: photo upload — rollback optimistic photoUrl on failure
        if (photoFile) {
          uploadPhoto(participant.id, photoFile)
            .then(url => updateParticipant({ id: participant.id, eventId: selectedEventId, photoUrl: url }))
            .catch(() => {
              // Rollback: remove photoUrl from cache so stale preview doesn't persist
              dispatch(
                participantApi.util.updateQueryData(
                  'listParticipantsByEventLambda',
                  { eventId: selectedEventId },
                  (draft) => {
                    if (!draft?.items) return;
                    const idx = draft.items.findIndex(item => item.id === participant.id);
                    if (idx !== -1) {
                      draft.items[idx].photoUrl = participant.photoUrl || null;
                    }
                  }
                )
              );
              dispatch(showToast({ message: 'toast.photoUploadError', variant: 'error' }));
            });
        }

        // Background: dependent operations — invalidate cache on failure to auto-correct
        if (data.dependents) {
          handleDependentOps(participant.id, data.dependents, existingDependents)
            .catch(() => {
              // Invalidate cache so UI reverts to server state
              dispatch(participantApi.util.invalidateTags([{ type: 'Participant', id: `LIST_${selectedEventId}` }]));
              dispatch(showToast({ message: 'toast.dependentOpsError', variant: 'error' }));
            });
        }
      } else {
        // ── OPTIMISTIC CREATE ──
        // Fire mutation — onQueryStarted adds temp item to cache instantly
        const mutationPromise = createParticipant(payload);

        // Optimistic patch: add dependents to the temp item
        if (data.dependents?.filter(d => d.name).length > 0) {
          const optimisticDeps = data.dependents
            .filter(d => d.name)
            .map(d => ({
              id: `__temp_dep_${Date.now()}_${Math.random()}`,
              name: d.name,
              age: d.age,
              participantId: null,
              eventId: selectedEventId,
              status: 'REGISTERED',
            }));

          dispatch(
            participantApi.util.updateQueryData(
              'listParticipantsByEventLambda',
              { eventId: selectedEventId },
              (draft) => {
                if (!draft?.items) return;
                const tempItem = draft.items.find(p => p.__isOptimistic);
                if (tempItem) {
                  tempItem.dependents = optimisticDeps;
                  tempItem.dependentsCount = optimisticDeps.length;
                }
              }
            )
          );
        }

        // Close immediately — table already shows the new participant
        onClose();

        // Background: chain photo + dependents after server returns real ID
        mutationPromise.unwrap()
          .then((result) => {
            const effectiveId = result?.createParticipant?.id;
            if (!effectiveId) return;

            // Photo upload — rollback on failure
            if (photoFile) {
              uploadPhoto(effectiveId, photoFile)
                .then(url => updateParticipant({ id: effectiveId, eventId: selectedEventId, photoUrl: url }))
                .catch(() => {
                  dispatch(
                    participantApi.util.updateQueryData(
                      'listParticipantsByEventLambda',
                      { eventId: selectedEventId },
                      (draft) => {
                        if (!draft?.items) return;
                        const idx = draft.items.findIndex(item => item.id === effectiveId);
                        if (idx !== -1) {
                          draft.items[idx].photoUrl = null;
                        }
                      }
                    )
                  );
                  dispatch(showToast({ message: 'toast.photoUploadError', variant: 'error' }));
                });
            }

            // Dependent operations — invalidate cache on failure to auto-correct
            if (data.dependents) {
              handleDependentOps(effectiveId, data.dependents, existingDependents)
                .catch(() => {
                  dispatch(participantApi.util.invalidateTags([{ type: 'Participant', id: `LIST_${selectedEventId}` }]));
                  dispatch(showToast({ message: 'toast.dependentOpsError', variant: 'error' }));
                });
            }
          })
          .catch(() => {
            // Error toast + undo already handled by onQueryStarted
          });
      }
    } catch (err) {
      console.error('Form submit error:', err);
      setIsSubmitting(false);

      // Extract specific error message from Lambda/GraphQL response
      const apiErrors = err?.data?.errors || err?.errors || [];
      const specificMessage = apiErrors[0]?.message;

      if (specificMessage) {
        dispatch(showToast({
          message: specificMessage,
          variant: 'error',
        }));
      }
    }
  };

  if (!isOpen) return null;

  const commonProps = { register, errors, control, watch };

  return createPortal(
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in bg-black/50 backdrop-blur-sm"
        onClick={handleBackdropClick}
      >
        {/* Modal */}
        <div
          className="bg-card flex flex-col animate-scale-in w-[80vw] max-w-[1100px] h-[85vh] max-h-[900px] sm:rounded-2xl overflow-hidden max-sm:w-screen max-sm:h-screen max-sm:max-w-none max-sm:max-h-none max-sm:rounded-none relative shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Loading overlay */}
          {isSubmitting && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 bg-card/85 backdrop-blur-sm">
              <div className="animate-spin rounded-full h-10 w-10 border-[3px] border-muted border-t-primary-500" />
              <p className="text-sm font-medium text-foreground">
                {mode === 'create'
                  ? t('participantsV2.formModal.footer.creating', 'A adicionar participante...')
                  : t('participantsV2.formModal.footer.saving', 'A guardar alteracoes...')}
              </p>
            </div>
          )}
          {/* Header */}
          <div className="shrink-0 flex items-center justify-between px-6 py-4 border-b border-border">
            <div className="flex items-center gap-3">
              {mode === 'edit' && participant && (
                <ParticipantAvatar participant={participant} size="md" />
              )}
              <div>
                <h2 className="text-base font-semibold text-foreground">
                  {mode === 'create'
                    ? t('participantsV2.formModal.titles.create', 'Adicionar Participante')
                    : t('participantsV2.formModal.titles.edit', 'Editar Participante')}
                </h2>
                {mode === 'edit' && participant?.participantEmail && (
                  <p className="text-xs mt-0.5 text-muted-foreground">
                    {participant.participantEmail}
                  </p>
                )}
              </div>
            </div>
            <button
              onClick={handleClose}
              className="flex items-center justify-center w-9 h-9 rounded-lg bg-muted hover:bg-accent transition-colors"
            >
              <FiX size={18} className="text-muted-foreground" />
            </button>
          </div>

          {/* Body: Sidebar + Content */}
          <div className="flex-1 flex flex-col sm:flex-row min-h-0">
            {/* Sidebar Tabs */}
            <FormTabs activeTab={activeTab} onTabChange={setActiveTab} />

            {/* Tab Content (scrollable) — all tabs stay mounted so react-hook-form keeps validation rules */}
            <div className="flex-1 overflow-y-auto scrollbar-thin p-6 max-sm:p-4">
              <div style={{ display: activeTab === 'basic' ? 'block' : 'none' }}>
                <BasicInfoTab
                  {...commonProps}
                  currentPhotoUrl={participant?.photoUrl}
                  onFileSelect={setPhotoFile}
                  roles={roles}
                  onCreateRole={handleCreateRole}
                  eventId={selectedEventId}
                  participantCounts={participantCounts}
                />
              </div>
              <div style={{ display: activeTab === 'identification' ? 'block' : 'none' }}>
                <IdentificationTab {...commonProps} mode={mode} />
              </div>
              <div style={{ display: activeTab === 'travel' ? 'block' : 'none' }}>
                <TravelTab {...commonProps} />
              </div>
              <div style={{ display: activeTab === 'accommodation' ? 'block' : 'none' }}>
                <AccommodationTab {...commonProps} />
              </div>
              <div style={{ display: activeTab === 'dependents' ? 'block' : 'none' }}>
                <DependentsTab {...commonProps} />
              </div>
            </div>
          </div>

          {/* Footer — 3-zone layout: hint | navigation stepper | submit */}
          {(() => {
            const tabIndex = TAB_KEYS.indexOf(activeTab);
            const isFirstTab = tabIndex === 0;
            const isLastTab = tabIndex === TAB_KEYS.length - 1;
            const totalTabs = TAB_KEYS.length;

            return (
              <div className="shrink-0 border-t border-border bg-muted">
                {/* Desktop footer (sm+) — 3 zones */}
                <div className="hidden sm:flex items-center justify-between px-6 py-3.5">
                  {/* Zone 1 — Left: required fields hint */}
                  <span className="text-xs shrink-0 text-muted-foreground">
                    {t('participantsV2.formModal.footer.required', '* Campos obrigatorios')}
                  </span>

                  {/* Zone 2 — Center: navigation stepper (Previous + dots + Next) */}
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setActiveTab(TAB_KEYS[tabIndex - 1])}
                      disabled={isFirstTab}
                      className={`px-3.5 py-2 text-[13px] font-medium rounded-lg border transition-colors ${
                        isFirstTab
                          ? 'border-border text-muted-foreground cursor-not-allowed opacity-50'
                          : 'border-border text-foreground cursor-pointer hover:bg-accent'
                      }`}
                      aria-label={t('participantsV2.formModal.footer.previous', 'Anterior')}
                    >
                      {t('participantsV2.formModal.footer.previous', 'Anterior')}
                    </button>

                    {/* Step indicator dots */}
                    <div className="flex items-center gap-1.5" role="group" aria-label={`${t('participantsV2.formModal.footer.step', 'Passo')} ${tabIndex + 1} ${t('participantsV2.formModal.footer.of', 'de')} ${totalTabs}`}>
                      {TAB_KEYS.map((key, i) => (
                        <button
                          key={key}
                          type="button"
                          onClick={() => setActiveTab(key)}
                          className={`rounded-full transition-[width,background-color] duration-200 h-1.5 border-none p-0 cursor-pointer ${
                            i === tabIndex
                              ? 'w-[18px] bg-primary'
                              : 'w-1.5 bg-border'
                          }`}
                          aria-label={`${t('participantsV2.formModal.footer.step', 'Passo')} ${i + 1}`}
                          aria-current={i === tabIndex ? 'step' : undefined}
                        />
                      ))}
                    </div>

                    <button
                      type="button"
                      onClick={() => setActiveTab(TAB_KEYS[tabIndex + 1])}
                      disabled={isLastTab}
                      className={`px-3.5 py-2 text-[13px] font-medium rounded-lg border transition-colors ${
                        isLastTab
                          ? 'border-border text-muted-foreground cursor-not-allowed opacity-50'
                          : 'border-border text-foreground cursor-pointer hover:bg-accent'
                      }`}
                      aria-label={t('participantsV2.formModal.footer.next', 'Proximo')}
                    >
                      {t('participantsV2.formModal.footer.next', 'Proximo')}
                    </button>
                  </div>

                  {/* Zone 3 — Right: submit (isolated from navigation) */}
                  <button
                    type="button"
                    onClick={handleSubmit(onSubmit, onFormError)}
                    disabled={isSubmitting}
                    className="px-5 py-2 text-[13px] font-semibold rounded-lg text-white bg-primary-500 hover:bg-primary-600 transition-colors disabled:opacity-50 shrink-0 shadow-[0_2px_8px_rgba(var(--color-primary-500),0.3)]"
                  >
                    {isSubmitting
                      ? (
                        <span className="flex items-center gap-2">
                          <svg className="animate-spin h-3.5 w-3.5 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                          {mode === 'create'
                            ? t('participantsV2.formModal.footer.creating', 'A adicionar...')
                            : t('participantsV2.formModal.footer.saving', 'A guardar...')}
                        </span>
                      )
                      : mode === 'create'
                        ? t('participantsV2.formModal.footer.create', 'Adicionar Participante')
                        : t('participantsV2.formModal.footer.save', 'Guardar Alteracoes')}
                  </button>
                </div>

                {/* Mobile footer (< sm) — stacked layout */}
                <div className="flex sm:hidden flex-col gap-3 px-4 py-3">
                  {/* Top row: step dots + counter */}
                  <div className="flex items-center justify-center gap-1.5">
                    {TAB_KEYS.map((key, i) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setActiveTab(key)}
                        className={`rounded-full transition-[width,background-color] duration-200 h-1.5 border-none p-0 cursor-pointer ${
                          i === tabIndex
                            ? 'w-[18px] bg-primary'
                            : 'w-1.5 bg-border'
                        }`}
                        aria-label={`${t('participantsV2.formModal.footer.step', 'Passo')} ${i + 1}`}
                        aria-current={i === tabIndex ? 'step' : undefined}
                      />
                    ))}
                  </div>

                  {/* Bottom row: Previous | Submit | Next */}
                  <div className="flex items-center gap-2">
                    {/* Previous — takes 1/4 width when visible */}
                    <button
                      type="button"
                      onClick={() => !isFirstTab && setActiveTab(TAB_KEYS[tabIndex - 1])}
                      disabled={isFirstTab}
                      className={`shrink-0 px-3 py-2.5 text-[13px] font-medium rounded-lg border transition-colors ${
                        isFirstTab
                          ? 'border-border text-muted-foreground opacity-40 invisible'
                          : 'border-border text-foreground visible'
                      }`}
                      aria-label={t('participantsV2.formModal.footer.previous', 'Anterior')}
                    >
                      {t('participantsV2.formModal.footer.previous', 'Anterior')}
                    </button>

                    {/* Submit — fills remaining space, always visible */}
                    <button
                      type="button"
                      onClick={handleSubmit(onSubmit, onFormError)}
                      disabled={isSubmitting}
                      className="flex-1 py-2.5 text-[13px] font-semibold rounded-lg text-white bg-primary-500 hover:bg-primary-600 transition-colors disabled:opacity-50 min-h-[44px] shadow-[0_2px_8px_rgba(var(--color-primary-500),0.3)]"
                    >
                      {isSubmitting
                        ? (
                          <span className="flex items-center justify-center gap-2">
                            <svg className="animate-spin h-3.5 w-3.5 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                            </svg>
                            {mode === 'create'
                              ? t('participantsV2.formModal.footer.creating', 'A adicionar...')
                              : t('participantsV2.formModal.footer.saving', 'A guardar...')}
                          </span>
                        )
                        : mode === 'create'
                          ? t('participantsV2.formModal.footer.create', 'Adicionar Participante')
                          : t('participantsV2.formModal.footer.save', 'Guardar Alteracoes')}
                    </button>

                    {/* Next — takes 1/4 width when visible */}
                    <button
                      type="button"
                      onClick={() => !isLastTab && setActiveTab(TAB_KEYS[tabIndex + 1])}
                      disabled={isLastTab}
                      className={`shrink-0 px-3 py-2.5 text-[13px] font-semibold rounded-lg text-white transition-colors min-h-[44px] ${
                        isLastTab
                          ? 'bg-muted opacity-40 invisible'
                          : 'bg-primary-500 hover:bg-primary-600 visible shadow-[0_2px_8px_rgba(var(--color-primary-500),0.3)]'
                      }`}
                      aria-label={t('participantsV2.formModal.footer.next', 'Proximo')}
                    >
                      {t('participantsV2.formModal.footer.next', 'Proximo')}
                    </button>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      </div>

      {/* Unsaved Changes Warning */}
      {showUnsavedWarning && (
        <UnsavedChangesDialog
          onCancel={() => setShowUnsavedWarning(false)}
          onDiscard={() => {
            setShowUnsavedWarning(false);
            onClose();
          }}
        />
      )}
    </>,
    document.body
  );
};

ParticipantFormModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  participant: PropTypes.object,
  mode: PropTypes.oneOf(['create', 'edit']),
  existingDependents: PropTypes.array,
  participantCount: PropTypes.number,
  participantCounts: PropTypes.objectOf(PropTypes.number),
};

export default ParticipantFormModal;
