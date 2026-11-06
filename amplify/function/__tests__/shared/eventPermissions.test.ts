describe('eventPermissions', () => {
  it('grants every supplier permission to OWNER', async () => {
    const { EVENT_ROLES, EVENT_PERMISSIONS, roleHasPermission } = await import('../../shared/eventPermissions');

    expect(roleHasPermission(EVENT_ROLES.OWNER, EVENT_PERMISSIONS.SUPPLIER_VIEW)).toBe(true);
    expect(roleHasPermission(EVENT_ROLES.OWNER, EVENT_PERMISSIONS.SUPPLIER_CREATE)).toBe(true);
    expect(roleHasPermission(EVENT_ROLES.OWNER, EVENT_PERMISSIONS.SUPPLIER_EDIT)).toBe(true);
    expect(roleHasPermission(EVENT_ROLES.OWNER, EVENT_PERMISSIONS.SUPPLIER_DELETE)).toBe(true);
    expect(roleHasPermission(EVENT_ROLES.OWNER, EVENT_PERMISSIONS.SUPPLIER_SELECT)).toBe(true);
    expect(roleHasPermission(EVENT_ROLES.OWNER, EVENT_PERMISSIONS.SUPPLIER_APPROVE)).toBe(true);
  });

  it('grants CO_MANAGER supplier CRUD and select but not approve', async () => {
    const { EVENT_ROLES, EVENT_PERMISSIONS, roleHasPermission } = await import('../../shared/eventPermissions');

    expect(roleHasPermission(EVENT_ROLES.CO_MANAGER, EVENT_PERMISSIONS.SUPPLIER_CREATE)).toBe(true);
    expect(roleHasPermission(EVENT_ROLES.CO_MANAGER, EVENT_PERMISSIONS.SUPPLIER_EDIT)).toBe(true);
    expect(roleHasPermission(EVENT_ROLES.CO_MANAGER, EVENT_PERMISSIONS.SUPPLIER_DELETE)).toBe(true);
    expect(roleHasPermission(EVENT_ROLES.CO_MANAGER, EVENT_PERMISSIONS.SUPPLIER_SELECT)).toBe(true);
    expect(roleHasPermission(EVENT_ROLES.CO_MANAGER, EVENT_PERMISSIONS.SUPPLIER_APPROVE)).toBe(false);
  });

  it('grants STAFF_LOGISTICS supplier select and create, but not edit/delete/approve', async () => {
    const { EVENT_ROLES, EVENT_PERMISSIONS, roleHasPermission } = await import('../../shared/eventPermissions');

    // STAFF_LOGISTICS can propose suppliers: create their own (rules.owner on Supplier)
    // and associate them with the event (PENDING_APPROVAL via select-event-supplier).
    expect(roleHasPermission(EVENT_ROLES.STAFF_LOGISTICS, EVENT_PERMISSIONS.SUPPLIER_SELECT)).toBe(true);
    expect(roleHasPermission(EVENT_ROLES.STAFF_LOGISTICS, EVENT_PERMISSIONS.SUPPLIER_CREATE)).toBe(true);
    // But cannot touch other people's suppliers or approve.
    expect(roleHasPermission(EVENT_ROLES.STAFF_LOGISTICS, EVENT_PERMISSIONS.SUPPLIER_EDIT)).toBe(false);
    expect(roleHasPermission(EVENT_ROLES.STAFF_LOGISTICS, EVENT_PERMISSIONS.SUPPLIER_DELETE)).toBe(false);
    expect(roleHasPermission(EVENT_ROLES.STAFF_LOGISTICS, EVENT_PERMISSIONS.SUPPLIER_APPROVE)).toBe(false);
  });

  it('returns false for unknown and null roles', async () => {
    const { EVENT_PERMISSIONS, roleHasPermission } = await import('../../shared/eventPermissions');

    expect(roleHasPermission('UNKNOWN_ROLE', EVENT_PERMISSIONS.SUPPLIER_VIEW)).toBe(false);
    expect(roleHasPermission(null, EVENT_PERMISSIONS.SUPPLIER_VIEW)).toBe(false);
  });
});
