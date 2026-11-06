/**
 * @file RolePermissionsInfo.jsx
 * @description Modal component that displays detailed permissions for each role
 * Uses tinted section headers with colored dots matching the team tab visual language
 */

import { useState, memo } from 'react';
import PropTypes from 'prop-types';
import { FiCheck, FiShield, FiChevronDown, FiInfo } from 'react-icons/fi';
import Modal from '../UI/Modal';
import { Card, Text, Badge } from '../UI';
import {
  ROLE_DISPLAY_NAMES,
  ROLE_DOT_COLORS,
  ROLE_BG_TINTS,
  ROLE_BADGE_VARIANTS,
  getRolePermissions,
  EVENT_PERMISSIONS,
} from '../../Utils/eventRolesConfig';

/**
 * Permission labels for UI display
 */
const PERMISSION_LABELS = {
  [EVENT_PERMISSIONS.EVENT_VIEW_BASIC]: 'Ver informações básicas do evento',
  [EVENT_PERMISSIONS.EVENT_VIEW_DETAILS]: 'Ver detalhes completos do evento',
  [EVENT_PERMISSIONS.EVENT_EDIT]: 'Editar detalhes do evento',
  [EVENT_PERMISSIONS.EVENT_DELETE]: 'Eliminar evento',
  [EVENT_PERMISSIONS.PARTICIPANT_VIEW]: 'Ver participantes',
  [EVENT_PERMISSIONS.PARTICIPANT_CREATE]: 'Adicionar participantes',
  [EVENT_PERMISSIONS.PARTICIPANT_EDIT]: 'Editar participantes',
  [EVENT_PERMISSIONS.PARTICIPANT_DELETE]: 'Eliminar participantes',
  [EVENT_PERMISSIONS.PARTICIPANT_CHECKIN]: 'Fazer check-in de participantes',
  [EVENT_PERMISSIONS.SUPPLIER_VIEW]: 'Ver fornecedores',
  [EVENT_PERMISSIONS.SUPPLIER_CREATE]: 'Adicionar fornecedores',
  [EVENT_PERMISSIONS.SUPPLIER_EDIT]: 'Editar fornecedores',
  [EVENT_PERMISSIONS.SUPPLIER_DELETE]: 'Eliminar fornecedores',
  [EVENT_PERMISSIONS.SUPPLIER_SELECT]: 'Selecionar fornecedores',
  [EVENT_PERMISSIONS.SUPPLIER_APPROVE]: 'Aprovar fornecedores',
  [EVENT_PERMISSIONS.DOCUMENT_VIEW_OWN]: 'Ver próprios documentos',
  [EVENT_PERMISSIONS.DOCUMENT_VIEW_SHARED]: 'Ver documentos partilhados',
  [EVENT_PERMISSIONS.DOCUMENT_VIEW_ALL]: 'Ver todos os documentos',
  [EVENT_PERMISSIONS.DOCUMENT_CREATE]: 'Criar documentos',
  [EVENT_PERMISSIONS.DOCUMENT_EDIT]: 'Editar documentos',
  [EVENT_PERMISSIONS.DOCUMENT_DELETE]: 'Eliminar documentos',
  [EVENT_PERMISSIONS.FINANCIAL_VIEW]: 'Ver informações financeiras',
  [EVENT_PERMISSIONS.FINANCIAL_EDIT]: 'Editar informações financeiras',
  [EVENT_PERMISSIONS.EMAIL_SEND]: 'Enviar emails',
  [EVENT_PERMISSIONS.AI_USE]: 'Usar assistente AI',
  [EVENT_PERMISSIONS.TEAM_INVITE_STAFF]: 'Convidar Staff',
  [EVENT_PERMISSIONS.TEAM_INVITE_COMANAGER]: 'Convidar Co-Organizador',
  [EVENT_PERMISSIONS.TEAM_REMOVE]: 'Remover membros da equipa',
  [EVENT_PERMISSIONS.TEAM_SHARE_FOLDER]: 'Partilhar pastas',
};

/**
 * Permission categories for better organization
 */
const PERMISSION_CATEGORIES = {
  'Evento': [
    EVENT_PERMISSIONS.EVENT_VIEW_BASIC,
    EVENT_PERMISSIONS.EVENT_VIEW_DETAILS,
    EVENT_PERMISSIONS.EVENT_EDIT,
    EVENT_PERMISSIONS.EVENT_DELETE,
  ],
  'Participantes': [
    EVENT_PERMISSIONS.PARTICIPANT_VIEW,
    EVENT_PERMISSIONS.PARTICIPANT_CREATE,
    EVENT_PERMISSIONS.PARTICIPANT_EDIT,
    EVENT_PERMISSIONS.PARTICIPANT_DELETE,
    EVENT_PERMISSIONS.PARTICIPANT_CHECKIN,
  ],
  'Fornecedores': [
    EVENT_PERMISSIONS.SUPPLIER_VIEW,
    EVENT_PERMISSIONS.SUPPLIER_CREATE,
    EVENT_PERMISSIONS.SUPPLIER_EDIT,
    EVENT_PERMISSIONS.SUPPLIER_DELETE,
    EVENT_PERMISSIONS.SUPPLIER_SELECT,
    EVENT_PERMISSIONS.SUPPLIER_APPROVE,
  ],
  'Documentos': [
    EVENT_PERMISSIONS.DOCUMENT_VIEW_OWN,
    EVENT_PERMISSIONS.DOCUMENT_VIEW_SHARED,
    EVENT_PERMISSIONS.DOCUMENT_VIEW_ALL,
    EVENT_PERMISSIONS.DOCUMENT_CREATE,
    EVENT_PERMISSIONS.DOCUMENT_EDIT,
    EVENT_PERMISSIONS.DOCUMENT_DELETE,
  ],
  'Financeiro': [
    EVENT_PERMISSIONS.FINANCIAL_VIEW,
    EVENT_PERMISSIONS.FINANCIAL_EDIT,
  ],
  'Equipa': [
    EVENT_PERMISSIONS.TEAM_INVITE_STAFF,
    EVENT_PERMISSIONS.TEAM_INVITE_COMANAGER,
    EVENT_PERMISSIONS.TEAM_REMOVE,
    EVENT_PERMISSIONS.TEAM_SHARE_FOLDER,
  ],
  'Outros': [
    EVENT_PERMISSIONS.EMAIL_SEND,
    EVENT_PERMISSIONS.AI_USE,
  ],
};

/**
 * Single role permissions display with tinted header and accordion
 */
const RolePermissionCard = memo(({ role, isExpanded, onToggle }) => {
  const roleName = ROLE_DISPLAY_NAMES[role];
  const rolePermissions = getRolePermissions(role);
  const dotColor = ROLE_DOT_COLORS[role] || 'bg-gray-400';
  const bgTint = ROLE_BG_TINTS[role] || 'bg-background-50 dark:bg-background-800/30';
  const badgeVariant = ROLE_BADGE_VARIANTS[role] || 'neutral';

  // Group permissions by category
  const groupedPermissions = Object.entries(PERMISSION_CATEGORIES).reduce((acc, [category, permissions]) => {
    const categoryPerms = permissions.filter(perm => rolePermissions.includes(perm));
    if (categoryPerms.length > 0) {
      acc[category] = categoryPerms;
    }
    return acc;
  }, {});

  const permissionCount = rolePermissions.length;

  return (
    <div className="rounded-lg overflow-hidden">
      {/* Section header bar — mirrors CollaboratorList RoleSection */}
      <button
        onClick={onToggle}
        aria-expanded={isExpanded}
        aria-controls={`permissions-${role}`}
        className={`
          w-full flex items-center gap-2.5 px-4 py-2.5 rounded-lg
          transition-colors duration-150 ${bgTint}
          hover:opacity-90
          focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-1
          dark:focus-visible:ring-offset-background-900
        `}
      >
        {/* Colored dot */}
        <span className={`w-2 h-2 rounded-full ${dotColor} flex-shrink-0`} />

        {/* Role name (overline) */}
        <span className="text-xs font-semibold uppercase tracking-wider text-foreground flex-1 text-left">
          {roleName}
        </span>

        {/* Permission count badge */}
        <Badge variant={badgeVariant} tone="soft" size="xs">
          {permissionCount}
        </Badge>

        {/* Chevron */}
        <FiChevronDown
          className={`w-4 h-4 text-muted-foreground transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
          aria-hidden="true"
        />
      </button>

      {/* Permissions content (collapsible) */}
      {isExpanded && (
        <div id={`permissions-${role}`} role="region" aria-label={`${roleName} permissions`} className="px-4 pt-3 pb-4">
          <div className="space-y-4">
            {Object.entries(groupedPermissions).map(([category, permissions]) => (
              <div key={category}>
                {/* Category label */}
                <Text
                  variant="caption"
                  className="font-semibold text-muted-foreground uppercase tracking-wide text-[10px] mb-2 block"
                >
                  {category}
                </Text>

                {/* Permission items */}
                <div className="space-y-1">
                  {permissions.map((permission) => (
                    <div key={permission} className="flex items-center gap-2 py-0.5">
                      <div className="w-4 h-4 rounded flex items-center justify-center flex-shrink-0 bg-success-50 dark:bg-success-900/20">
                        <FiCheck className="w-3 h-3 text-success-500 dark:text-success-400" aria-hidden="true" />
                      </div>
                      <Text variant="caption" className="text-muted-foreground">
                        {PERMISSION_LABELS[permission]}
                      </Text>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
});

RolePermissionCard.displayName = 'RolePermissionCard';

RolePermissionCard.propTypes = {
  role: PropTypes.string.isRequired,
  isExpanded: PropTypes.bool.isRequired,
  onToggle: PropTypes.func.isRequired,
};

/**
 * Main component
 */
const RolePermissionsInfo = ({ isOpen, onClose, roles }) => {
  const [expandedRole, setExpandedRole] = useState(roles[0] || null);

  const handleToggle = (role) => {
    setExpandedRole(expandedRole === role ? null : role);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="lg"
      centered
    >
      <Card variant="default" className="shadow-none rounded-none sm:rounded-lg">
        <Modal.Header>
          <div className="flex items-center gap-2" id="permissions-modal-title">
            <FiShield className="h-5 w-5 text-primary-500" aria-hidden="true" />
            <span>Permissões dos Roles</span>
          </div>
        </Modal.Header>

        <Modal.Body>
          {/* Info banner */}
          <div className="flex items-start gap-2.5 mb-5 p-3 bg-primary-50/60 dark:bg-primary-900/15 rounded-lg border border-primary-100 dark:border-primary-800/30">
            <FiInfo className="w-4 h-4 text-primary-500 dark:text-primary-400 flex-shrink-0 mt-0.5" aria-hidden="true" />
            <Text variant="caption" className="text-primary-700 dark:text-primary-300">
              Cada role tem permissões específicas. Clique para ver os detalhes.
            </Text>
          </div>

          {/* Role cards with accordion */}
          <div className="space-y-3">
            {roles.map((role) => (
              <RolePermissionCard
                key={role}
                role={role}
                isExpanded={expandedRole === role}
                onToggle={() => handleToggle(role)}
              />
            ))}
          </div>
        </Modal.Body>
      </Card>
    </Modal>
  );
};

RolePermissionsInfo.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  roles: PropTypes.arrayOf(PropTypes.string).isRequired,
};

export default memo(RolePermissionsInfo);
