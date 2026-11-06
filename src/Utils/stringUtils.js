/**
 * String Utility Functions
 * 
 * Functions for string manipulation, normalization, and search operations.
 */

/**
 * Normalizes a string for case-insensitive and accent-insensitive comparison.
 * 
 * This function:
 * - Converts to lowercase
 * - Removes diacritics/accents (e.g., é → e, ã → a, ç → c)
 * - Removes special characters (keeps only alphanumeric and spaces)
 * 
 * @param {string} str - The string to normalize
 * @returns {string} - The normalized string
 * 
 * @example
 * normalizeString('José') // returns 'jose'
 * normalizeString('Café') // returns 'cafe'
 * normalizeString('São Paulo') // returns 'sao paulo'
 * normalizeString('María García') // returns 'maria garcia'
 */
export const normalizeString = (str) => {
  if (!str || typeof str !== 'string') return '';
  
  return str
    .toLowerCase()
    .normalize('NFD') // Decompose accented characters
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritical marks
    .replace(/[^a-z0-9\s]/g, ''); // Keep only alphanumeric and spaces
};

/**
 * Checks if a search term matches a target string using normalized comparison.
 * 
 * @param {string} target - The string to search in
 * @param {string} searchTerm - The term to search for
 * @returns {boolean} - True if the normalized search term is found in the normalized target
 * 
 * @example
 * matchesSearch('José Carlos', 'jose') // returns true
 * matchesSearch('São Paulo', 'sao') // returns true
 * matchesSearch('María García', 'garcia') // returns true
 */
export const matchesSearch = (target, searchTerm) => {
  return normalizeString(target).includes(normalizeString(searchTerm));
};

/**
 * Creates a filter function that searches multiple fields of an object.
 * 
 * @param {string[]} fields - Array of field names to search in
 * @param {string} searchTerm - The term to search for
 * @returns {function} - A filter function that returns true if any field matches
 * 
 * @example
 * const filter = createSearchFilter(['name', 'email'], 'josé');
 * participants.filter(filter);
 */
export const createSearchFilter = (fields, searchTerm) => {
  if (!searchTerm) return () => true;
  
  const normalizedSearch = normalizeString(searchTerm);
  
  return (item) => {
    return fields.some(field => {
      const value = item?.[field];
      if (!value) return false;
      return normalizeString(value).includes(normalizedSearch);
    });
  };
};
