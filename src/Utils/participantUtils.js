// src/Utils/participantUtils.js

/**
 * Generates a dynamic link for updating a participant's status.
 *
 * @param {string} participantId - The ID of the participant.
 * @param {string} eventId - The ID of the event.
 * @param {string} newStatus - The new status to be set.
 * @param {string} baseUrl - The base URL of the application.
 * @param {string} [language] - (Opcional) O código do idioma a ser incluído na URL.
 * @returns {string} The generated dynamic link.
 * @throws {Error} If any required parameter is missing or if the status is invalid.
 */
export const generateStatusUpdateLink = (participantId, eventId, newStatus, baseUrl, language) => {
  if (!participantId || !eventId || !newStatus || !baseUrl) {
    throw new Error('All parameters are required to generate the status update link.');
  }

  if (!isValidStatus(newStatus)) {
    throw new Error(`Invalid status: ${newStatus}`);
  }

  const encodedId = encodeURIComponent(participantId);
  const encodedEventId = encodeURIComponent(eventId);
  const encodedStatus = encodeURIComponent(newStatus);
  const langParam = language ? `&lang=${encodeURIComponent(language)}` : '';

  // Include eventId in the URL for potential backend validation
  return `${baseUrl}/update-status?id=${encodedId}&eventId=${encodedEventId}&status=${encodedStatus}${langParam}`;
};

/**
 * Checks if a given status is valid.
 *
 * @param {string} status - The status to be checked.
 * @returns {boolean} True if the status is valid, false otherwise.
 */
export const isValidStatus = (status) => {
  const validStatuses = ['CONFIRMED', 'PENDING', 'CANCELLED'];
  return validStatuses.includes(status.toUpperCase());
};

/**
 * Extracts status update parameters from a URL or search string.
 *
 * @param {string} search - The URL or search string containing the parameters.
 * @returns {Object} An object containing participantId, eventId, and newStatus.
 */
export const extractStatusUpdateParams = (search) => {
  console.log("Received search string:", search); // Log para debug

  // Se search for undefined ou null, retorne valores padrão
  if (!search) {
    console.log("Search string is empty or undefined");
    return { participantId: null, eventId: null, newStatus: null };
  }

  // Remova o '?' inicial se estiver presente
  const queryString = search.startsWith('?') ? search.slice(1) : search;

  console.log("Processed query string:", queryString); // Log para debug

  // Use URLSearchParams para analisar a string de consulta
  const params = new URLSearchParams(queryString);

  const result = {
    participantId: params.get('id'),
    eventId: params.get('eventId'),
    newStatus: params.get('status'),
    lang: params.get('lang')
  };

  console.log("Extracted params:", result); // Log para debug

  return result;
};

/**
 * Checks if a given string is a valid URL.
 *
 * @param {string} string - The string to be checked.
 * @returns {boolean} True if the string is a valid URL, false otherwise.
 */
export const isValidUrl = (string) => {
  try {
    new URL(string);
    return true;
  } catch (_) {
    return false;
  }
};

// You can add other participant-related utility functions here