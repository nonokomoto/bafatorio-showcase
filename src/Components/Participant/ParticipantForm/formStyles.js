/**
 * Shared form styles for ParticipantForm components.
 * Uses semantic design tokens (neutral-*, text-*, primary-*, error-*).
 */

export const baseInput =
  'w-full text-sm border rounded-lg px-3.5 py-2.5 bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1';

export const inputCls = (hasError) =>
  `${baseInput} ${hasError ? 'border-error-500 focus:border-error-500 focus:ring-error-500' : 'border-input focus:border-primary-500 focus:ring-primary-500'}`;

export const labelCls = 'block text-sm font-medium mb-1 text-foreground';

export const requiredStar = 'text-error-500';

export const errorMsg = 'text-xs mt-1 block text-error-500';

export const sectionTitle = 'text-sm font-semibold text-foreground m-0';
