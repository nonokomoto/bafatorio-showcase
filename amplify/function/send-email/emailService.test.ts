import { buildEmailTemplateParams } from './emailService';

const baseData = {
  recipient: {
    name: 'Ana Silva',
    email: 'ana@example.com',
  },
  participantId: 'participant-1',
  eventId: 'event-1',
  eventName: 'Gala',
  eventDate: '15 de maio',
  eventTime: '14:30:00.000',
  eventLocation: 'Lisboa',
  eventManagerName: 'Manager',
  eventManagerContact: 'manager@example.com',
  confirmationLink: 'https://example.com/confirm',
  language: 'pt' as const,
};

describe('buildEmailTemplateParams', () => {
  it('formats raw range fields for send-email templates', () => {
    const params = buildEmailTemplateParams({
      ...baseData,
      eventDateType: 'range',
      eventStartDate: '2025-05-02',
      eventEndDate: '2025-05-10',
    });

    expect(params.eventDate).toMatch(/entre 2 a 10 de maio/i);
    expect(params.eventTime).toBe('14:30');
  });

  it('keeps an already formatted frontend date instead of parsing it as ISO', () => {
    const params = buildEmailTemplateParams({
      ...baseData,
      eventDate: 'entre 2 a 10 de maio',
      eventTime: '09:15',
    });

    expect(params.eventDate).toBe('entre 2 a 10 de maio');
    expect(params.eventTime).toBe('09:15');
  });

  it('uses the first link for array-based bulk payloads', () => {
    const params = buildEmailTemplateParams({
      ...baseData,
      confirmationLink: ['https://example.com/one', 'https://example.com/two'],
    });

    expect(params.confirmationLink).toBe('https://example.com/one');
    expect(params.invitationLink).toBe('https://example.com/one');
  });
});
