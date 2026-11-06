import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import i18n from 'i18next';
import { formatTime } from '../utils/dateFormatters';
import { ERROR_MESSAGES } from '../utils/constants';
import { generateStatusUpdateLink } from '../../../../Utils/participantUtils';
import { formatEventDateForEmail } from '../../../../Utils/formatEventDateForEmail';

const eventTimeToHHMM = (eventTime) => (eventTime ? eventTime.slice(0, 5) : '');

/**
 * Hook for managing email templates
 * @returns {Object} Template management methods and state
 */
export const useTemplates = () => {
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const { t } = useTranslation('participant');

  /**
   * Prepares template data with participant and event information
   * @param {Array} participants - Array of participant objects
   * @param {Object} event - Event data object
   * @param {File|null} attachment - Optional attachment file
   * @param {boolean} isPreview - Flag indicating if data is for preview
   * @returns {Object} Prepared template data for one or multiple participants
   */
  const prepareTemplateData = async (participants, event, attachment, isPreview = false) => {
    // Obtenha o idioma atual diretamente do i18n, como fazemos no SendEmail
    const currentLanguage = i18n.language.substring(0, 2);

    // Validate inputs
    if (!Array.isArray(participants) || participants.length === 0 || !event || !selectedTemplate) {
      console.error('Invalid input for prepareTemplateData:', { participants, event, selectedTemplate });
      throw new Error(t(ERROR_MESSAGES.SENDING.PREPARATION));
    }

    const baseUrl = window.location.origin;
    const firstParticipant = participants[0]; // Use for preview or single-recipient data

    // Generate confirmation links usando o idioma atual
    const confirmationLinks = participants.map(p => 
      generateStatusUpdateLink(p.id, event.id, 'CONFIRMED', baseUrl, currentLanguage)
    );

    const eventManagerName = event.eventManager || t('email.preview.defaultManager');
    const eventManagerContact = (event.eventManagerEmail && event.eventManagerPhone) 
      ? `${event.eventManagerEmail} / ${event.eventManagerPhone}` 
      : event.eventManagerEmail || event.eventManagerPhone || t('email.preview.defaultContact');
    const langKey = (currentLanguage || '').slice(0, 2);
    const emailLang = ['pt', 'en', 'fr'].includes(langKey) ? langKey : 'pt';
    const formattedEventDate = formatEventDateForEmail(event, emailLang);
    const eventDateFields = {
      eventDateType: event.eventDateType ?? null,
      eventStartDate: event.eventStartDate ?? null,
      eventEndDate: event.eventEndDate ?? null,
      eventSpecificDates: event.eventSpecificDates ?? null,
    };
    const formattedEventTime = event.eventTime
        ? formatTime(eventTimeToHHMM(event.eventTime))
        : '';

    // Prepare data based on whether it's a preview or actual send
    let templatePayload = {};

    if (isPreview) {
      // --- Prepare data for a single participant preview ---
      templatePayload = {
        to: [firstParticipant.participantEmail].filter(Boolean), // Ensure email exists
        emailType: selectedTemplate,
        participantName: [firstParticipant.participantName].filter(Boolean),
        eventName: event.eventTitle,
        eventId: event.id,
        participantId: [firstParticipant.id].filter(Boolean),
        eventDate: formattedEventDate,
        ...eventDateFields,
        eventTime: formattedEventTime,
        eventLocation: event.eventLocation,
        eventManagerName,
        eventManagerContact,
        confirmationLink: [confirmationLinks[0]].filter(Boolean), // Single link for preview
        // Include other fields potentially used in previews, sourcing from the first participant
        eventManager: eventManagerName,
        eventTitle: event.eventTitle,
        eventType: event.eventType,
        eventCategories: Array.isArray(event.categories) ? event.categories.join(', ') : '',
        participantEmail: [firstParticipant.participantEmail].filter(Boolean),
        roleId: firstParticipant.roleId,
        participantJob: firstParticipant.participantJob,
        eventManagerEmail: event.eventManagerEmail,
        eventManagerPhone: event.eventManagerPhone
      };
    } else {
      // --- Prepare data for sending to multiple participants ---
      templatePayload = {
        to: participants.map(p => p.participantEmail).filter(Boolean),
        emailType: selectedTemplate,
        participantName: participants.map(p => p.participantName).filter(Boolean),
        eventName: event.eventTitle,
        eventId: event.id,
        participantId: participants.map(p => p.id).filter(Boolean),
        // Event details are the same for all
        eventDate: formattedEventDate,
        ...eventDateFields,
        eventTime: formattedEventTime,
        eventLocation: event.eventLocation,
        eventManagerName,
        eventManagerContact,
        confirmationLink: confirmationLinks, // Array of links
        // Other event details potentially needed by the mutation
        eventManager: eventManagerName,
        eventTitle: event.eventTitle,
        eventType: event.eventType,
        // Add participantEmail array explicitly for validation/mutation
        participantEmail: participants.map(p => p.participantEmail).filter(Boolean)
        // Note: Fields specific to a single participant (like role, job) 
        // might not be directly usable in the sendEmail mutation if it sends one email
        // to multiple recipients via BCC, unless the backend template handles arrays.
        // Adjust based on how sendEmail mutation and templates work.
      };
    }

    // --- Filter based on required fields (Optional but good practice) ---
    // This step might be unnecessary if the sendEmail mutation ignores extra fields.
    // Keep it if strict payload matching is required.
    // const requiredFields = TEMPLATE_REQUIRED_FIELDS[selectedTemplate];
    // if (!requiredFields) {
    //   console.warn(`No required fields defined for template: ${selectedTemplate}`);
    //   return templatePayload; // Return all data if no specific requirements found
    // }
    // const filteredData = Object.fromEntries(
    //   Object.entries(templatePayload).filter(([key]) => 
    //     requiredFields.includes(key)
    //   )
    // );
    // return filteredData;

    // Return the full payload for flexibility, assuming sendEmail mutation handles it
    return templatePayload; 
  };

  return {
    selectedTemplate,
    setSelectedTemplate,
    prepareTemplateData
  };
};
