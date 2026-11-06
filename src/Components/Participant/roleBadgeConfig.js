import { djb2 } from '../../Utils/avatarColors';

/**
 * Highlight palette for event roles. The keys are what the Role record stores
 * (`Role.color`) and must match ROLE_COLOR_KEYS in update-event-role/handler.ts.
 *
 * `bg` + `text` is the solid badge used wherever a role shows up; every pair
 * keeps a WCAG AA contrast of at least 4.5:1.
 */
export const ROLE_COLORS = {
  blue:   { key: 'blue',   bg: '#2563EB', text: '#FFFFFF' },
  violet: { key: 'violet', bg: '#7C3AED', text: '#FFFFFF' },
  amber:  { key: 'amber',  bg: '#F59E0B', text: '#1F2937' },
  green:  { key: 'green',  bg: '#047857', text: '#FFFFFF' },
  pink:   { key: 'pink',   bg: '#BE185D', text: '#FFFFFF' },
  red:    { key: 'red',    bg: '#B91C1C', text: '#FFFFFF' },
  indigo: { key: 'indigo', bg: '#4F46E5', text: '#FFFFFF' },
  orange: { key: 'orange', bg: '#C2410C', text: '#FFFFFF' },
  teal:   { key: 'teal',   bg: '#0F766E', text: '#FFFFFF' },
  slate:  { key: 'slate',  bg: '#475569', text: '#FFFFFF' },
};

export const ROLE_COLOR_KEYS = Object.keys(ROLE_COLORS);

// Privados do módulo. A ordem do automático mantém as cores que as roles já
// tinham antes de se poder escolher uma (mesmo hash, mesma posição).
const DEFAULT_ROLE_COLORS = {
  VIP: 'amber',
  Speaker: 'violet',
  Attendee: 'blue',
  Media: 'pink',
  Team: 'green',
};
const AUTO_COLOR_KEYS = ['blue', 'violet', 'amber', 'green', 'pink', 'red', 'indigo', 'orange'];

/**
 * @param {string} roleName
 * @param {Record<string, object>} [roleStyles] explicit per-name override
 * @param {string|null} [colorKey] color chosen for the role (Role.color)
 */
export function getRoleStyle(roleName, roleStyles, colorKey) {
  if (colorKey && ROLE_COLORS[colorKey]) return ROLE_COLORS[colorKey];
  if (roleStyles?.[roleName]) return roleStyles[roleName];
  if (DEFAULT_ROLE_COLORS[roleName]) return ROLE_COLORS[DEFAULT_ROLE_COLORS[roleName]];
  const index = djb2(roleName || '') % AUTO_COLOR_KEYS.length;
  return ROLE_COLORS[AUTO_COLOR_KEYS[index]];
}
