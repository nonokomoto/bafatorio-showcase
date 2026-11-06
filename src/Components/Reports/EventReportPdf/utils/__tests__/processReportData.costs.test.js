import { processReportData } from '../processReportData';

const baseData = (eventSuppliers) => ({
  events: [{ id: 'evt-1', name: 'Evento', currency: 'EUR' }],
  participants: [],
  dependents: [],
  eventSuppliers,
});

describe('processReportData — supplier costs by status', () => {
  it('reports COUNTING_ON ("A contar") separately and keeps it out of the committed total', () => {
    const result = processReportData(
      baseData([
        { eventId: 'evt-1', status: 'APPROVED', quoteAmount: 100, supplier: { name: 'A' } },
        { eventId: 'evt-1', status: 'PAID', quoteAmount: 50, supplier: { name: 'B' } },
        { eventId: 'evt-1', status: 'COUNTING_ON', quoteAmount: 300, supplier: { name: 'C' } },
      ]),
      'evt-1',
    );

    const { costs } = result.metrics;
    expect(costs.byStatus.COUNTING_ON).toBe(300);
    expect(costs.committedTotal).toBe(150);
    expect(costs.ranking.map((r) => r.status)).toContain('COUNTING_ON');
  });
});
