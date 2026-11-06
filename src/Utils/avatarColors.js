/**
 * @file avatarColors.js
 * @description Deterministic avatar color generation from email/name
 * Uses djb2 hash to assign a consistent color to each user
 */

const AVATAR_PALETTE = [
  { bg: 'bg-blue-600', text: 'text-white' },
  { bg: 'bg-pink-600', text: 'text-white' },
  { bg: 'bg-amber-500', text: 'text-white' },
  { bg: 'bg-green-600', text: 'text-white' },
  { bg: 'bg-purple-600', text: 'text-white' },
  { bg: 'bg-rose-600', text: 'text-white' },
  { bg: 'bg-teal-600', text: 'text-white' },
  { bg: 'bg-indigo-600', text: 'text-white' },
  { bg: 'bg-orange-600', text: 'text-white' },
  { bg: 'bg-cyan-600', text: 'text-white' },
];

/**
 * djb2 hash function — exportada como fonte única (roleBadgeConfig e
 * protótipos consomem daqui; não duplicar).
 */
export function djb2(str) {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 33) ^ str.charCodeAt(i);
  }
  return hash >>> 0;
}

/**
 * Get deterministic avatar color classes from an identifier (email)
 * @param {string} identifier - Email or unique string
 * @returns {{ bg: string, text: string }}
 */
export function getAvatarColor(identifier = '') {
  const index = djb2(identifier.toLowerCase()) % AVATAR_PALETTE.length;
  return AVATAR_PALETTE[index];
}

/**
 * Get initials from a user name or email
 * @param {string} [userName] - Full name (preferred)
 * @param {string} [email] - Email fallback
 * @returns {string} 1-2 character initials
 */
export function getInitials(userName, email) {
  if (userName && userName.trim()) {
    const parts = userName.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return parts[0].substring(0, 2).toUpperCase();
  }

  if (email) {
    const local = email.split('@')[0] || '';
    const parts = local.split(/[._-]/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return local.substring(0, 2).toUpperCase();
  }

  return '??';
}
