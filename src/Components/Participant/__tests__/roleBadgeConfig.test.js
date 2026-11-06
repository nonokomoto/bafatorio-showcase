import { getRoleStyle, ROLE_COLORS } from '../roleBadgeConfig';

describe('getRoleStyle', () => {
  it('uses the color chosen for the role', () => {
    const style = getRoleStyle('Convidados', undefined, 'teal');
    expect(style).toEqual(ROLE_COLORS.teal);
  });

  it('ignores an unknown color key and falls back to the automatic color', () => {
    expect(getRoleStyle('VIP', undefined, 'neon')).toEqual(ROLE_COLORS.amber);
  });

  it('keeps the known defaults for common role names', () => {
    expect(getRoleStyle('VIP').key).toBe('amber');
    expect(getRoleStyle('Speaker').key).toBe('violet');
  });

  it('derives a stable automatic color for any other name', () => {
    const first = getRoleStyle('Staff de bar');
    expect(getRoleStyle('Staff de bar')).toEqual(first);
    expect(Object.keys(ROLE_COLORS)).toContain(first.key);
  });

  it('gives every color a background and a readable text color', () => {
    Object.values(ROLE_COLORS).forEach((c) => {
      expect(c.bg).toMatch(/^#[0-9A-F]{6}$/i);
      expect(c.text).toMatch(/^#[0-9A-F]{6}$/i);
    });
  });
});
