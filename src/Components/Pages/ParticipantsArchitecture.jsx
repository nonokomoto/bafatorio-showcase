import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import PropTypes from 'prop-types';
import {
  FiSearch, FiFilter, FiDownload, FiUpload, FiPlus, FiX, FiCheck,
  FiEdit2, FiTrash2, FiMail, FiChevronRight, FiChevronDown, FiChevronUp,
  FiUser, FiFileText, FiHome, FiDollarSign, FiUsers,
  FiPhone, FiBriefcase, FiGlobe, FiTruck, FiSend, FiAlertCircle,
  FiCamera, FiCreditCard, FiNavigation, 
} from 'react-icons/fi';
import { djb2 } from '../../Utils/avatarColors';

// ============================================================================
// BAFATORIO - Participants Section Architecture Prototype
// ============================================================================
// This prototype demonstrates the new UX/UI architecture for the Participants
// section, inspired by modern CRM interfaces. It includes:
// - Table with avatar/initials, sorting, role filters
// - 75-80% viewport modal for Add/Edit participant
// - Side panel detail view
// - CreatableRoleSelect with search, create, keyboard nav
// - Unsaved changes warning, empty states, export
// ============================================================================

// ---- Color Utilities (matches existing avatarColors.js) ----
const AVATAR_PALETTE = [
  { bg: '#2563EB', text: '#fff' },
  { bg: '#DB2777', text: '#fff' },
  { bg: '#F59E0B', text: '#fff' },
  { bg: '#16A34A', text: '#fff' },
  { bg: '#9333EA', text: '#fff' },
  { bg: '#E11D48', text: '#fff' },
  { bg: '#0D9488', text: '#fff' },
  { bg: '#4F46E5', text: '#fff' },
  { bg: '#EA580C', text: '#fff' },
  { bg: '#0891B2', text: '#fff' },
];

function getAvatarColor(id = '') {
  return AVATAR_PALETTE[djb2(id.toLowerCase()) % AVATAR_PALETTE.length];
}

function getInitials(name, email) {
  if (name?.trim()) {
    const parts = name.trim().split(/\s+/);
    return parts.length >= 2
      ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
      : parts[0].substring(0, 2).toUpperCase();
  }
  if (email) {
    const local = email.split('@')[0] || '';
    const parts = local.split(/[._-]/);
    return parts.length >= 2
      ? (parts[0][0] + parts[1][0]).toUpperCase()
      : local.substring(0, 2).toUpperCase();
  }
  return '??';
}

// ---- Sample Data ----
const SAMPLE_PARTICIPANTS = [
  { id: '1', participantName: 'Ana Silva', participantEmail: 'ana.silva@email.com', participantPhone: '+351 912 345 678', role: { name: 'VIP' }, participantStatus: 'CONFIRMED', participantJob: 'Diretora de Marketing', organization: 'TechCorp', registrationDate: '2026-01-15T10:30:00Z', photoUrl: null, dependentsCount: 2, nationality: 'Portuguesa', hotel: 'Hotel Ritz', arrivalDate: '2026-03-01', arrivalFlight: 'TP1234' },
  { id: '2', participantName: 'Carlos Santos', participantEmail: 'carlos@empresa.pt', participantPhone: '+351 923 456 789', role: { name: 'Speaker' }, participantStatus: 'REGISTERED', participantJob: 'CEO', organization: 'InnovateTech', registrationDate: '2026-01-20T14:00:00Z', photoUrl: null, dependentsCount: 0, nationality: 'Brasileira', hotel: null, arrivalDate: null, arrivalFlight: null },
  { id: '3', participantName: 'Maria Fernandes', participantEmail: 'maria.f@outlook.com', participantPhone: '+351 934 567 890', role: { name: 'Attendee' }, participantStatus: 'CONFIRMED', participantJob: 'Designer UX', organization: 'DesignStudio', registrationDate: '2026-01-22T09:15:00Z', photoUrl: null, dependentsCount: 1, nationality: 'Portuguesa', hotel: 'Pestana Palace', arrivalDate: '2026-03-01', arrivalFlight: 'BA2345' },
  { id: '4', participantName: 'João Pereira', participantEmail: 'joao.pereira@gmail.com', participantPhone: '+351 945 678 901', role: { name: 'Media' }, participantStatus: 'ATTENDED', participantJob: 'Jornalista', organization: 'MediaGroup', registrationDate: '2026-02-01T16:45:00Z', photoUrl: null, dependentsCount: 0, nationality: 'Portuguesa', hotel: null, arrivalDate: null, arrivalFlight: null },
  { id: '5', participantName: 'Sofia Almeida', participantEmail: 'sofia.almeida@company.com', participantPhone: '+351 956 789 012', role: { name: 'VIP' }, participantStatus: 'CONFIRMED', participantJob: 'Diretora Financeira', organization: 'FinanceCorp', registrationDate: '2026-02-03T11:00:00Z', photoUrl: null, dependentsCount: 3, nationality: 'Angolana', hotel: 'Hotel Ritz', arrivalDate: '2026-02-28', arrivalFlight: 'DT789' },
  { id: '6', participantName: 'Pedro Costa', participantEmail: 'pedro.costa@tech.io', participantPhone: '+351 967 890 123', role: { name: 'Team' }, participantStatus: 'CANCELLED', participantJob: 'Engenheiro de Software', organization: 'DevTeam', registrationDate: '2026-02-05T08:30:00Z', photoUrl: null, dependentsCount: 0, nationality: null, hotel: null, arrivalDate: null, arrivalFlight: null },
  { id: '7', participantName: 'Beatriz Rodrigues', participantEmail: 'beatriz@consulting.pt', participantPhone: '+351 978 901 234', role: { name: 'Attendee' }, participantStatus: 'REGISTERED', participantJob: 'Consultora', organization: 'ConsultingPT', registrationDate: '2026-02-07T13:20:00Z', photoUrl: null, dependentsCount: 1, nationality: 'Portuguesa', hotel: 'NH Hotels', arrivalDate: '2026-03-01', arrivalFlight: null },
  { id: '8', participantName: 'Diogo Martins', participantEmail: 'diogo.m@startup.co', participantPhone: '+351 989 012 345', role: { name: 'Speaker' }, participantStatus: 'CONFIRMED', participantJob: 'CTO', organization: 'StartupAI', registrationDate: '2026-02-10T10:00:00Z', photoUrl: null, dependentsCount: 0, nationality: 'Brasileira', hotel: 'Hotel Ritz', arrivalDate: '2026-02-28', arrivalFlight: 'AZ456' },
];

const DEFAULT_ROLE_STYLES = {
  VIP: { bg: '#FEF3C7', text: '#92400E', dot: '#F59E0B' },
  Speaker: { bg: '#EDE9FE', text: '#5B21B6', dot: '#8B5CF6' },
  Attendee: { bg: '#DBEAFE', text: '#1E40AF', dot: '#3B82F6' },
  Media: { bg: '#FCE7F3', text: '#9D174D', dot: '#EC4899' },
  Team: { bg: '#D1FAE5', text: '#065F46', dot: '#10B981' },
};

const ROLE_COLOR_PALETTE = [
  { bg: '#FEE2E2', text: '#991B1B', dot: '#EF4444' },
  { bg: '#E0E7FF', text: '#3730A3', dot: '#6366F1' },
  { bg: '#CCFBF1', text: '#115E59', dot: '#14B8A6' },
  { bg: '#FFF7ED', text: '#9A3412', dot: '#F97316' },
  { bg: '#F5F3FF', text: '#4C1D95', dot: '#7C3AED' },
  { bg: '#ECFDF5', text: '#064E3B', dot: '#059669' },
  { bg: '#FFF1F2', text: '#881337', dot: '#F43F5E' },
  { bg: '#F0F9FF', text: '#075985', dot: '#0284C7' },
];

function getRoleStyle(roleName, roleStyles) {
  return roleStyles[roleName] || DEFAULT_ROLE_STYLES.Attendee;
}

function generateRoleStyle(roleName) {
  return ROLE_COLOR_PALETTE[djb2(roleName) % ROLE_COLOR_PALETTE.length];
}

const STATUS_STYLES = {
  CONFIRMED: { bg: '#D1FAE5', text: '#065F46', dot: '#10B981', label: 'Confirmado' },
  REGISTERED: { bg: '#DBEAFE', text: '#1E40AF', dot: '#3B82F6', label: 'Registado' },
  CANCELLED: { bg: '#FEE2E2', text: '#991B1B', dot: '#EF4444', label: 'Cancelado' },
  ATTENDED: { bg: '#F3E8FF', text: '#6B21A8', dot: '#8B5CF6', label: 'Presente' },
};

// ============================================================================
// COMPONENT: ParticipantAvatar
// ============================================================================
const ParticipantAvatar = ({ participant, size = 36 }) => {
  const color = getAvatarColor(participant.participantEmail || participant.id);
  const initials = getInitials(participant.participantName, participant.participantEmail);

  if (participant.photoUrl) {
    return (
      <img
        src={participant.photoUrl}
        alt={participant.participantName}
        style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover' }}
      />
    );
  }

  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      backgroundColor: color.bg, color: color.text,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.38, fontWeight: 600, letterSpacing: '0.02em',
      flexShrink: 0,
    }}>
      {initials}
    </div>
  );
};

ParticipantAvatar.propTypes = {
  participant: PropTypes.shape({
    id: PropTypes.string,
    participantName: PropTypes.string,
    participantEmail: PropTypes.string,
    photoUrl: PropTypes.string,
  }).isRequired,
  size: PropTypes.number,
};

// ============================================================================
// COMPONENT: RoleBadge
// ============================================================================
const RoleBadge = ({ roleName, roleStyles = DEFAULT_ROLE_STYLES }) => {
  const style = getRoleStyle(roleName, roleStyles);
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '3px 10px', borderRadius: 20,
      backgroundColor: style.bg, color: style.text,
      fontSize: 12, fontWeight: 500, whiteSpace: 'nowrap',
    }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: style.dot }} />
      {roleName}
    </span>
  );
};

RoleBadge.propTypes = {
  roleName: PropTypes.string,
  roleStyles: PropTypes.object,
};

// ============================================================================
// COMPONENT: StatusBadge (now with dot indicator for consistency)
// ============================================================================
const StatusBadge = ({ status }) => {
  const style = STATUS_STYLES[status] || STATUS_STYLES.REGISTERED;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '3px 10px', borderRadius: 20,
      backgroundColor: style.bg, color: style.text,
      fontSize: 12, fontWeight: 500,
    }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: style.dot }} />
      {style.label}
    </span>
  );
};

StatusBadge.propTypes = {
  status: PropTypes.string,
};

// ============================================================================
// COMPONENT: UnsavedChangesDialog
// ============================================================================
const UnsavedChangesDialog = ({ onDiscard, onCancel }) => (
  <div style={{
    position: 'fixed', inset: 0, zIndex: 100,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)',
    animation: 'fadeIn 0.15s ease-out',
  }}>
    <div style={{
      backgroundColor: '#fff', borderRadius: 16, padding: 28,
      maxWidth: 400, width: '90%',
      boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
      animation: 'scaleIn 0.2s ease-out',
    }}>
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
        <div style={{
          width: 48, height: 48, borderRadius: '50%',
          backgroundColor: '#FEF3C7', display: 'flex',
          alignItems: 'center', justifyContent: 'center',
        }}>
          <FiAlertCircle size={24} color="#F59E0B" />
        </div>
      </div>
      <h3 style={{ margin: '0 0 8px', fontSize: 16, fontWeight: 600, color: '#111827', textAlign: 'center' }}>
        Alterações não guardadas
      </h3>
      <p style={{ margin: '0 0 24px', fontSize: 13, color: '#6B7280', textAlign: 'center', lineHeight: 1.5 }}>
        Tem alterações por guardar. Deseja descartar as alterações?
      </p>
      <div style={{ display: 'flex', gap: 10 }}>
        <button onClick={onCancel} style={{
          flex: 1, padding: '10px 0', borderRadius: 8,
          border: '1px solid #D1D5DB', backgroundColor: '#fff',
          fontSize: 13, fontWeight: 500, color: '#374151', cursor: 'pointer',
        }}>
          Continuar a editar
        </button>
        <button onClick={onDiscard} style={{
          flex: 1, padding: '10px 0', borderRadius: 8, border: 'none',
          backgroundColor: '#EF4444', color: '#fff',
          fontSize: 13, fontWeight: 600, cursor: 'pointer',
        }}>
          Descartar
        </button>
      </div>
    </div>
  </div>
);

UnsavedChangesDialog.propTypes = {
  onDiscard: PropTypes.func,
  onCancel: PropTypes.func,
};

// ============================================================================
// COMPONENT: SortableHeader
// ============================================================================
const SortableHeader = ({ label, sortKey, sortConfig, onSort }) => {
  const isActive = sortConfig.key === sortKey;
  return (
    <th
      onClick={() => onSort(sortKey)}
      style={{
        padding: '12px 16px', textAlign: 'left', fontWeight: 600,
        color: '#6B7280', fontSize: 11, textTransform: 'uppercase',
        letterSpacing: '0.05em', cursor: 'pointer', userSelect: 'none',
        whiteSpace: 'nowrap',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        {label}
        <span style={{
          display: 'inline-flex', flexDirection: 'column', gap: 0,
          opacity: isActive ? 1 : 0.3,
          transition: 'opacity 0.15s',
        }}>
          <FiChevronUp
            size={10}
            color={isActive && sortConfig.direction === 'asc' ? '#4069FF' : '#9CA3AF'}
            style={{ marginBottom: -3 }}
          />
          <FiChevronDown
            size={10}
            color={isActive && sortConfig.direction === 'desc' ? '#4069FF' : '#9CA3AF'}
          />
        </span>
      </div>
    </th>
  );
};

SortableHeader.propTypes = {
  label: PropTypes.string,
  sortKey: PropTypes.string,
  sortConfig: PropTypes.shape({
    key: PropTypes.string,
    direction: PropTypes.string,
  }),
  onSort: PropTypes.func,
};

// ============================================================================
// COMPONENT: ParticipantFormModal (75-80% viewport)
// ============================================================================
const ParticipantFormModal = ({ isOpen, onClose, participant = null, mode = 'create', availableRoles = [], onCreateRole, participantCounts = {} }) => {
  const [activeTab, setActiveTab] = useState('basic');
  const [selectedRole, setSelectedRole] = useState('');
  const [isDirty, setIsDirty] = useState(false);
  const [showUnsavedWarning, setShowUnsavedWarning] = useState(false);

  // Sync state when modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedRole(participant?.role?.name || '');
      setActiveTab('basic');
      setIsDirty(false);
      setShowUnsavedWarning(false);
    }
  }, [isOpen, participant]);

  const handleClose = useCallback(() => {
    if (isDirty) {
      setShowUnsavedWarning(true);
    } else {
      onClose();
    }
  }, [isDirty, onClose]);

  // Escape key handler
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e) => {
      if (e.key === 'Escape') {
        if (showUnsavedWarning) return;
        handleClose();
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, isDirty, showUnsavedWarning, handleClose]);

  const handleFormInput = useCallback(() => {
    if (!isDirty) setIsDirty(true);
  }, [isDirty]);

  const handleRoleChange = useCallback((val) => {
    setSelectedRole(val);
    if (!isDirty) setIsDirty(true);
  }, [isDirty]);

  if (!isOpen) return null;

  const isEdit = mode === 'edit';
  const title = isEdit ? 'Editar Participante' : 'Adicionar Participante';

  const tabs = [
    { id: 'basic', label: 'Dados Básicos', Icon: FiUser, iconColor: '#3B82F6' },
    { id: 'identification', label: 'Identificação', Icon: FiCreditCard, iconColor: '#F59E0B' },
    { id: 'travel', label: 'Viagem', Icon: FiNavigation, iconColor: '#10B981' },
    { id: 'accommodation', label: 'Alojamento', Icon: FiHome, iconColor: '#8B5CF6' },
    { id: 'financial', label: 'Financeiro', Icon: FiDollarSign, iconColor: '#F97316' },
    { id: 'dependents', label: 'Acompanhantes', Icon: FiUsers, iconColor: '#EC4899' },
  ];

  return (
    <>
      <div style={{
        position: 'fixed', inset: 0, zIndex: 50,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        backdropFilter: 'blur(4px)',
        animation: 'fadeIn 0.2s ease-out',
      }} onClick={(e) => e.target === e.currentTarget && handleClose()}>

        {/* Modal Container */}
        <div className="modal-container" style={{
          width: '80vw', maxWidth: 1100, height: '85vh', maxHeight: 900,
          backgroundColor: '#fff', borderRadius: 16,
          display: 'flex', flexDirection: 'column',
          boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
          animation: 'scaleIn 0.25s ease-out',
          overflow: 'hidden',
        }}>

          {/* Modal Header */}
          <div className="modal-header" style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '20px 28px', borderBottom: '1px solid #E5E7EB',
            flexShrink: 0,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              {isEdit && participant && (
                <ParticipantAvatar participant={participant} size={44} />
              )}
              <div>
                <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600, color: '#111827' }}>
                  {title}
                </h2>
                {isEdit && participant && (
                  <p style={{ margin: '2px 0 0', fontSize: 13, color: '#6B7280' }}>
                    {participant.participantEmail}
                  </p>
                )}
              </div>
            </div>
            <button onClick={handleClose} style={{
              width: 36, height: 36, borderRadius: 8, border: 'none',
              backgroundColor: '#F3F4F6', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#6B7280', transition: 'background-color 0.15s',
            }} onMouseOver={e => e.currentTarget.style.backgroundColor = '#E5E7EB'}
               onMouseOut={e => e.currentTarget.style.backgroundColor = '#F3F4F6'}>
              <FiX size={18} />
            </button>
          </div>

          {/* Modal Body: Sidebar Tabs + Content */}
          <div className="modal-body" style={{ display: 'flex', flex: 1, minHeight: 0 }}>

            {/* Sidebar Navigation */}
            <div className="modal-sidebar" style={{
              width: 220, flexShrink: 0, backgroundColor: '#F9FAFB',
              borderRight: '1px solid #E5E7EB', padding: '16px 12px',
              overflowY: 'auto',
            }}>
              {tabs.map(tab => {
                const TabIcon = tab.Icon;
                const isActiveTab = activeTab === tab.id;
                return (
                  <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
                    width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                    padding: '10px 14px', borderRadius: 8, border: 'none',
                    backgroundColor: isActiveTab ? '#fff' : 'transparent',
                    color: isActiveTab ? '#111827' : '#374151',
                    fontWeight: isActiveTab ? 600 : 400,
                    fontSize: 13, cursor: 'pointer', marginBottom: 4,
                    boxShadow: isActiveTab ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                    transition: 'background-color 0.15s, color 0.15s',
                    textAlign: 'left',
                  }}>
                    <span style={{
                      width: 28, height: 28, borderRadius: 6, display: 'flex',
                      alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                      backgroundColor: isActiveTab ? tab.iconColor + '18' : 'transparent',
                      color: tab.iconColor,
                      transition: 'background-color 0.15s',
                    }}>
                      <TabIcon size={15} />
                    </span>
                    <span className="tab-label">{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Form Content Area */}
            <div className="modal-content" style={{ flex: 1, overflowY: 'auto', padding: '24px 32px' }} onInput={handleFormInput}>
              {activeTab === 'basic' && (
                <div>
                  <h3 style={{ fontSize: 15, fontWeight: 600, color: '#111827', marginBottom: 20, marginTop: 0 }}>
                    Informação Básica
                  </h3>

                  {/* Profile Photo Upload Area */}
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 20, marginBottom: 28,
                    padding: 20, backgroundColor: '#F9FAFB', borderRadius: 12,
                    border: '1px dashed #D1D5DB',
                  }}>
                    <ParticipantAvatar
                      participant={participant || { id: 'new', participantName: '', participantEmail: '' }}
                      size={64}
                    />
                    <div>
                      <p style={{ margin: 0, fontSize: 14, fontWeight: 500, color: '#374151' }}>
                        Foto de Perfil
                      </p>
                      <p style={{ margin: '4px 0 12px', fontSize: 12, color: '#9CA3AF' }}>
                        JPG, PNG ou GIF. Máximo 2MB.
                      </p>
                      <button style={{
                        padding: '6px 16px', borderRadius: 6,
                        border: '1px solid #D1D5DB', backgroundColor: '#fff',
                        fontSize: 13, fontWeight: 500, color: '#374151',
                        cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
                      }}>
                        <FiCamera size={14} />
                        Carregar Foto
                      </button>
                    </div>
                  </div>

                  {/* Form Grid */}
                  <div className="form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px 20px' }}>
                    <FormField label="Nome *" placeholder="Nome completo" defaultValue={participant?.participantName} />
                    <FormField label="Email" placeholder="email@exemplo.com" type="email" defaultValue={participant?.participantEmail} />
                    <FormField label="Telefone" placeholder="+351 900 000 000" defaultValue={participant?.participantPhone} />
                    <FormField label="Cargo / Função" placeholder="ex: Diretor de Marketing" defaultValue={participant?.participantJob} />
                    <FormField label="Organização" placeholder="Nome da empresa" defaultValue={participant?.organization} />
                    <CreatableRoleSelect
                      value={selectedRole}
                      onChange={handleRoleChange}
                      roles={availableRoles}
                      onCreateRole={onCreateRole}
                      participantCounts={participantCounts}
                    />
                    <div>
                      <label htmlFor="participant-status" style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 6 }}>
                        Status *
                      </label>
                      <select id="participant-status" style={{
                        width: '100%', padding: '10px 12px', borderRadius: 8,
                        border: '1px solid #D1D5DB', fontSize: 14, color: '#374151',
                        backgroundColor: '#fff', outline: 'none',
                      }}
                      onFocus={e => e.target.style.boxShadow = '0 0 0 3px rgba(64, 105, 255, 0.1)'}
                      onBlur={e => e.target.style.boxShadow = 'none'}
                      defaultValue={participant?.participantStatus || 'REGISTERED'}>
                        <option value="REGISTERED">Registado</option>
                        <option value="CONFIRMED">Confirmado</option>
                        <option value="CANCELLED">Cancelado</option>
                        <option value="ATTENDED">Presente</option>
                      </select>
                    </div>
                  </div>

                  {/* Notes */}
                  <div style={{ marginTop: 20 }}>
                    <label htmlFor="participant-notes" style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 6 }}>
                      Notas
                    </label>
                    <textarea id="participant-notes" style={{
                      width: '100%', padding: '10px 12px', borderRadius: 8,
                      border: '1px solid #D1D5DB', fontSize: 14, color: '#374151',
                      minHeight: 80, resize: 'vertical', outline: 'none',
                      fontFamily: 'inherit',
                    }}
                    onFocus={e => e.target.style.boxShadow = '0 0 0 3px rgba(64, 105, 255, 0.1)'}
                    onBlur={e => e.target.style.boxShadow = 'none'}
                    placeholder="Notas adicionais sobre o participante..."
                      defaultValue={participant?.participantNote} />
                  </div>
                </div>
              )}

              {activeTab === 'identification' && (
                <div>
                  <h3 style={{ fontSize: 15, fontWeight: 600, color: '#111827', marginBottom: 20, marginTop: 0 }}>
                    Identificação & Documentação
                  </h3>
                  <div className="form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px 20px' }}>
                    <FormField label="Tipo de Documento" placeholder="ex: Passaporte, BI" />
                    <FormField label="Últimos 4 dígitos" placeholder="****" />
                    <FormField label="Nacionalidade" placeholder="ex: Portuguesa" defaultValue={participant?.nationality} />
                    <FormField label="País de Residência" placeholder="ex: Portugal" />
                    <FormField label="Contacto de Emergência" placeholder="+351 900 000 000" />
                    <FormField label="ID Interno" placeholder="Referência interna" />
                  </div>

                  <div style={{ marginTop: 24, padding: 16, backgroundColor: '#F9FAFB', borderRadius: 10, border: '1px solid #E5E7EB' }}>
                    <h4 style={{ fontSize: 14, fontWeight: 600, color: '#374151', margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
                      <FiFileText size={15} color="#F59E0B" />
                      Visto
                    </h4>
                    <div style={{ display: 'flex', gap: 24 }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#374151', cursor: 'pointer' }}>
                        <input type="checkbox" style={{ accentColor: '#4069FF' }} /> Visto Necessário
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#374151', cursor: 'pointer' }}>
                        <input type="checkbox" style={{ accentColor: '#4069FF' }} /> Suporte de Visto
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'travel' && (
                <div>
                  <h3 style={{ fontSize: 15, fontWeight: 600, color: '#111827', marginBottom: 20, marginTop: 0 }}>
                    Informação de Viagem
                  </h3>

                  <div style={{ marginBottom: 24 }}>
                    <h4 style={{ fontSize: 14, fontWeight: 600, color: '#374151', margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
                      <FiNavigation size={15} color="#3B82F6" />
                      Chegada
                    </h4>
                    <div className="form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px 20px' }}>
                      <FormField label="Data de Chegada" type="date" defaultValue={participant?.arrivalDate} />
                      <FormField label="Hora de Chegada" type="time" />
                      <FormField label="Voo de Chegada" placeholder="ex: TP1234" defaultValue={participant?.arrivalFlight} />
                      <FormField label="Aeroporto" placeholder="ex: LIS" />
                      <FormField label="Escalas" placeholder="Detalhes das escalas" style={{ gridColumn: '1 / -1' }} />
                    </div>
                  </div>

                  <div style={{ marginBottom: 24 }}>
                    <h4 style={{ fontSize: 14, fontWeight: 600, color: '#374151', margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
                      <FiTruck size={15} color="#8B5CF6" />
                      Transfer
                    </h4>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#374151', cursor: 'pointer', marginBottom: 12 }}>
                      <input type="checkbox" style={{ accentColor: '#4069FF' }} /> Transfer necessário
                    </label>
                    <div className="form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px 20px' }}>
                      <FormField label="Detalhes" placeholder="Detalhes do transfer" />
                      <div style={{ display: 'flex', gap: 12 }}>
                        <div style={{ flex: 1 }}><FormField label="Custo" type="number" placeholder="0.00" /></div>
                        <div style={{ width: 100 }}><FormField label="Moeda" placeholder="EUR" /></div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 style={{ fontSize: 14, fontWeight: 600, color: '#374151', margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
                      <FiSend size={15} color="#F97316" />
                      Partida
                    </h4>
                    <div className="form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px 20px' }}>
                      <FormField label="Data de Partida" type="date" />
                      <FormField label="Hora de Partida" type="time" />
                      <FormField label="Voo de Partida" placeholder="ex: TP5678" />
                      <FormField label="Aeroporto" placeholder="ex: LIS" />
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'accommodation' && (
                <div>
                  <h3 style={{ fontSize: 15, fontWeight: 600, color: '#111827', marginBottom: 20, marginTop: 0 }}>
                    Alojamento
                  </h3>
                  <div className="form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px 20px' }}>
                    <FormField label="Hotel" placeholder="Nome do hotel" defaultValue={participant?.hotel} />
                    <FormField label="Tipo de Quarto" placeholder="ex: Single, Double" />
                    <FormField label="Check-in" type="date" />
                    <FormField label="Check-out" type="date" />
                    <FormField label="Noites" type="number" placeholder="0" />
                    <div style={{ display: 'flex', gap: 12 }}>
                      <div style={{ flex: 1 }}><FormField label="Tarifa/Noite" type="number" placeholder="0.00" /></div>
                      <div style={{ width: 100 }}><FormField label="Moeda" placeholder="EUR" /></div>
                    </div>
                    <FormField label="Custo Total Alojamento" type="number" placeholder="0.00" />
                  </div>
                </div>
              )}

              {activeTab === 'financial' && (
                <div>
                  <h3 style={{ fontSize: 15, fontWeight: 600, color: '#111827', marginBottom: 20, marginTop: 0 }}>
                    Informação Financeira
                  </h3>
                  <div className="form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px 20px' }}>
                    <div style={{ display: 'flex', gap: 12 }}>
                      <div style={{ flex: 1 }}><FormField label="Tarifa do Bilhete" type="number" placeholder="0.00" /></div>
                      <div style={{ width: 100 }}><FormField label="Moeda" placeholder="EUR" /></div>
                    </div>
                    <div style={{ display: 'flex', gap: 12 }}>
                      <div style={{ flex: 1 }}><FormField label="Taxas / Extras" type="number" placeholder="0.00" /></div>
                      <div style={{ width: 100 }}><FormField label="Moeda" placeholder="EUR" /></div>
                    </div>
                    <div style={{ display: 'flex', gap: 12 }}>
                      <div style={{ flex: 1 }}><FormField label="Custo Total Viagem" type="number" placeholder="0.00" /></div>
                      <div style={{ width: 100 }}><FormField label="Moeda" placeholder="EUR" /></div>
                    </div>
                    <div>
                      <label htmlFor="payment-status" style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 6 }}>
                        Estado do Pagamento
                      </label>
                      <select id="payment-status" style={{
                        width: '100%', padding: '10px 12px', borderRadius: 8,
                        border: '1px solid #D1D5DB', fontSize: 14, color: '#374151',
                        backgroundColor: '#fff', outline: 'none',
                      }}
                      onFocus={e => e.target.style.boxShadow = '0 0 0 3px rgba(64, 105, 255, 0.1)'}
                      onBlur={e => e.target.style.boxShadow = 'none'}>
                        <option value="">Selecionar...</option>
                        <option value="PENDING">Pendente</option>
                        <option value="PAID">Pago</option>
                        <option value="PARTIAL">Parcial</option>
                      </select>
                    </div>
                    <FormField label="Referência de Reserva" placeholder="ex: ABC123" />
                    <FormField label="Agência de Reserva" placeholder="Nome da agência" />
                  </div>
                </div>
              )}

              {activeTab === 'dependents' && (
                <div>
                  <h3 style={{ fontSize: 15, fontWeight: 600, color: '#111827', marginBottom: 20, marginTop: 0 }}>
                    Acompanhantes
                  </h3>

                  <div style={{ padding: 16, backgroundColor: '#F0F9FF', borderRadius: 10, border: '1px solid #BAE6FD', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10 }}>
                    <FiAlertCircle size={16} color="#0369A1" style={{ flexShrink: 0 }} />
                    <p style={{ margin: 0, fontSize: 13, color: '#0369A1' }}>
                      Adicione os acompanhantes deste participante. Cada acompanhante pode ser classificado por faixa etária.
                    </p>
                  </div>

                  {/* Example dependent row */}
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: 14, backgroundColor: '#F9FAFB', borderRadius: 10,
                    border: '1px solid #E5E7EB', marginBottom: 10,
                  }}>
                    <div style={{ flex: 1 }}>
                      <input style={{
                        width: '100%', padding: '8px 12px', borderRadius: 6,
                        border: '1px solid #D1D5DB', fontSize: 13,
                      }} placeholder="Nome do acompanhante" />
                    </div>
                    <select style={{
                      padding: '8px 12px', borderRadius: 6,
                      border: '1px solid #D1D5DB', fontSize: 13, width: 140,
                    }}>
                      <option value="">Faixa etária</option>
                      <option value="baby">Bebé</option>
                      <option value="child">Criança</option>
                      <option value="adult">Adulto</option>
                    </select>
                    <button style={{
                      width: 32, height: 32, borderRadius: 6, border: 'none',
                      backgroundColor: '#FEE2E2', color: '#DC2626', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <FiX size={14} />
                    </button>
                  </div>

                  <button style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '10px 16px', borderRadius: 8,
                    border: '1px dashed #D1D5DB', backgroundColor: '#fff',
                    color: '#4069FF', fontSize: 13, fontWeight: 500,
                    cursor: 'pointer', width: '100%', justifyContent: 'center',
                  }}>
                    <FiPlus size={14} />
                    Adicionar Acompanhante
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Modal Footer */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '16px 28px', borderTop: '1px solid #E5E7EB',
            flexShrink: 0, backgroundColor: '#F9FAFB',
          }}>
            <p style={{ margin: 0, fontSize: 12, color: '#9CA3AF' }}>
              * Campos obrigatórios
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={handleClose} style={{
                padding: '10px 24px', borderRadius: 8,
                border: '1px solid #D1D5DB', backgroundColor: '#fff',
                fontSize: 14, fontWeight: 500, color: '#374151',
                cursor: 'pointer',
              }}>
                Cancelar
              </button>
              <button style={{
                padding: '10px 28px', borderRadius: 8, border: 'none',
                backgroundColor: '#4069FF', color: '#fff',
                fontSize: 14, fontWeight: 600, cursor: 'pointer',
                boxShadow: '0 1px 3px rgba(64, 105, 255, 0.3)',
              }}>
                {isEdit ? 'Guardar Alterações' : 'Adicionar Participante'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Unsaved Changes Dialog */}
      {showUnsavedWarning && (
        <UnsavedChangesDialog
          onDiscard={() => { setShowUnsavedWarning(false); onClose(); }}
          onCancel={() => setShowUnsavedWarning(false)}
        />
      )}
    </>
  );
};

ParticipantFormModal.propTypes = {
  isOpen: PropTypes.bool,
  onClose: PropTypes.func,
  participant: PropTypes.object,
  mode: PropTypes.string,
  availableRoles: PropTypes.array,
  onCreateRole: PropTypes.func,
  participantCounts: PropTypes.object,
};

// ---- Simple Form Field ----
const FormField = ({ label, type = 'text', placeholder, defaultValue, style: containerStyle }) => {
  const fieldId = `field-${label.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')}`;
  return (
  <div style={containerStyle}>
    <label htmlFor={fieldId} style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 6 }}>
      {label}
    </label>
    <input id={fieldId} type={type} placeholder={placeholder} defaultValue={defaultValue} style={{
      width: '100%', padding: '10px 12px', borderRadius: 8,
      border: '1px solid #D1D5DB', fontSize: 14, color: '#374151',
      outline: 'none', boxSizing: 'border-box',
      transition: 'border-color 0.15s, box-shadow 0.15s',
    }}
    onFocus={e => { e.target.style.borderColor = '#4069FF'; e.target.style.boxShadow = '0 0 0 3px rgba(64, 105, 255, 0.1)'; }}
    onBlur={e => { e.target.style.borderColor = '#D1D5DB'; e.target.style.boxShadow = 'none'; }}
    />
  </div>
  );
};

FormField.propTypes = {
  label: PropTypes.string,
  type: PropTypes.string,
  placeholder: PropTypes.string,
  defaultValue: PropTypes.string,
  style: PropTypes.object,
};

// ============================================================================
// COMPONENT: CreatableRoleSelect
// Searchable select with create, clear, keyboard navigation, participant counts
// ============================================================================
const CreatableRoleSelect = ({ value, onChange, roles, onCreateRole, participantCounts = {} }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0, width: 0 });
  const containerRef = useRef(null);
  const triggerRef = useRef(null);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
        setInputValue('');
        setHighlightedIndex(-1);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filteredRoles = useMemo(() => {
    if (!inputValue) return roles;
    const term = inputValue.toLowerCase();
    return roles.filter(r => r.name.toLowerCase().includes(term));
  }, [roles, inputValue]);

  const canCreate = useMemo(() => {
    if (!inputValue.trim()) return false;
    return !roles.some(r => r.name.toLowerCase() === inputValue.trim().toLowerCase());
  }, [roles, inputValue]);

  const totalItems = filteredRoles.length + (canCreate ? 1 : 0);

  // Scroll highlighted item into view
  useEffect(() => {
    if (highlightedIndex < 0 || !listRef.current) return;
    const items = listRef.current.querySelectorAll('[data-role-option]');
    items[highlightedIndex]?.scrollIntoView({ block: 'nearest' });
  }, [highlightedIndex]);

  const handleSelect = useCallback((roleName) => {
    onChange(roleName);
    setIsOpen(false);
    setInputValue('');
    setHighlightedIndex(-1);
  }, [onChange]);

  const handleCreate = useCallback(() => {
    const name = inputValue.trim();
    if (!name) return;
    onCreateRole(name);
    onChange(name);
    setIsOpen(false);
    setInputValue('');
    setHighlightedIndex(-1);
  }, [inputValue, onCreateRole, onChange]);

  const handleClear = useCallback((e) => {
    e.stopPropagation();
    onChange('');
  }, [onChange]);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (totalItems > 0) {
        setHighlightedIndex(prev => (prev + 1) % totalItems);
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (totalItems > 0) {
        setHighlightedIndex(prev => (prev - 1 + totalItems) % totalItems);
      }
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (highlightedIndex >= 0 && highlightedIndex < filteredRoles.length) {
        handleSelect(filteredRoles[highlightedIndex].name);
      } else if (highlightedIndex === filteredRoles.length && canCreate) {
        handleCreate();
      } else if (filteredRoles.length === 1) {
        handleSelect(filteredRoles[0].name);
      } else if (canCreate) {
        handleCreate();
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
      setInputValue('');
      setHighlightedIndex(-1);
    }
  }, [totalItems, highlightedIndex, filteredRoles, canCreate, handleSelect, handleCreate]);

  const selectedRole = roles.find(r => r.name === value);

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      <label htmlFor="role-select-input" style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 6 }}>
        Role *
      </label>

      {/* Trigger / Display */}
      <div
        ref={triggerRef}
        onClick={() => {
          if (triggerRef.current) {
            const rect = triggerRef.current.getBoundingClientRect();
            setDropdownPos({ top: rect.bottom + 4, left: rect.left, width: rect.width });
          }
          setIsOpen(true);
          setTimeout(() => inputRef.current?.focus(), 0);
        }}
        style={{
          width: '100%', padding: '8px 12px', borderRadius: 8,
          border: `1px solid ${isOpen ? '#4069FF' : '#D1D5DB'}`,
          fontSize: 14, color: '#374151', backgroundColor: '#fff',
          cursor: 'pointer', display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', minHeight: 42,
          transition: 'border-color 0.15s',
        }}
      >
        {isOpen ? (
          <input
            id="role-select-input"
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={e => { setInputValue(e.target.value); setHighlightedIndex(-1); }}
            onKeyDown={handleKeyDown}
            placeholder={value || 'Pesquisar ou criar role...'}
            style={{
              border: 'none', outline: 'none', fontSize: 14, color: '#374151',
              width: '100%', backgroundColor: 'transparent',
              fontFamily: 'inherit',
              transition: 'box-shadow 0.15s',
            }}
            onFocus={e => e.target.style.boxShadow = '0 0 0 3px rgba(64, 105, 255, 0.1)'}
            onBlur={e => e.target.style.boxShadow = 'none'}
          />
        ) : (
          <span style={{ color: value ? '#374151' : '#9CA3AF' }}>
            {value ? (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <span style={{
                  width: 8, height: 8, borderRadius: '50%',
                  backgroundColor: selectedRole?.style?.dot || '#9CA3AF',
                }} />
                {value}
              </span>
            ) : 'Selecionar role...'}
          </span>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: 2, flexShrink: 0, marginLeft: 8 }}>
          {/* Clear button */}
          {value && !isOpen && (
            <span
              onClick={handleClear}
              style={{
                width: 20, height: 20, borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', color: '#9CA3AF',
                transition: 'color 0.15s, background-color 0.15s',
              }}
              onMouseOver={e => { e.currentTarget.style.color = '#374151'; e.currentTarget.style.backgroundColor = '#F3F4F6'; }}
              onMouseOut={e => { e.currentTarget.style.color = '#9CA3AF'; e.currentTarget.style.backgroundColor = 'transparent'; }}
            >
              <FiX size={12} />
            </span>
          )}
          <FiChevronDown
            size={14}
            color="#9CA3AF"
            style={{
              transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 0.15s',
            }}
          />
        </div>
      </div>

      {/* Dropdown — fixed position to escape overflow:auto clipping */}
      {isOpen && (
        <div ref={listRef} role="listbox" style={{
          position: 'fixed', top: dropdownPos.top, left: dropdownPos.left,
          width: dropdownPos.width,
          backgroundColor: '#fff', borderRadius: 10,
          border: '1px solid #E5E7EB',
          boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.05)',
          zIndex: 9999, maxHeight: 260, overflowY: 'auto',
          animation: 'fadeIn 0.12s ease-out',
        }}>
          {filteredRoles.length > 0 && (
            <div style={{ padding: '6px 0' }}>
              <div style={{
                padding: '4px 12px', fontSize: 10, fontWeight: 600,
                color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.05em',
              }}>
                Roles existentes
              </div>
              {filteredRoles.map((role, index) => {
                const isHighlighted = index === highlightedIndex;
                const isSelected = role.name === value;
                const count = participantCounts[role.name] || 0;
                return (
                  <div
                    key={role.name}
                    data-role-option
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => handleSelect(role.name)}
                    onMouseEnter={() => setHighlightedIndex(index)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '9px 12px', cursor: 'pointer',
                      backgroundColor: isHighlighted ? '#F0F4FF' : (isSelected ? '#F8FAFF' : 'transparent'),
                      transition: 'background-color 0.1s',
                    }}
                  >
                    <span style={{
                      width: 8, height: 8, borderRadius: '50%',
                      backgroundColor: role.style.dot, flexShrink: 0,
                    }} />
                    <span style={{ fontSize: 13, fontWeight: isSelected ? 600 : 400, color: '#374151' }}>
                      {role.name}
                    </span>
                    {count > 0 && (
                      <span style={{ fontSize: 11, color: '#9CA3AF' }}>
                        ({count})
                      </span>
                    )}
                    {isSelected && (
                      <FiCheck size={14} color="#4069FF" style={{ marginLeft: 'auto' }} />
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Create new role option */}
          {canCreate && (
            <>
              {filteredRoles.length > 0 && (
                <div style={{ height: 1, backgroundColor: '#E5E7EB', margin: '2px 0' }} />
              )}
              <div
                data-role-option
                onClick={handleCreate}
                onMouseEnter={() => setHighlightedIndex(filteredRoles.length)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '10px 12px', cursor: 'pointer',
                  backgroundColor: highlightedIndex === filteredRoles.length ? '#F0FFF4' : 'transparent',
                  transition: 'background-color 0.1s',
                }}
              >
                <span style={{
                  width: 20, height: 20, borderRadius: 6, backgroundColor: '#ECFDF5',
                  color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  <FiPlus size={12} />
                </span>
                <span style={{ fontSize: 13, color: '#059669', fontWeight: 500 }}>
                  Criar &quot;<span style={{ fontWeight: 700 }}>{inputValue.trim()}</span>&quot;
                </span>
              </div>
            </>
          )}

          {filteredRoles.length === 0 && !canCreate && (
            <div style={{ padding: '16px 12px', textAlign: 'center', fontSize: 13, color: '#9CA3AF' }}>
              Nenhuma role encontrada
            </div>
          )}
        </div>
      )}
    </div>
  );
};

CreatableRoleSelect.propTypes = {
  value: PropTypes.string,
  onChange: PropTypes.func,
  roles: PropTypes.arrayOf(PropTypes.shape({
    name: PropTypes.string,
    style: PropTypes.object,
  })),
  onCreateRole: PropTypes.func,
  participantCounts: PropTypes.object,
};

// ============================================================================
// SAMPLE DATA: Events (simulates useEventsList)
// ============================================================================
const SAMPLE_EVENTS = [
  { id: 'evt-1', eventTitle: 'Conferência Tech 2026', eventStartDate: '2026-03-15', eventStatus: 'ACTIVE', location: 'Lisboa, Portugal' },
  { id: 'evt-2', eventTitle: 'Summit de Inovação', eventStartDate: '2026-04-20', eventStatus: 'DRAFT', location: 'Porto, Portugal' },
  { id: 'evt-3', eventTitle: 'Gala Anual 2025', eventStartDate: '2025-12-10', eventStatus: 'COMPLETED', location: 'Faro, Portugal' },
];

// ============================================================================
// COMPONENT: EventStatusDot
// ============================================================================
const EventStatusDot = ({ status }) => {
  const colors = {
    ACTIVE: '#10B981',
    DRAFT: '#F59E0B',
    COMPLETED: '#9CA3AF',
  };
  return (
    <span style={{
      width: 8, height: 8, borderRadius: '50%',
      backgroundColor: colors[status] || '#9CA3AF',
      flexShrink: 0,
    }} />
  );
};

EventStatusDot.propTypes = {
  status: PropTypes.string,
};

// ============================================================================
// MAIN COMPONENT: ParticipantsArchitecture
// ============================================================================
export default function ParticipantsArchitecture() {
  const [selectedIds, setSelectedIds] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingParticipant, setEditingParticipant] = useState(null);
  const [detailParticipant, setDetailParticipant] = useState(null);

  // Event selection state (simulates Redux selectedEventId)
  const [selectedEventId, setSelectedEventId] = useState('evt-1');
  const selectedEvent = SAMPLE_EVENTS.find(e => e.id === selectedEventId);

  // Dynamic role management
  const [roleStyles, setRoleStyles] = useState(DEFAULT_ROLE_STYLES);
  const availableRoles = useMemo(() =>
    Object.entries(roleStyles).map(([name, style]) => ({ name, style })),
    [roleStyles]
  );

  const handleCreateRole = useCallback((name) => {
    setRoleStyles(prev => {
      if (prev[name]) return prev;
      return { ...prev, [name]: generateRoleStyle(name) };
    });
  }, []);

  // Role filter
  const [activeRoleFilter, setActiveRoleFilter] = useState(null);

  // Sorting
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });

  const requestSort = useCallback((key) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  }, []);

  // Participant counts per role (for CreatableRoleSelect + filter chips)
  const roleCounts = useMemo(() => {
    const counts = {};
    SAMPLE_PARTICIPANTS.forEach(p => {
      counts[p.role.name] = (counts[p.role.name] || 0) + 1;
    });
    return counts;
  }, []);

  // Filter: search + role
  const filteredParticipants = useMemo(() => {
    let result = SAMPLE_PARTICIPANTS;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(p =>
        p.participantName.toLowerCase().includes(term) ||
        p.participantEmail.toLowerCase().includes(term) ||
        p.organization?.toLowerCase().includes(term)
      );
    }
    if (activeRoleFilter) {
      result = result.filter(p => p.role.name === activeRoleFilter);
    }
    return result;
  }, [searchTerm, activeRoleFilter]);

  // Sort
  const sortedParticipants = useMemo(() => {
    if (!sortConfig.key) return filteredParticipants;
    return [...filteredParticipants].sort((a, b) => {
      let aVal, bVal;
      switch (sortConfig.key) {
        case 'name':
          aVal = a.participantName.toLowerCase();
          bVal = b.participantName.toLowerCase();
          break;
        case 'email':
          aVal = a.participantEmail.toLowerCase();
          bVal = b.participantEmail.toLowerCase();
          break;
        case 'role':
          aVal = a.role.name.toLowerCase();
          bVal = b.role.name.toLowerCase();
          break;
        case 'status':
          aVal = a.participantStatus;
          bVal = b.participantStatus;
          break;
        case 'organization':
          aVal = (a.organization || '').toLowerCase();
          bVal = (b.organization || '').toLowerCase();
          break;
        case 'date':
          aVal = a.registrationDate;
          bVal = b.registrationDate;
          break;
        default:
          return 0;
      }
      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredParticipants, sortConfig]);

  const toggleSelection = (id) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const toggleSelectAll = () => {
    setSelectedIds(prev =>
      prev.length === sortedParticipants.length ? [] : sortedParticipants.map(p => p.id)
    );
  };

  return (
    <div className="participants-page" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', backgroundColor: '#F3F4F6', minHeight: '100vh', padding: 24 }}>

      {/* ================================================================ */}
      {/* COMPACT PAGE HEADER + EVENT SELECTOR                            */}
      {/* ================================================================ */}
      <div style={{ marginBottom: 20 }}>
        {/* Title row */}
        <div style={{ marginBottom: 16 }}>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: '#111827' }}>
            Participantes
          </h1>
          <p style={{ margin: '4px 0 0', fontSize: 14, color: '#6B7280' }}>
            Gerir participantes do evento
          </p>
        </div>

        {/* Inline Event Selector — wraps on mobile */}
        <div className="event-selector-row" style={{
          display: 'flex', alignItems: 'center', gap: 12,
          flexWrap: 'wrap',
        }}>
          <label htmlFor="event-selector" style={{
            fontSize: 13, fontWeight: 500, color: '#6B7280',
            whiteSpace: 'nowrap',
          }}>
            Evento
          </label>
          <div className="event-select-wrapper" style={{ position: 'relative', flex: 1, maxWidth: 440, minWidth: 200 }}>
            <select
              id="event-selector"
              value={selectedEventId}
              onChange={e => setSelectedEventId(e.target.value)}
              style={{
                width: '100%', padding: '9px 36px 9px 14px',
                borderRadius: 10, border: '1px solid #D1D5DB',
                fontSize: 14, color: '#374151',
                backgroundColor: '#fff', cursor: 'pointer',
                appearance: 'none', outline: 'none',
                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%239CA3AF' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'right 12px center',
                transition: 'border-color 0.15s, box-shadow 0.15s',
              }}
              onFocus={e => { e.target.style.borderColor = '#4069FF'; e.target.style.boxShadow = '0 0 0 3px rgba(64, 105, 255, 0.1)'; }}
              onBlur={e => { e.target.style.borderColor = '#D1D5DB'; e.target.style.boxShadow = 'none'; }}
            >
              <option value="" disabled>Selecionar evento...</option>
              {SAMPLE_EVENTS.map(evt => (
                <option key={evt.id} value={evt.id}>
                  {evt.eventTitle} — {new Date(evt.eventStartDate).toLocaleDateString('pt-PT')}
                  {evt.eventStatus === 'ACTIVE' ? ' (Ativo)' : ''}
                </option>
              ))}
            </select>
          </div>
          {/* Active event indicator */}
          {selectedEvent && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '5px 12px', borderRadius: 20,
              backgroundColor: selectedEvent.eventStatus === 'ACTIVE' ? '#ECFDF5' : '#F9FAFB',
              border: `1px solid ${selectedEvent.eventStatus === 'ACTIVE' ? '#A7F3D0' : '#E5E7EB'}`,
            }}>
              <EventStatusDot status={selectedEvent.eventStatus} />
              <span style={{
                fontSize: 12, fontWeight: 500,
                color: selectedEvent.eventStatus === 'ACTIVE' ? '#065F46' : '#6B7280',
              }}>
                {selectedEvent.eventStatus === 'ACTIVE' ? 'Ativo' :
                 selectedEvent.eventStatus === 'DRAFT' ? 'Rascunho' : 'Concluído'}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Main Card — Table */}
      <div className="table-card" style={{
        backgroundColor: '#fff', borderRadius: 16,
        boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
        overflow: 'hidden', display: 'flex', flexDirection: 'column',
        height: 'calc(100vh - 170px)',
      }}>

        {/* Table Toolbar — responsive: wraps on mobile */}
        <div className="table-toolbar" style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '12px 24px', borderBottom: '1px solid #E5E7EB',
          flexShrink: 0, flexWrap: 'wrap', gap: 10,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{
              padding: '3px 12px', borderRadius: 20,
              backgroundColor: '#EEF2FF', color: '#4069FF',
              fontSize: 12, fontWeight: 600,
            }}>
              {filteredParticipants.length} participantes
            </span>
            {filteredParticipants.length !== SAMPLE_PARTICIPANTS.length && (
              <span style={{ fontSize: 12, color: '#9CA3AF' }}>
                de {SAMPLE_PARTICIPANTS.length} total
              </span>
            )}
          </div>

          <div className="toolbar-actions" style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            {/* Search */}
            <div className="search-wrapper" style={{ position: 'relative' }}>
              <FiSearch size={14} color="#6B7280" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type="text"
                placeholder="Pesquisar..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="search-input"
                style={{
                  padding: '8px 12px 8px 34px', borderRadius: 8,
                  border: '1px solid #E5E7EB', fontSize: 13, width: 200,
                  outline: 'none',
                  transition: 'border-color 0.15s, box-shadow 0.15s',
                }}
                onFocus={e => { e.target.style.borderColor = '#4069FF'; e.target.style.boxShadow = '0 0 0 3px rgba(64, 105, 255, 0.1)'; }}
                onBlur={e => { e.target.style.borderColor = '#E5E7EB'; e.target.style.boxShadow = 'none'; }}
              />
            </div>

            {/* Filter Button */}
            <button className="toolbar-btn" style={{
              padding: '8px 14px', borderRadius: 8,
              border: '1px solid #E5E7EB', backgroundColor: '#fff',
              fontSize: 13, color: '#374151', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 6,
            }}>
              <FiFilter size={14} color="#8B5CF6" />
              <span className="toolbar-btn-label">Filtros</span>
            </button>

            {/* Import Button */}
            <button className="toolbar-btn" style={{
              padding: '8px 14px', borderRadius: 8,
              border: '1px solid #E5E7EB', backgroundColor: '#fff',
              fontSize: 13, color: '#374151', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 6,
            }}>
              <FiUpload size={14} color="#3B82F6" />
              <span className="toolbar-btn-label">Importar</span>
            </button>

            {/* Export Button */}
            <button className="toolbar-btn" style={{
              padding: '8px 14px', borderRadius: 8,
              border: '1px solid #E5E7EB', backgroundColor: '#fff',
              fontSize: 13, color: '#374151', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 6,
            }}>
              <FiDownload size={14} color="#10B981" />
              <span className="toolbar-btn-label">Exportar</span>
            </button>

            {/* Add Participant Button */}
            <button onClick={() => setIsAddModalOpen(true)} style={{
              padding: '8px 18px', borderRadius: 8, border: 'none',
              backgroundColor: '#4069FF', color: '#fff',
              fontSize: 13, fontWeight: 600, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 6,
              boxShadow: '0 1px 3px rgba(64, 105, 255, 0.3)',
            }}>
              <FiPlus size={16} />
              <span className="toolbar-btn-label">Adicionar</span>
            </button>
          </div>
        </div>

        {/* Role Filter Chips */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '10px 24px', borderBottom: '1px solid #F3F4F6',
          flexShrink: 0, overflowX: 'auto',
        }}>
          <button
            onClick={() => setActiveRoleFilter(null)}
            style={{
              padding: '5px 14px', borderRadius: 20, border: 'none',
              backgroundColor: !activeRoleFilter ? '#4069FF' : '#F3F4F6',
              color: !activeRoleFilter ? '#fff' : '#374151',
              fontSize: 12, fontWeight: 500, cursor: 'pointer',
              whiteSpace: 'nowrap', transition: 'background-color 0.15s, color 0.15s',
            }}
          >
            Todos ({SAMPLE_PARTICIPANTS.length})
          </button>
          {availableRoles.map(role => {
            const count = roleCounts[role.name] || 0;
            if (count === 0) return null;
            const isActive = activeRoleFilter === role.name;
            return (
              <button
                key={role.name}
                onClick={() => setActiveRoleFilter(isActive ? null : role.name)}
                style={{
                  padding: '5px 14px', borderRadius: 20, border: 'none',
                  backgroundColor: isActive ? role.style.dot : '#F3F4F6',
                  color: isActive ? '#fff' : '#374151',
                  fontSize: 12, fontWeight: 500, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 6,
                  whiteSpace: 'nowrap', transition: 'background-color 0.15s, color 0.15s',
                }}
              >
                {!isActive && <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: role.style.dot }} />}
                {role.name} ({count})
              </button>
            );
          })}
        </div>

        {/* Selected Actions Bar */}
        {selectedIds.length > 0 && (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '10px 24px', backgroundColor: '#EEF2FF',
            borderBottom: '1px solid #C7D2FE',
            flexShrink: 0, animation: 'fadeIn 0.15s',
          }}>
            <span style={{ fontSize: 13, fontWeight: 500, color: '#4338CA' }}>
              {selectedIds.length} selecionado(s)
            </span>
            <div style={{ display: 'flex', gap: 8 }}>
              <button style={{
                padding: '6px 14px', borderRadius: 6, border: '1px solid #C7D2FE',
                backgroundColor: '#fff', fontSize: 12, fontWeight: 500, color: '#4338CA', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 5,
              }}>
                <FiMail size={12} color="#4338CA" /> Enviar Email
              </button>
              {selectedIds.length === 1 && (
                <button onClick={() => {
                  const p = SAMPLE_PARTICIPANTS.find(x => x.id === selectedIds[0]);
                  setEditingParticipant(p);
                }} style={{
                  padding: '6px 14px', borderRadius: 6, border: '1px solid #C7D2FE',
                  backgroundColor: '#fff', fontSize: 12, fontWeight: 500, color: '#4338CA', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 5,
                }}>
                  <FiEdit2 size={12} color="#4338CA" /> Editar
                </button>
              )}
              <button style={{
                padding: '6px 14px', borderRadius: 6, border: '1px solid #FCA5A5',
                backgroundColor: '#FEF2F2', fontSize: 12, fontWeight: 500, color: '#DC2626', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 5,
              }}>
                <FiTrash2 size={12} color="#DC2626" /> Eliminar
              </button>
            </div>
          </div>
        )}

        {/* Table — horizontal scroll on mobile */}
        <div style={{ flex: 1, overflow: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 800 }}>
            <thead style={{ position: 'sticky', top: 0, zIndex: 1 }}>
              <tr style={{ backgroundColor: '#F9FAFB', borderBottom: '1px solid #E5E7EB' }}>
                <th style={{ width: 44, padding: '12px 8px 12px 24px' }}>
                  <input
                    type="checkbox"
                    checked={selectedIds.length === sortedParticipants.length && sortedParticipants.length > 0}
                    onChange={toggleSelectAll}
                    style={{ width: 16, height: 16, cursor: 'pointer', accentColor: '#4069FF' }}
                  />
                </th>
                <SortableHeader label="Participante" sortKey="name" sortConfig={sortConfig} onSort={requestSort} />
                <SortableHeader label="Email" sortKey="email" sortConfig={sortConfig} onSort={requestSort} />
                <SortableHeader label="Role" sortKey="role" sortConfig={sortConfig} onSort={requestSort} />
                <SortableHeader label="Status" sortKey="status" sortConfig={sortConfig} onSort={requestSort} />
                <SortableHeader label="Organização" sortKey="organization" sortConfig={sortConfig} onSort={requestSort} />
                <SortableHeader label="Registo" sortKey="date" sortConfig={sortConfig} onSort={requestSort} />
                <th style={{ width: 40, padding: '12px 16px' }}></th>
              </tr>
            </thead>
            <tbody>
              {sortedParticipants.map(participant => {
                const isSelected = selectedIds.includes(participant.id);
                return (
                  <tr
                    key={participant.id}
                    className="participant-row"
                    style={{
                      borderBottom: '1px solid #F3F4F6',
                      backgroundColor: isSelected ? '#EEF2FF' : '#fff',
                      cursor: 'pointer',
                      transition: 'background-color 0.15s',
                    }}
                    onMouseOver={e => { if (!isSelected) e.currentTarget.style.backgroundColor = '#F9FAFB'; }}
                    onMouseOut={e => { if (!isSelected) e.currentTarget.style.backgroundColor = '#fff'; }}
                    onClick={() => setDetailParticipant(participant)}
                  >
                    <td style={{ padding: '12px 8px 12px 24px' }} onClick={e => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelection(participant.id)}
                        style={{ width: 16, height: 16, cursor: 'pointer', accentColor: '#4069FF' }}
                      />
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <ParticipantAvatar participant={participant} size={34} />
                        <div>
                          <div style={{ fontWeight: 500, color: '#111827', fontSize: 13 }}>
                            {participant.participantName}
                          </div>
                          <div style={{ fontSize: 12, color: '#9CA3AF', marginTop: 1 }}>
                            {participant.participantJob || '—'}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '12px 16px', color: '#6B7280' }}>
                      {participant.participantEmail}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <RoleBadge roleName={participant.role.name} roleStyles={roleStyles} />
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <StatusBadge status={participant.participantStatus} />
                    </td>
                    <td style={{ padding: '12px 16px', color: '#6B7280' }}>
                      {participant.organization || '—'}
                    </td>
                    <td style={{ padding: '12px 16px', color: '#9CA3AF', fontSize: 12 }}>
                      {new Date(participant.registrationDate).toLocaleDateString('pt-PT')}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <FiChevronRight
                        size={16}
                        color="#9CA3AF"
                        className="row-chevron"
                        style={{ transition: 'transform 0.15s, color 0.15s' }}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Empty State */}
          {sortedParticipants.length === 0 && (
            <div style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              justifyContent: 'center', padding: '64px 24px',
            }}>
              <div style={{
                width: 64, height: 64, borderRadius: '50%',
                backgroundColor: '#EEF2FF', display: 'flex',
                alignItems: 'center', justifyContent: 'center', marginBottom: 16,
              }}>
                <FiUsers size={28} color="#6366F1" />
              </div>
              <h3 style={{ margin: '0 0 4px', fontSize: 15, fontWeight: 600, color: '#374151' }}>
                Nenhum participante encontrado
              </h3>
              <p style={{ margin: 0, fontSize: 13, color: '#9CA3AF', textAlign: 'center', maxWidth: 300 }}>
                {searchTerm || activeRoleFilter
                  ? 'Tente ajustar os filtros ou o termo de pesquisa.'
                  : 'Adicione o primeiro participante ao evento.'}
              </p>
            </div>
          )}
        </div>

        {/* Table Footer */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '12px 24px', borderTop: '1px solid #E5E7EB',
          flexShrink: 0, backgroundColor: '#F9FAFB',
        }}>
          <span style={{ fontSize: 12, color: '#9CA3AF' }}>
            A mostrar {sortedParticipants.length} de {SAMPLE_PARTICIPANTS.length} participantes
          </span>
        </div>
      </div>

      {/* Detail Side Panel */}
      {detailParticipant && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 40,
          display: 'flex', justifyContent: 'flex-end',
        }}>
          <div
            style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.3)' }}
            onClick={() => setDetailParticipant(null)}
          />
          <div style={{
            width: 460, maxWidth: '90vw', backgroundColor: '#fff',
            boxShadow: '-4px 0 24px rgba(0,0,0,0.1)',
            display: 'flex', flexDirection: 'column',
            animation: 'slideInRight 0.25s ease-out',
          }}>
            {/* Detail Header */}
            <div style={{
              padding: '24px 24px 20px', borderBottom: '1px solid #E5E7EB',
              flexShrink: 0,
            }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', gap: 16 }}>
                  <ParticipantAvatar participant={detailParticipant} size={52} />
                  <div>
                    <h3 style={{ margin: 0, fontSize: 18, fontWeight: 600, color: '#111827' }}>
                      {detailParticipant.participantName}
                    </h3>
                    <p style={{ margin: '2px 0 8px', fontSize: 13, color: '#6B7280' }}>
                      {detailParticipant.participantJob} · {detailParticipant.organization}
                    </p>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <RoleBadge roleName={detailParticipant.role.name} roleStyles={roleStyles} />
                      <StatusBadge status={detailParticipant.participantStatus} />
                    </div>
                  </div>
                </div>
                <button onClick={() => setDetailParticipant(null)} style={{
                  width: 32, height: 32, borderRadius: 8, border: 'none',
                  backgroundColor: '#F3F4F6', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#6B7280',
                }}>
                  <FiX size={16} />
                </button>
              </div>
            </div>

            {/* Detail Body */}
            <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
              <DetailSection title="Contacto">
                <DetailRow Icon={FiMail} label="Email" value={detailParticipant.participantEmail} iconColor="#3B82F6" />
                <DetailRow Icon={FiPhone} label="Telefone" value={detailParticipant.participantPhone} iconColor="#10B981" />
              </DetailSection>

              <DetailSection title="Informação Pessoal">
                <DetailRow Icon={FiBriefcase} label="Organização" value={detailParticipant.organization} iconColor="#8B5CF6" />
                <DetailRow Icon={FiUser} label="Cargo" value={detailParticipant.participantJob} iconColor="#F59E0B" />
                <DetailRow Icon={FiGlobe} label="Nacionalidade" value={detailParticipant.nationality} iconColor="#06B6D4" />
                <DetailRow Icon={FiUsers} label="Acompanhantes" value={`${detailParticipant.dependentsCount}`} iconColor="#EC4899" />
              </DetailSection>

              {(detailParticipant.hotel || detailParticipant.arrivalFlight) && (
                <DetailSection title="Logística">
                  {detailParticipant.arrivalDate && <DetailRow Icon={FiNavigation} label="Chegada" value={`${detailParticipant.arrivalDate} · ${detailParticipant.arrivalFlight}`} iconColor="#F97316" />}
                  {detailParticipant.hotel && <DetailRow Icon={FiHome} label="Hotel" value={detailParticipant.hotel} iconColor="#6366F1" />}
                </DetailSection>
              )}
            </div>

            {/* Detail Footer */}
            <div style={{
              padding: '16px 24px', borderTop: '1px solid #E5E7EB',
              display: 'flex', gap: 10, flexShrink: 0,
            }}>
              <button onClick={() => {
                setEditingParticipant(detailParticipant);
                setDetailParticipant(null);
              }} style={{
                flex: 1, padding: '10px 0', borderRadius: 8, border: 'none',
                backgroundColor: '#4069FF', color: '#fff',
                fontSize: 13, fontWeight: 600, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              }}>
                <FiEdit2 size={14} />
                Editar Participante
              </button>
              <button style={{
                padding: '10px 16px', borderRadius: 8,
                border: '1px solid #E5E7EB', backgroundColor: '#fff',
                fontSize: 13, color: '#374151', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <FiMail size={14} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Participant Modal */}
      <ParticipantFormModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        mode="create"
        availableRoles={availableRoles}
        onCreateRole={handleCreateRole}
        roleStyles={roleStyles}
        participantCounts={roleCounts}
      />

      {/* Edit Participant Modal */}
      <ParticipantFormModal
        isOpen={!!editingParticipant}
        onClose={() => setEditingParticipant(null)}
        participant={editingParticipant}
        mode="edit"
        availableRoles={availableRoles}
        onCreateRole={handleCreateRole}
        roleStyles={roleStyles}
        participantCounts={roleCounts}
      />

      {/* CSS Animations + Row hover + Responsive */}
      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes scaleIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
        @keyframes slideInRight { from { transform: translateX(100%); } to { transform: translateX(0); } }
        * { box-sizing: border-box; }
        input[type="checkbox"] { border-radius: 3px; }
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #D1D5DB; border-radius: 3px; }
        ::-webkit-scrollbar-thumb:hover { background: #9CA3AF; }
        .participant-row:hover .row-chevron {
          transform: translateX(3px);
          color: #6B7280 !important;
        }

        /* ---- Tablet (<1024px) ---- */
        @media (max-width: 1024px) {
          .participants-page { padding: 16px !important; }
          .table-card { height: calc(100vh - 160px) !important; border-radius: 12px !important; }
          .search-input { width: 160px !important; }
          .toolbar-btn-label { display: none; }
          .toolbar-btn { padding: 8px 10px !important; }

          /* Modal — wider on tablet */
          .modal-container { width: 92vw !important; max-width: 900px !important; height: 90vh !important; }
          .modal-sidebar { width: 180px !important; }
        }

        /* ---- Mobile (<640px) ---- */
        @media (max-width: 640px) {
          .participants-page { padding: 12px !important; }

          /* Event selector stacks vertically */
          .event-selector-row { flex-direction: column !important; align-items: stretch !important; gap: 8px !important; }
          .event-select-wrapper { max-width: 100% !important; }

          /* Table card fills screen */
          .table-card { height: calc(100vh - 200px) !important; border-radius: 10px !important; }

          /* Toolbar stacks */
          .table-toolbar { padding: 10px 16px !important; }
          .toolbar-actions { width: 100%; justify-content: space-between; }
          .search-wrapper { flex: 1; }
          .search-input { width: 100% !important; }

          /* Detail panel fullscreen */
          .detail-panel { width: 100vw !important; max-width: 100vw !important; }

          /* Modal — fullscreen on mobile */
          .modal-container {
            width: 100vw !important; max-width: 100vw !important;
            height: 100vh !important; max-height: 100vh !important;
            border-radius: 0 !important;
          }
          .modal-header { padding: 16px 20px !important; }

          /* Sidebar becomes horizontal top tabs (icon-only) */
          .modal-body { flex-direction: column !important; }
          .modal-sidebar {
            width: 100% !important; flex-direction: row !important;
            display: flex !important; overflow-x: auto !important;
            overflow-y: hidden !important;
            border-right: none !important; border-bottom: 1px solid #E5E7EB !important;
            padding: 8px 12px !important; gap: 4px;
          }
          .modal-sidebar button { flex-shrink: 0 !important; width: auto !important; min-width: auto !important; padding: 8px 10px !important; margin-bottom: 0 !important; }
          .tab-label { display: none; }

          /* Content area — more compact padding */
          .modal-content { padding: 16px 20px !important; }

          /* Form grids go single column */
          .form-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}

// ---- Helper components for detail panel ----
const DetailSection = ({ title, children }) => (
  <div style={{ marginBottom: 24 }}>
    <h4 style={{
      margin: '0 0 12px', fontSize: 12, fontWeight: 600,
      color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.05em',
    }}>{title}</h4>
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {children}
    </div>
  </div>
);

DetailSection.propTypes = {
  title: PropTypes.string,
  children: PropTypes.node,
};

const DetailRow = ({ Icon, label, value, iconColor = '#9CA3AF' }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
    <span style={{
      width: 28, height: 28, borderRadius: 6, display: 'flex',
      alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      backgroundColor: iconColor + '18', color: iconColor,
    }}>
      <Icon size={14} />
    </span>
    <div>
      <div style={{ fontSize: 11, color: '#9CA3AF' }}>{label}</div>
      <div style={{ fontSize: 13, color: '#374151', fontWeight: 500 }}>{value || '—'}</div>
    </div>
  </div>
);

DetailRow.propTypes = {
  Icon: PropTypes.elementType,
  label: PropTypes.string,
  value: PropTypes.string,
  iconColor: PropTypes.string,
};
