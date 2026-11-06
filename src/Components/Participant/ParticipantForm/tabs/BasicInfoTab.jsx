import { useState } from 'react';
import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import { Controller } from 'react-hook-form';
import { FiUser, FiBriefcase, FiEdit3 } from 'react-icons/fi';
import PhotoUploadArea from '../PhotoUploadArea';
import CreatableRoleSelect from '../CreatableRoleSelect';
import RoleManagerPanel from '../RoleManagerPanel';
import { inputCls, labelCls, requiredStar, errorMsg, sectionTitle } from '../formStyles';
import { useEventRole, EVENT_PERMISSIONS } from '../../../../Hook/useEventRole';
import { roleHasPermission } from '../../../../Utils/eventRolesConfig';

const BasicInfoTab = ({
  register,
  errors,
  control,
  watch,
  currentPhotoUrl,
  onFileSelect,
  roles,
  onCreateRole,
  eventId,
  participantCounts,
}) => {
  const { t } = useTranslation('participant');
  const [showRoleManager, setShowRoleManager] = useState(false);
  const { role } = useEventRole(eventId);
  const canManageRoles = roles && roles.length > 0 && roleHasPermission(role, EVENT_PERMISSIONS.ROLE_MANAGE);

  return (
    <div className="space-y-6">
      {/* Photo upload area */}
      <PhotoUploadArea
        currentPhotoUrl={watch('photoUrl') || currentPhotoUrl}
        participantName={watch('participantName')}
        participantEmail={watch('participantEmail')}
        onFileSelect={onFileSelect}
        disabled={false}
      />

      {/* ── Personal Info Section ── */}
      <div>
        <div className="flex items-center gap-2.5 mb-4">
          <span className="w-7 h-7 rounded-lg flex items-center justify-center bg-info-100 dark:bg-info-900/30 shrink-0">
            <FiUser size={16} className="text-info-500" />
          </span>
          <h4 className={sectionTitle}>
            {t('participantsV2.formModal.sections.personalInfo', 'Informação Pessoal')}
          </h4>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-5">
          {/* Nome */}
          <div>
            <label className={labelCls}>
              {t('participantsV2.formModal.fields.participantName', 'Nome')}{' '}
              <span className={requiredStar}>*</span>
            </label>
            <input
              type="text"
              className={inputCls(errors.participantName)}
              {...register('participantName', {
                required: t('participantsV2.formModal.fields.participantNameRequired', 'Nome é obrigatório'),
              })}
            />
            {errors.participantName && (
              <span className={errorMsg}>
                {errors.participantName.message}
              </span>
            )}
          </div>

          {/* Email */}
          <div>
            <label className={labelCls}>
              {t('participantsV2.formModal.fields.participantEmail', 'Email')}{' '}
              <span className={requiredStar}>*</span>
            </label>
            <input
              type="email"
              className={inputCls(errors.participantEmail)}
              {...register('participantEmail', {
                required: t('participantsV2.formModal.fields.participantEmailRequired', 'Email é obrigatório'),
                pattern: {
                  value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                  message: t('participantsV2.formModal.validation.invalidEmail', 'Formato de email inválido'),
                },
              })}
            />
            {errors.participantEmail && (
              <span className={errorMsg}>
                {errors.participantEmail.message}
              </span>
            )}
          </div>

          {/* Telefone */}
          <div>
            <label className={labelCls}>
              {t('participantsV2.formModal.fields.participantPhone', 'Telefone')}
            </label>
            <input
              type="text"
              className={inputCls(errors.participantPhone)}
              {...register('participantPhone')}
            />
          </div>

          {/* Status */}
          <div>
            <label className={labelCls}>
              {t('participantsV2.formModal.fields.participantStatus', 'Status')}{' '}
              <span className={requiredStar}>*</span>
            </label>
            <select
              className={inputCls(errors.participantStatus)}
              {...register('participantStatus', {
                required: t('participantsV2.formModal.fields.participantStatusRequired', 'Status é obrigatório'),
              })}
            >
              <option value="REGISTERED">
                {t('participantsV2.formModal.fields.statusRegistered', 'Registado')}
              </option>
              <option value="CONFIRMED">
                {t('participantsV2.formModal.fields.statusConfirmed', 'Confirmado')}
              </option>
              <option value="CANCELLED">
                {t('participantsV2.formModal.fields.statusCancelled', 'Cancelado')}
              </option>
              <option value="ATTENDED">
                {t('participantsV2.formModal.fields.statusAttended', 'Presente')}
              </option>
            </select>
            {errors.participantStatus && (
              <span className={errorMsg}>
                {errors.participantStatus.message}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ── Professional Section ── */}
      <div>
        <div className="flex items-center gap-2.5 mb-4">
          <span className="w-7 h-7 rounded-lg flex items-center justify-center bg-secondary-100 dark:bg-secondary-900/30 shrink-0">
            <FiBriefcase size={16} className="text-secondary-500" />
          </span>
          <h4 className={sectionTitle}>
            {t('participantsV2.formModal.sections.professional', 'Profissional')}
          </h4>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-5">
          {/* Cargo / Funcao */}
          <div>
            <label className={labelCls}>
              {t('participantsV2.formModal.fields.participantJob', 'Cargo / Função')}
            </label>
            <input
              type="text"
              className={inputCls(errors.participantJob)}
              {...register('participantJob')}
            />
          </div>

          {/* Organizacao */}
          <div>
            <label className={labelCls}>
              {t('participantsV2.formModal.fields.organization', 'Organização')}
            </label>
            <input
              type="text"
              className={inputCls(errors.organization)}
              {...register('organization')}
            />
          </div>

          {/* Role (CreatableRoleSelect) */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className={labelCls}>
                {t('participantsV2.formModal.fields.roleId', 'Role')}
              </label>
              {canManageRoles && (
                <button
                  type="button"
                  onClick={() => setShowRoleManager(!showRoleManager)}
                  className="text-xs font-medium text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 transition-colors"
                >
                  {showRoleManager ? t('participantsV2.formModal.roleManager.hidePanel', 'Fechar') : t('participantsV2.formModal.roleManager.manageButton', 'Gerir')}
                </button>
              )}
            </div>
            <Controller
              name="roleId"
              control={control}
              render={({ field }) => (
                <CreatableRoleSelect
                  value={field.value || ''}
                  onChange={field.onChange}
                  roles={roles}
                  onCreateRole={onCreateRole}
                  participantCounts={participantCounts}
                />
              )}
            />
            {showRoleManager && (
              <RoleManagerPanel
                eventId={eventId}
                roles={roles}
                participantCounts={participantCounts}
                onClose={() => setShowRoleManager(false)}
              />
            )}
          </div>
        </div>
      </div>

      {/* ── Notes Section ── */}
      <div>
        <div className="flex items-center gap-2.5 mb-4">
          <span className="w-7 h-7 rounded-lg flex items-center justify-center bg-neutral-100 dark:bg-neutral-700/50 shrink-0">
            <FiEdit3 size={16} className="text-text-500 dark:text-text-400" />
          </span>
          <h4 className={sectionTitle}>
            {t('participantsV2.formModal.sections.notes', 'Notas')}
          </h4>
        </div>

        <textarea
          className={`${inputCls(errors.participantNote)} min-h-[80px] resize-y`}
          placeholder={t('participantsV2.formModal.fields.notesPlaceholder', 'Additional notes about the participant...')}
          {...register('participantNote')}
        />
      </div>
    </div>
  );
};

BasicInfoTab.propTypes = {
  register: PropTypes.func.isRequired,
  errors: PropTypes.object.isRequired,
  control: PropTypes.object.isRequired,
  watch: PropTypes.func.isRequired,
  currentPhotoUrl: PropTypes.string,
  onFileSelect: PropTypes.func.isRequired,
  roles: PropTypes.arrayOf(
    PropTypes.shape({
      name: PropTypes.string.isRequired,
    })
  ),
  onCreateRole: PropTypes.func,
  eventId: PropTypes.string,
  participantCounts: PropTypes.objectOf(PropTypes.number),
};

BasicInfoTab.defaultProps = {
  currentPhotoUrl: null,
  roles: [],
  onCreateRole: null,
  eventId: '',
  participantCounts: {},
};

export default BasicInfoTab;
