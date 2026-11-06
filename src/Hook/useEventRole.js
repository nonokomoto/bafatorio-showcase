/**
 * @file useEventRole.js
 * @description Hook for event-level role and permission management
 * Implements the access control matrix defined in ACCESS_LEVELS_STRATEGY.md
 *
 * This is SEPARATE from account-plan gating (a redesenhar com o backend novo;
 * planos em src/Utils/plans.js).
 * - useEventRole: Controls actions on a specific EVENT based on ROLE
 */

import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { useGetEventAsCollaboratorQuery } from '../Api/services/collaboratorApi';
import { useTranslation } from 'react-i18next';
import {
  EVENT_ROLES,
  EVENT_PERMISSIONS,
  ROLE_PERMISSIONS,
  roleHasPermission,
  ROLE_I18N_KEYS,
} from '../Utils/eventRolesConfig';
import { normalizeOwnerId } from '../Utils/ownerId';

const EMPTY_SHARED_FOLDERS = [];
const EMPTY_SHARED_SUPPLIERS = [];

/**
 * Custom hook for event-level role management
 * Determines user's role for a specific event and provides permission helpers
 *
 * @param {string} eventId - The event ID to check permissions for
 * @returns {Object} Role information and permission helpers
 *
 * @example
 * const { role, isOwner, canEditEvent, hasPermission } = useEventRole(eventId);
 *
 * if (canEditEvent()) {
 *   // Show edit button
 * }
 *
 * if (hasPermission(EVENT_PERMISSIONS.SUPPLIER_APPROVE)) {
 *   // Show approve button
 * }
 */
export const useEventRole = (eventId) => {
  const { t } = useTranslation(['team']);
  const user = useSelector((state) => state.user);
  const userId = user?.user?.sub;

  // Use the new query that checks permissions (owner or collaborator)
  const {
    data: eventAccessData,
    isLoading,
    error,
  } = useGetEventAsCollaboratorQuery(
    { eventId },
    { skip: !eventId }
  );

  // Determine role and collaborator info from the query response
  const roleInfo = useMemo(() => {
    if (!eventAccessData || !eventAccessData.event) {
      return { role: null, collaborator: null, eventData: null };
    }

    const { userRole, sharedFolderIds, sharedSupplierIds, event } = eventAccessData;

    // Map userRole string to EVENT_ROLES constant
    const role = userRole ? EVENT_ROLES[userRole] : null;

    // Create collaborator object if not owner
    const collaborator = role && role !== EVENT_ROLES.OWNER
      ? {
          role,
          sharedFolderIds: sharedFolderIds || [],
          sharedSupplierIds: sharedSupplierIds || [],
          status: 'ACCEPTED',
        }
      : null;

    return { role, collaborator, eventData: event };
  }, [eventAccessData]);

  const { role, collaborator, eventData } = roleInfo;
  const permissions = role ? ROLE_PERMISSIONS[role] : [];

  return {
    // ========================================
    // Role Information
    // ========================================
    role,
    roleName: role && ROLE_I18N_KEYS[role] ? t(ROLE_I18N_KEYS[role].name) : null,
    roleDescription: role && ROLE_I18N_KEYS[role] ? t(ROLE_I18N_KEYS[role].description) : null,
    collaborator,
    eventData,
    eventDetails: eventData, // Alias for compatibility with components using useEventData

    // Role flags (convenience)
    isOwner: role === EVENT_ROLES.OWNER,
    isCoManager: role === EVENT_ROLES.CO_MANAGER,
    isStaffCheckin: role === EVENT_ROLES.STAFF_CHECKIN,
    isStaffLogistics: role === EVENT_ROLES.STAFF_LOGISTICS,
    isStaff:
      role === EVENT_ROLES.STAFF_CHECKIN ||
      role === EVENT_ROLES.STAFF_LOGISTICS,

    // Access flags
    // Boolean(role), não role !== null: EVENT_ROLES[userRole] devolve undefined
    // para um role que o frontend não conheça, e undefined !== null deixaria o
    // guard passar sem role reconhecido.
    hasAccess: Boolean(role),
    isLoading,
    error,

    // ========================================
    // Permission List
    // ========================================
    permissions,

    // ========================================
    // Permission Helpers
    // ========================================

    /**
     * Check if user has a specific permission
     * @param {string} permission - Permission from EVENT_PERMISSIONS
     * @returns {boolean}
     */
    hasPermission: (permission) => roleHasPermission(role, permission),

    // ========================================
    // Event Permissions (ACCESS_LEVELS_STRATEGY.md table)
    // ========================================

    /**
     * Can view basic event info (name, date) - All roles
     */
    canViewEventBasic: () =>
      roleHasPermission(role, EVENT_PERMISSIONS.EVENT_VIEW_BASIC),

    /**
     * Can view full event details - Owner, Co-Manager only
     */
    canViewEventDetails: () =>
      roleHasPermission(role, EVENT_PERMISSIONS.EVENT_VIEW_DETAILS),

    /**
     * Can edit event details - Owner, Co-Manager only
     */
    canEditEvent: () => roleHasPermission(role, EVENT_PERMISSIONS.EVENT_EDIT),

    /**
     * Can delete event - Owner only
     */
    canDeleteEvent: () =>
      roleHasPermission(role, EVENT_PERMISSIONS.EVENT_DELETE),

    // ========================================
    // Participant Permissions
    // ========================================

    /**
     * Can view participants - All roles
     */
    canViewParticipants: () =>
      roleHasPermission(role, EVENT_PERMISSIONS.PARTICIPANT_VIEW),

    /**
     * Can create/edit/delete participants - Owner, Co-Manager, Staff Logistics
     */
    canManageParticipants: () =>
      roleHasPermission(role, EVENT_PERMISSIONS.PARTICIPANT_CREATE),

    /**
     * Can perform check-in - All roles
     */
    canCheckIn: () =>
      roleHasPermission(role, EVENT_PERMISSIONS.PARTICIPANT_CHECKIN),

    // ========================================
    // Supplier Permissions
    // ========================================

    /**
     * Can view suppliers - Owner, Co-Manager, Staff Logistics
     */
    canViewSuppliers: () =>
      roleHasPermission(role, EVENT_PERMISSIONS.SUPPLIER_VIEW),

    /**
     * Can create new Supplier records - Owner, Co-Manager, Staff Logistics.
     * Note: this flag only covers CREATE. Edit and delete are separate
     * permissions (SUPPLIER_EDIT, SUPPLIER_DELETE) — do not reuse this for
     * those actions or STAFF_LOGISTICS will see buttons the backend rejects.
     */
    canManageSuppliers: () =>
      roleHasPermission(role, EVENT_PERMISSIONS.SUPPLIER_CREATE),

    /**
     * Can select supplier for approval - Owner, Co-Manager, Staff Logistics
     * Note: Staff Logistics selections require Owner approval
     */
    canSelectSupplier: () =>
      roleHasPermission(role, EVENT_PERMISSIONS.SUPPLIER_SELECT),

    /**
     * Can approve supplier selections - Owner only
     */
    canApproveSuppliers: () =>
      roleHasPermission(role, EVENT_PERMISSIONS.SUPPLIER_APPROVE),

    // ========================================
    // Document/Financial Permissions
    // ========================================

    /**
     * Can view all documents/folders - Owner only
     */
    canViewAllDocuments: () =>
      roleHasPermission(role, EVENT_PERMISSIONS.DOCUMENT_VIEW_ALL),

    /**
     * Can view own documents/folders - Owner, Co-Manager
     */
    canViewOwnDocuments: () =>
      roleHasPermission(role, EVENT_PERMISSIONS.DOCUMENT_VIEW_OWN),

    /**
     * Can view shared documents/folders - Owner, Co-Manager, Staff Logistics
     */
    canViewSharedDocuments: () =>
      roleHasPermission(role, EVENT_PERMISSIONS.DOCUMENT_VIEW_SHARED),

    /**
     * Can create/edit/delete documents - Owner, Co-Manager, Staff Logistics (own docs only)
     */
    canManageDocuments: () =>
      roleHasPermission(role, EVENT_PERMISSIONS.DOCUMENT_CREATE),

    /**
     * Can view financial data - Owner, Co-Manager
     */
    canViewFinancial: () =>
      roleHasPermission(role, EVENT_PERMISSIONS.FINANCIAL_VIEW),

    /**
     * Can edit financial data - Owner, Co-Manager
     */
    canEditFinancial: () =>
      roleHasPermission(role, EVENT_PERMISSIONS.FINANCIAL_EDIT),

    // ========================================
    // Communication & AI Permissions
    // ========================================

    /**
     * Can send emails - Owner, Co-Manager
     */
    canSendEmails: () => roleHasPermission(role, EVENT_PERMISSIONS.EMAIL_SEND),

    /**
     * Can use AI features (Akili) - Owner, Co-Manager
     */
    canUseAI: () => roleHasPermission(role, EVENT_PERMISSIONS.AI_USE),

    // ========================================
    // Team Management Permissions
    // ========================================

    /**
     * Can invite Staff members - Owner, Co-Manager
     */
    canInviteStaff: () =>
      roleHasPermission(role, EVENT_PERMISSIONS.TEAM_INVITE_STAFF),

    /**
     * Can invite Co-Managers - Owner only
     */
    canInviteCoManager: () =>
      roleHasPermission(role, EVENT_PERMISSIONS.TEAM_INVITE_COMANAGER),

    /**
     * Can remove team members - Owner, Co-Manager
     */
    canRemoveTeamMember: () =>
      roleHasPermission(role, EVENT_PERMISSIONS.TEAM_REMOVE),

    /**
     * Can share folders with Co-Managers - Owner only
     */
    canShareFolders: () =>
      roleHasPermission(role, EVENT_PERMISSIONS.TEAM_SHARE_FOLDER),

    // ========================================
    // Schedule Permissions (ADR-029)
    // ========================================

    /**
     * Can view schedule - Owner, Co-Manager, Staff Logistics
     */
    canViewSchedule: () =>
      roleHasPermission(role, EVENT_PERMISSIONS.SCHEDULE_VIEW),

    /**
     * Can create new schedule entries - Owner, Co-Manager, Staff Logistics
     */
    canCreateScheduleEntry: () =>
      roleHasPermission(role, EVENT_PERMISSIONS.SCHEDULE_CREATE),

    /**
     * Can edit a specific schedule entry. Per ADR-029:
     * - OWNER and CO_MANAGER may edit any entry
     * - STAFF_LOGISTICS may edit only entries they authored themselves
     * Mirrors backend assertCanEditEntry; UI uses this to gate per-entry buttons.
     */
    canEditScheduleEntry: (entryOwnerUserId) => {
      if (!roleHasPermission(role, EVENT_PERMISSIONS.SCHEDULE_EDIT)) return false;
      if (role === EVENT_ROLES.OWNER || role === EVENT_ROLES.CO_MANAGER) return true;
      if (role === EVENT_ROLES.STAFF_LOGISTICS) {
        // Fail-closed: a missing entry owner means we cannot prove authorship.
        if (!entryOwnerUserId) return false;
        return normalizeOwnerId(entryOwnerUserId) === normalizeOwnerId(userId);
      }
      return false;
    },

    /**
     * Can delete a specific schedule entry. Per ADR-029:
     * - OWNER may delete any entry
     * - CO_MANAGER may delete any entry NOT authored by the event OWNER
     * - STAFF_LOGISTICS may delete only entries they authored themselves
     * Mirrors backend assertCanDeleteEntry.
     */
    canDeleteScheduleEntry: (entryOwnerUserId) => {
      if (!roleHasPermission(role, EVENT_PERMISSIONS.SCHEDULE_DELETE)) return false;
      if (role === EVENT_ROLES.OWNER) return true;
      if (role === EVENT_ROLES.CO_MANAGER) {
        // Fail-closed: without an entry owner OR an event owner we cannot prove
        // the entry was not authored by the OWNER, so we deny.
        if (!entryOwnerUserId) return false;
        const eventOwnerId = eventData?.owner;
        if (!eventOwnerId) return false;
        return normalizeOwnerId(entryOwnerUserId) !== normalizeOwnerId(eventOwnerId);
      }
      if (role === EVENT_ROLES.STAFF_LOGISTICS) {
        // Fail-closed: without both IDs we cannot prove authorship.
        if (!entryOwnerUserId || !userId) return false;
        return normalizeOwnerId(entryOwnerUserId) === normalizeOwnerId(userId);
      }
      return false;
    },

    // ========================================
    // Folder Access (Co-Manager & Staff Logistics)
    // ========================================

    /**
     * List of folder IDs shared with this collaborator
     * Relevant for Co-Managers and Staff Logistics
     */
    sharedFolderIds: collaborator?.sharedFolderIds || EMPTY_SHARED_FOLDERS,

    /**
     * List of supplier IDs shared with this collaborator
     * Relevant for Co-Managers and Staff Logistics
     */
    sharedSupplierIds: collaborator?.sharedSupplierIds || EMPTY_SHARED_SUPPLIERS,

    /**
     * Check if user can access a specific supplier
     * Per ACCESS_LEVELS_STRATEGY.md:
     * - Owner: can access all suppliers
     * - Co-Manager: can access own suppliers + shared suppliers
     * - Staff Logistics: can access shared suppliers only
     * - Staff Check-in: no supplier access
     *
     * @param {string} supplierId - The supplier ID to check
     * @param {string} supplierCreatedBy - The userId who created the supplier
     * @returns {boolean}
     */
    canAccessSupplier: (supplierId, supplierCreatedBy) => {
      if (role === EVENT_ROLES.OWNER) return true;

      if (role === EVENT_ROLES.CO_MANAGER) {
        if (supplierCreatedBy === userId) return true;
        return collaborator?.sharedSupplierIds?.includes(supplierId) || false;
      }

      if (role === EVENT_ROLES.STAFF_LOGISTICS) {
        return collaborator?.sharedSupplierIds?.includes(supplierId) || false;
      }

      return false;
    },

    /**
     * Check if user can access a specific folder
     * Per ACCESS_LEVELS_STRATEGY.md:
     * - Owner: can access all folders
     * - Co-Manager: can access own folders + shared folders
     * - Staff Logistics: can access shared folders only
     * - Staff Check-in: no folder access
     *
     * @param {string} folderId - The folder ID to check
     * @param {string} folderCreatedBy - The userId who created the folder
     * @returns {boolean}
     */
    canAccessFolder: (folderId, folderCreatedBy) => {
      // Owner can access everything
      if (role === EVENT_ROLES.OWNER) return true;

      // Co-Manager can access own folders + shared folders
      if (role === EVENT_ROLES.CO_MANAGER) {
        // Check if it's their own folder
        if (folderCreatedBy === userId) return true;
        // Check if folder is in shared list
        return collaborator?.sharedFolderIds?.includes(folderId) || false;
      }

      // Staff Logistics can access shared folders only
      if (role === EVENT_ROLES.STAFF_LOGISTICS) {
        return collaborator?.sharedFolderIds?.includes(folderId) || false;
      }

      // Staff Check-in: no folder access
      return false;
    },

    // ========================================
    // Utility: Check if selection needs approval
    // ========================================

    /**
     * Check if supplier selection by current user requires approval
     * Only Staff Logistics selections require Owner approval
     * @returns {boolean}
     */
    supplierSelectionNeedsApproval: () => {
      return role === EVENT_ROLES.STAFF_LOGISTICS;
    },
  };
};

// Re-export constants for convenience
export { EVENT_ROLES, EVENT_PERMISSIONS };

export default useEventRole;
