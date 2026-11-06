/**
 * @file eventRolesConfig.js
 * @description Event-level roles and permissions configuration
 * Implements the access control matrix defined in ACCESS_LEVELS_STRATEGY.md
 *
 * This is SEPARATE from account-plan gating (Lambdas + useAuthz; planos em
 * src/Utils/plans.js).
 * - eventRolesConfig.js: Controls what actions a user can perform on a specific EVENT based on their ROLE
 */

/**
 * Event collaboration roles
 * Hierarchy: OWNER > CO_MANAGER > STAFF
 */
export const EVENT_ROLES = {
  OWNER: 'OWNER',
  CO_MANAGER: 'CO_MANAGER',
  STAFF_CHECKIN: 'STAFF_CHECKIN',
  STAFF_LOGISTICS: 'STAFF_LOGISTICS',
};

/**
 * Granular permissions for event operations
 * Named following pattern: RESOURCE_ACTION or RESOURCE_ACTION_SCOPE
 */
export const EVENT_PERMISSIONS = {
  // Event permissions
  EVENT_VIEW_BASIC: 'event:view:basic',       // View event name/basic info
  EVENT_VIEW_DETAILS: 'event:view:details',   // View full event details
  EVENT_EDIT: 'event:edit',                   // Edit event details
  EVENT_DELETE: 'event:delete',               // Delete event

  // Participant permissions
  PARTICIPANT_VIEW: 'participant:view',
  PARTICIPANT_CREATE: 'participant:create',
  PARTICIPANT_EDIT: 'participant:edit',
  PARTICIPANT_DELETE: 'participant:delete',
  PARTICIPANT_CHECKIN: 'participant:checkin',

  // Supplier permissions
  SUPPLIER_VIEW: 'supplier:view',
  SUPPLIER_CREATE: 'supplier:create',
  SUPPLIER_EDIT: 'supplier:edit',
  SUPPLIER_DELETE: 'supplier:delete',
  SUPPLIER_SELECT: 'supplier:select',         // Select supplier (Staff can, Owner approves)
  SUPPLIER_APPROVE: 'supplier:approve',       // Approve supplier selection

  // Document/Financial permissions
  DOCUMENT_VIEW_OWN: 'document:view:own',           // View own folders
  DOCUMENT_VIEW_SHARED: 'document:view:shared',     // View shared folders
  DOCUMENT_VIEW_ALL: 'document:view:all',           // View all folders
  DOCUMENT_CREATE: 'document:create',
  DOCUMENT_EDIT: 'document:edit',
  DOCUMENT_DELETE: 'document:delete',
  FINANCIAL_VIEW: 'financial:view',
  FINANCIAL_EDIT: 'financial:edit',

  // Communication permissions
  EMAIL_SEND: 'email:send',

  // AI permissions
  AI_USE: 'ai:use',

  // Team management permissions
  TEAM_INVITE_STAFF: 'team:invite:staff',
  TEAM_INVITE_COMANAGER: 'team:invite:comanager',
  TEAM_REMOVE: 'team:remove',
  TEAM_SHARE_FOLDER: 'team:share:folder',

  // Schedule permissions (ADR-029)
  SCHEDULE_VIEW: 'schedule:view',
  SCHEDULE_CREATE: 'schedule:create',
  SCHEDULE_EDIT: 'schedule:edit',
  SCHEDULE_DELETE: 'schedule:delete',

  // Role management
  ROLE_MANAGE: 'role:manage',
};

/**
 * Permission matrix per role
 * Follows exactly the table from ACCESS_LEVELS_STRATEGY.md
 *
 * OWNER: Full control
 * CO_MANAGER: Almost everything except delete event, approve suppliers, invite co-managers
 * STAFF_CHECKIN: View participants and check-in only
 * STAFF_LOGISTICS: Manage participants, select suppliers (owner approves)
 */
export const ROLE_PERMISSIONS = {
  [EVENT_ROLES.OWNER]: Object.values(EVENT_PERMISSIONS), // All permissions

  [EVENT_ROLES.CO_MANAGER]: [
    // Event: View details, Edit details (NOT delete)
    EVENT_PERMISSIONS.EVENT_VIEW_BASIC,
    EVENT_PERMISSIONS.EVENT_VIEW_DETAILS,
    EVENT_PERMISSIONS.EVENT_EDIT,

    // Participants: Full CRUD
    EVENT_PERMISSIONS.PARTICIPANT_VIEW,
    EVENT_PERMISSIONS.PARTICIPANT_CREATE,
    EVENT_PERMISSIONS.PARTICIPANT_EDIT,
    EVENT_PERMISSIONS.PARTICIPANT_DELETE,
    EVENT_PERMISSIONS.PARTICIPANT_CHECKIN,

    // Suppliers: Full CRUD (NOT approve)
    EVENT_PERMISSIONS.SUPPLIER_VIEW,
    EVENT_PERMISSIONS.SUPPLIER_CREATE,
    EVENT_PERMISSIONS.SUPPLIER_EDIT,
    EVENT_PERMISSIONS.SUPPLIER_DELETE,
    EVENT_PERMISSIONS.SUPPLIER_SELECT,

    // Documents: CRUD (own + shared only, NOT all)
    EVENT_PERMISSIONS.DOCUMENT_VIEW_OWN,
    EVENT_PERMISSIONS.DOCUMENT_VIEW_SHARED,
    EVENT_PERMISSIONS.DOCUMENT_CREATE,
    EVENT_PERMISSIONS.DOCUMENT_EDIT,
    EVENT_PERMISSIONS.DOCUMENT_DELETE,

    // Financial: Full CRUD
    EVENT_PERMISSIONS.FINANCIAL_VIEW,
    EVENT_PERMISSIONS.FINANCIAL_EDIT,

    // Communication: All
    EVENT_PERMISSIONS.EMAIL_SEND,

    // AI: All
    EVENT_PERMISSIONS.AI_USE,

    // Team: Invite Staff and remove (NOT invite Co-Manager)
    EVENT_PERMISSIONS.TEAM_INVITE_STAFF,
    EVENT_PERMISSIONS.TEAM_REMOVE,

    // Schedule: full management
    EVENT_PERMISSIONS.SCHEDULE_VIEW,
    EVENT_PERMISSIONS.SCHEDULE_CREATE,
    EVENT_PERMISSIONS.SCHEDULE_EDIT,
    EVENT_PERMISSIONS.SCHEDULE_DELETE,

    // Role management
    EVENT_PERMISSIONS.ROLE_MANAGE,
  ],

  [EVENT_ROLES.STAFF_CHECKIN]: [
    // Event: View basic info only (NOT details)
    // NOTE: STAFF_CHECKIN does NOT have access to the Event Details page (EventRouteGuard blocks it)
    // They can only see the events list and perform check-in
    EVENT_PERMISSIONS.EVENT_VIEW_BASIC,

    // Participants: View and check-in only (NOT create/edit/delete)
    EVENT_PERMISSIONS.PARTICIPANT_VIEW,
    EVENT_PERMISSIONS.PARTICIPANT_CHECKIN,

    // Notes: NO access (cannot access Event Details page)
  ],

  [EVENT_ROLES.STAFF_LOGISTICS]: [
    // Event: View basic + details (EventRouteGuard only blocks STAFF_CHECKIN)
    EVENT_PERMISSIONS.EVENT_VIEW_BASIC,
    EVENT_PERMISSIONS.EVENT_VIEW_DETAILS,

    // Participants: Full CRUD
    EVENT_PERMISSIONS.PARTICIPANT_VIEW,
    EVENT_PERMISSIONS.PARTICIPANT_CREATE,
    EVENT_PERMISSIONS.PARTICIPANT_EDIT,
    EVENT_PERMISSIONS.PARTICIPANT_DELETE,
    EVENT_PERMISSIONS.PARTICIPANT_CHECKIN,

    // Suppliers: View, create own suppliers, and select (NOT edit/delete/approve)
    // Suppliers they create are owned by themselves (rules.owner() on Supplier model).
    // Associating them with the event still flows through PENDING_APPROVAL.
    EVENT_PERMISSIONS.SUPPLIER_VIEW,
    EVENT_PERMISSIONS.SUPPLIER_CREATE,
    EVENT_PERMISSIONS.SUPPLIER_SELECT,

    // Documents: View shared folders + CRUD own documents
    EVENT_PERMISSIONS.DOCUMENT_VIEW_SHARED,
    EVENT_PERMISSIONS.DOCUMENT_CREATE,
    EVENT_PERMISSIONS.DOCUMENT_EDIT,
    EVENT_PERMISSIONS.DOCUMENT_DELETE,

    // Communication: Can send emails to participants
    EVENT_PERMISSIONS.EMAIL_SEND,

    // AI: Can use Akili
    EVENT_PERMISSIONS.AI_USE,

    // Schedule: view + create + edit/delete own (own scope enforced in handler/hook per ADR-030).
    EVENT_PERMISSIONS.SCHEDULE_VIEW,
    EVENT_PERMISSIONS.SCHEDULE_CREATE,
    EVENT_PERMISSIONS.SCHEDULE_EDIT,
    EVENT_PERMISSIONS.SCHEDULE_DELETE,

    // Role management
    EVENT_PERMISSIONS.ROLE_MANAGE,
  ],
};

/**
 * Role dot colors for UI (matches CollaboratorList section headers)
 */
export const ROLE_DOT_COLORS = {
  [EVENT_ROLES.OWNER]: 'bg-warning-500',
  [EVENT_ROLES.CO_MANAGER]: 'bg-primary-400',
  [EVENT_ROLES.STAFF_CHECKIN]: 'bg-success-400',
  [EVENT_ROLES.STAFF_LOGISTICS]: 'bg-info-400',
};

/**
 * Role background tints for UI
 */
export const ROLE_BG_TINTS = {
  [EVENT_ROLES.OWNER]: 'bg-warning-50 dark:bg-warning-900/20',
  [EVENT_ROLES.CO_MANAGER]: 'bg-primary-50 dark:bg-primary-900/20',
  [EVENT_ROLES.STAFF_CHECKIN]: 'bg-success-50 dark:bg-success-900/20',
  [EVENT_ROLES.STAFF_LOGISTICS]: 'bg-info-50 dark:bg-info-900/20',
};

/**
 * Role badge variants for UI
 */
export const ROLE_BADGE_VARIANTS = {
  [EVENT_ROLES.OWNER]: 'warning',
  [EVENT_ROLES.CO_MANAGER]: 'primary',
  [EVENT_ROLES.STAFF_CHECKIN]: 'success',
  [EVENT_ROLES.STAFF_LOGISTICS]: 'info',
};

/**
 * Maps EVENT_ROLES to their i18n key segment under "team:roles.<key>".
 * Usage: t(`team:roles.${ROLE_I18N_MAP[role]}.name`)
 */
export const ROLE_I18N_MAP = {
  [EVENT_ROLES.OWNER]: 'owner',
  [EVENT_ROLES.CO_MANAGER]: 'coManager',
  [EVENT_ROLES.STAFF_CHECKIN]: 'staffCheckin',
  [EVENT_ROLES.STAFF_LOGISTICS]: 'staffLogistics',
};

/**
 * i18n keys for role display names and descriptions.
 * Maps EVENT_ROLES to keys under the "team" namespace: team:roles.<key>.name / .description
 * Usage: t(ROLE_I18N_KEYS[role].name)
 */
export const ROLE_I18N_KEYS = {
  [EVENT_ROLES.OWNER]: { name: 'team:roles.owner.name', description: 'team:roles.owner.description' },
  [EVENT_ROLES.CO_MANAGER]: { name: 'team:roles.coManager.name', description: 'team:roles.coManager.description' },
  [EVENT_ROLES.STAFF_CHECKIN]: { name: 'team:roles.staffCheckin.name', description: 'team:roles.staffCheckin.description' },
  [EVENT_ROLES.STAFF_LOGISTICS]: { name: 'team:roles.staffLogistics.name', description: 'team:roles.staffLogistics.description' },
};

/**
 * @deprecated Use ROLE_I18N_KEYS with t() instead for locale-aware names.
 * Kept temporarily for backwards compatibility during migration.
 */
export const ROLE_DISPLAY_NAMES = {
  [EVENT_ROLES.OWNER]: 'Organizador',
  [EVENT_ROLES.CO_MANAGER]: 'Co-Organizador',
  [EVENT_ROLES.STAFF_CHECKIN]: 'Staff Check-in',
  [EVENT_ROLES.STAFF_LOGISTICS]: 'Staff Logística',
};

/**
 * @deprecated Use ROLE_I18N_KEYS with t() instead for locale-aware descriptions.
 * Kept temporarily for backwards compatibility during migration.
 */
export const ROLE_DESCRIPTIONS = {
  [EVENT_ROLES.OWNER]: 'Controlo total do evento',
  [EVENT_ROLES.CO_MANAGER]: 'Permissões amplas, pode convidar Staff',
  [EVENT_ROLES.STAFF_CHECKIN]: 'Apenas check-in de participantes',
  [EVENT_ROLES.STAFF_LOGISTICS]: 'Gestão de participantes e seleção de fornecedores',
};

/**
 * Helper to check if a role has a specific permission
 * @param {string} role - Role from EVENT_ROLES
 * @param {string} permission - Permission from EVENT_PERMISSIONS
 * @returns {boolean} - True if role has the permission
 */
export const roleHasPermission = (role, permission) => {
  if (!role || !ROLE_PERMISSIONS[role]) return false;
  return ROLE_PERMISSIONS[role].includes(permission);
};

/**
 * Get all permissions for a role
 * @param {string} role - Role from EVENT_ROLES
 * @returns {string[]} - Array of permissions
 */
export const getRolePermissions = (role) => {
  return ROLE_PERMISSIONS[role] || [];
};

/**
 * Check if a role can invite another role
 * @param {string} inviterRole - Role of the person inviting
 * @param {string} inviteeRole - Role being invited
 * @returns {boolean} - True if allowed
 */
export const canInviteRole = (inviterRole, inviteeRole) => {
  if (inviterRole === EVENT_ROLES.OWNER) {
    // Owner can invite anyone
    return true;
  }

  if (inviterRole === EVENT_ROLES.CO_MANAGER) {
    // Co-Manager can only invite Staff roles
    return inviteeRole === EVENT_ROLES.STAFF_CHECKIN ||
           inviteeRole === EVENT_ROLES.STAFF_LOGISTICS;
  }

  // Staff cannot invite anyone
  return false;
};

/**
 * Check if a role can remove a collaborator with a given role
 * @param {string} removerRole - Role of the person removing
 * @param {string} targetRole - Role of the person being removed
 * @returns {boolean} - True if allowed
 */
export const canRemoveCollaborator = (removerRole, targetRole) => {
  if (removerRole === EVENT_ROLES.OWNER) {
    return true;
  }

  if (removerRole === EVENT_ROLES.CO_MANAGER) {
    // Co-Manager can only remove Staff roles, NOT other Co-Managers
    return targetRole === EVENT_ROLES.STAFF_CHECKIN ||
           targetRole === EVENT_ROLES.STAFF_LOGISTICS;
  }

  return false;
};

/**
 * Get roles that can be invited by a given role
 * @param {string} inviterRole - Role of the person inviting
 * @returns {string[]} - Array of roles that can be invited
 */
export const getInvitableRoles = (inviterRole) => {
  if (inviterRole === EVENT_ROLES.OWNER) {
    return [EVENT_ROLES.CO_MANAGER, EVENT_ROLES.STAFF_CHECKIN, EVENT_ROLES.STAFF_LOGISTICS];
  }

  if (inviterRole === EVENT_ROLES.CO_MANAGER) {
    return [EVENT_ROLES.STAFF_CHECKIN, EVENT_ROLES.STAFF_LOGISTICS];
  }

  return [];
};
