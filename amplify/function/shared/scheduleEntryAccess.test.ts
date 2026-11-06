jest.mock('./resolveEventAccess', () => ({
  normalizeUserId: (id: string) => (typeof id === 'string' ? id.split('::')[0] : id),
}));

import { assertCanEditEntry, assertCanDeleteEntry } from './scheduleEntryAccess';

const OWNER_ID = 'owner-1';
const COMANAGER_ID = 'comanager-1';
const LOGISTICS_ID = 'logistics-1';

describe('assertCanEditEntry', () => {
  it('OWNER edits any entry', () => {
    expect(() =>
      assertCanEditEntry({
        role: 'OWNER',
        entryOwnerUserId: COMANAGER_ID,
        currentUserId: OWNER_ID,
      }),
    ).not.toThrow();
  });

  it('CO_MANAGER edits OWNER-authored entries', () => {
    expect(() =>
      assertCanEditEntry({
        role: 'CO_MANAGER',
        entryOwnerUserId: OWNER_ID,
        currentUserId: COMANAGER_ID,
      }),
    ).not.toThrow();
  });

  it('CO_MANAGER edits their own entries', () => {
    expect(() =>
      assertCanEditEntry({
        role: 'CO_MANAGER',
        entryOwnerUserId: COMANAGER_ID,
        currentUserId: COMANAGER_ID,
      }),
    ).not.toThrow();
  });

  it('STAFF_LOGISTICS edits their own entries', () => {
    expect(() =>
      assertCanEditEntry({
        role: 'STAFF_LOGISTICS',
        entryOwnerUserId: LOGISTICS_ID,
        currentUserId: LOGISTICS_ID,
      }),
    ).not.toThrow();
  });

  it('STAFF_LOGISTICS edits their own entry stored in legacy userId::userId format', () => {
    expect(() =>
      assertCanEditEntry({
        role: 'STAFF_LOGISTICS',
        entryOwnerUserId: `${LOGISTICS_ID}::${LOGISTICS_ID}`,
        currentUserId: LOGISTICS_ID,
      }),
    ).not.toThrow();
  });

  it('STAFF_LOGISTICS cannot edit OWNER-authored entries', () => {
    expect(() =>
      assertCanEditEntry({
        role: 'STAFF_LOGISTICS',
        entryOwnerUserId: OWNER_ID,
        currentUserId: LOGISTICS_ID,
      }),
    ).toThrow('Access denied');
  });

  it('STAFF_LOGISTICS cannot edit CO_MANAGER-authored entries', () => {
    expect(() =>
      assertCanEditEntry({
        role: 'STAFF_LOGISTICS',
        entryOwnerUserId: COMANAGER_ID,
        currentUserId: LOGISTICS_ID,
      }),
    ).toThrow('Access denied');
  });

  it('STAFF_LOGISTICS denied when ownership IDs are empty (fail-closed)', () => {
    expect(() =>
      assertCanEditEntry({
        role: 'STAFF_LOGISTICS',
        entryOwnerUserId: '',
        currentUserId: '',
      }),
    ).toThrow('Access denied');
  });

  it('STAFF_CHECKIN cannot edit any entry', () => {
    expect(() =>
      assertCanEditEntry({
        role: 'STAFF_CHECKIN',
        entryOwnerUserId: 'checkin-1',
        currentUserId: 'checkin-1',
      }),
    ).toThrow('Access denied');
  });

  it('unknown role is rejected', () => {
    expect(() =>
      assertCanEditEntry({
        role: 'GUEST',
        entryOwnerUserId: 'a',
        currentUserId: 'a',
      }),
    ).toThrow('Access denied');
  });
});

describe('assertCanDeleteEntry', () => {
  it('OWNER deletes any entry', () => {
    expect(() =>
      assertCanDeleteEntry({
        role: 'OWNER',
        entryOwnerUserId: COMANAGER_ID,
        eventOwnerUserId: OWNER_ID,
        currentUserId: OWNER_ID,
      }),
    ).not.toThrow();
  });

  it('CO_MANAGER deletes their own entries', () => {
    expect(() =>
      assertCanDeleteEntry({
        role: 'CO_MANAGER',
        entryOwnerUserId: COMANAGER_ID,
        eventOwnerUserId: OWNER_ID,
        currentUserId: COMANAGER_ID,
      }),
    ).not.toThrow();
  });

  it('CO_MANAGER deletes STAFF_LOGISTICS-authored entries', () => {
    expect(() =>
      assertCanDeleteEntry({
        role: 'CO_MANAGER',
        entryOwnerUserId: LOGISTICS_ID,
        eventOwnerUserId: OWNER_ID,
        currentUserId: COMANAGER_ID,
      }),
    ).not.toThrow();
  });

  it('CO_MANAGER cannot delete OWNER-authored entries', () => {
    expect(() =>
      assertCanDeleteEntry({
        role: 'CO_MANAGER',
        entryOwnerUserId: OWNER_ID,
        eventOwnerUserId: OWNER_ID,
        currentUserId: COMANAGER_ID,
      }),
    ).toThrow('Access denied');
  });

  it('CO_MANAGER cannot delete OWNER-authored entry stored in legacy userId::userId format', () => {
    expect(() =>
      assertCanDeleteEntry({
        role: 'CO_MANAGER',
        entryOwnerUserId: `${OWNER_ID}::${OWNER_ID}`,
        eventOwnerUserId: OWNER_ID,
        currentUserId: COMANAGER_ID,
      }),
    ).toThrow('Access denied');
  });

  it('STAFF_LOGISTICS deletes their own entry', () => {
    expect(() =>
      assertCanDeleteEntry({
        role: 'STAFF_LOGISTICS',
        entryOwnerUserId: LOGISTICS_ID,
        eventOwnerUserId: OWNER_ID,
        currentUserId: LOGISTICS_ID,
      }),
    ).not.toThrow();
  });

  it('STAFF_LOGISTICS deletes their own entry stored in legacy userId::userId format', () => {
    expect(() =>
      assertCanDeleteEntry({
        role: 'STAFF_LOGISTICS',
        entryOwnerUserId: `${LOGISTICS_ID}::${LOGISTICS_ID}`,
        eventOwnerUserId: OWNER_ID,
        currentUserId: LOGISTICS_ID,
      }),
    ).not.toThrow();
  });

  it('STAFF_LOGISTICS cannot delete OWNER-authored entry', () => {
    expect(() =>
      assertCanDeleteEntry({
        role: 'STAFF_LOGISTICS',
        entryOwnerUserId: OWNER_ID,
        eventOwnerUserId: OWNER_ID,
        currentUserId: LOGISTICS_ID,
      }),
    ).toThrow('Access denied');
  });

  it('STAFF_LOGISTICS cannot delete CO_MANAGER-authored entry', () => {
    expect(() =>
      assertCanDeleteEntry({
        role: 'STAFF_LOGISTICS',
        entryOwnerUserId: COMANAGER_ID,
        eventOwnerUserId: OWNER_ID,
        currentUserId: LOGISTICS_ID,
      }),
    ).toThrow('Access denied');
  });

  it('STAFF_LOGISTICS denied when ownership IDs are empty (fail-closed)', () => {
    expect(() =>
      assertCanDeleteEntry({
        role: 'STAFF_LOGISTICS',
        entryOwnerUserId: '',
        eventOwnerUserId: OWNER_ID,
        currentUserId: '',
      }),
    ).toThrow('Access denied');
  });

  it('CO_MANAGER denied when event owner is empty (fail-closed)', () => {
    expect(() =>
      assertCanDeleteEntry({
        role: 'CO_MANAGER',
        entryOwnerUserId: COMANAGER_ID,
        eventOwnerUserId: '',
        currentUserId: COMANAGER_ID,
      }),
    ).toThrow('Access denied');
  });

  it('STAFF_CHECKIN cannot delete any entry', () => {
    expect(() =>
      assertCanDeleteEntry({
        role: 'STAFF_CHECKIN',
        entryOwnerUserId: 'checkin-1',
        eventOwnerUserId: OWNER_ID,
        currentUserId: 'checkin-1',
      }),
    ).toThrow('Access denied');
  });

  it('unknown role is rejected', () => {
    expect(() =>
      assertCanDeleteEntry({
        role: 'GUEST',
        entryOwnerUserId: 'a',
        eventOwnerUserId: 'b',
        currentUserId: 'a',
      }),
    ).toThrow('Access denied');
  });
});
