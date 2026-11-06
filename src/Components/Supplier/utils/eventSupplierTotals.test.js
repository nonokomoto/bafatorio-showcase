import { summarizeEventSupplierTotals, summarizeByCategory, filterEventSuppliers, NO_CATEGORY } from './eventSupplierTotals';

describe('summarizeEventSupplierTotals', () => {
  it('counts and totals each status, and commits only APPROVED + PAID', () => {
    const result = summarizeEventSupplierTotals([
      { status: 'PENDING', quoteAmount: 100 },
      { status: 'PENDING', quoteAmount: 50 },
      { status: 'COUNTING_ON', quoteAmount: 300 },
      { status: 'APPROVED', quoteAmount: 200 },
      { status: 'PAID', quoteAmount: 80 },
      { status: 'REJECTED', quoteAmount: 40 },
    ], 'EUR');

    expect(result.counts).toMatchObject({ PENDING: 2, COUNTING_ON: 1, APPROVED: 1, PAID: 1, REJECTED: 1 });
    expect(result.totalsByStatus.PENDING).toEqual([['EUR', 150]]);
    expect(result.totalsByStatus.COUNTING_ON).toEqual([['EUR', 300]]);
    expect(result.totalsByStatus.APPROVED).toEqual([['EUR', 200]]);
    expect(result.totalsByStatus.PAID).toEqual([['EUR', 80]]);
    expect(result.totalsByStatus.REJECTED).toEqual([['EUR', 40]]);
    expect(result.committed).toEqual([['EUR', 280]]);
  });

  it('keeps a per-currency breakdown instead of summing across currencies', () => {
    const result = summarizeEventSupplierTotals([
      { status: 'APPROVED', quoteAmount: 100, currency: 'EUR' },
      { status: 'APPROVED', quoteAmount: 20000, currency: 'CVE' },
      { status: 'APPROVED', quoteAmount: 50 },
    ], 'EUR');

    expect(result.totalsByStatus.APPROVED).toEqual([['EUR', 150], ['CVE', 20000]]);
    expect(result.committed).toEqual([['EUR', 150], ['CVE', 20000]]);
  });

  it('shows zero in the event currency for statuses without quotes', () => {
    const result = summarizeEventSupplierTotals([
      { status: 'PENDING', quoteAmount: null },
      { status: 'UNKNOWN', quoteAmount: 999 },
    ], 'CVE');

    expect(result.counts.PENDING).toBe(1);
    expect(result.totalsByStatus.PENDING).toEqual([['CVE', 0]]);
    expect(result.committed).toEqual([['CVE', 0]]);
  });
});

describe('filterEventSuppliers', () => {
  const list = [
    { id: 1, status: 'APPROVED', supplier: { category: 'CATERING' } },
    { id: 2, status: 'PENDING', supplier: { category: 'CATERING' } },
    { id: 3, status: 'APPROVED', supplier: { category: 'AV' } },
    { id: 4, status: 'APPROVED', supplier: {} },
  ];

  it('combines the status and category filters', () => {
    expect(filterEventSuppliers(list, { status: 'APPROVED', category: 'CATERING' }).map((e) => e.id)).toEqual([1]);
    expect(filterEventSuppliers(list, { category: 'CATERING' }).map((e) => e.id)).toEqual([1, 2]);
    expect(filterEventSuppliers(list, { status: 'APPROVED' }).map((e) => e.id)).toEqual([1, 3, 4]);
    expect(filterEventSuppliers(list, {}).map((e) => e.id)).toEqual([1, 2, 3, 4]);
  });

  it('matches suppliers without a category with the "no category" key', () => {
    expect(filterEventSuppliers(list, { category: NO_CATEGORY }).map((e) => e.id)).toEqual([4]);
  });
});

describe('summarizeByCategory', () => {
  it('counts and totals each category, sorted by name, with "no category" last', () => {
    const result = summarizeByCategory([
      { status: 'APPROVED', quoteAmount: 500, supplier: { category: 'CATERING' } },
      { status: 'PENDING', quoteAmount: 250, supplier: { category: 'CATERING' } },
      { status: 'PAID', quoteAmount: 100, supplier: { category: 'AV' } },
      { status: 'PAID', quoteAmount: 40, supplier: null },
    ], 'EUR');

    expect(result).toEqual([
      { category: 'AV', count: 1, totals: [['EUR', 100]], committed: [['EUR', 100]] },
      { category: 'CATERING', count: 2, totals: [['EUR', 750]], committed: [['EUR', 500]] },
      { category: NO_CATEGORY, count: 1, totals: [['EUR', 40]], committed: [['EUR', 40]] },
    ]);
  });

  it('commits only APPROVED + PAID per category, zero in the event currency otherwise', () => {
    const result = summarizeByCategory([
      { status: 'APPROVED', quoteAmount: 700, supplier: { category: 'MUSICA_DJ' } },
      { status: 'COUNTING_ON', quoteAmount: 900, supplier: { category: 'MUSICA_DJ' } },
      { status: 'REJECTED', quoteAmount: 80, supplier: { category: 'BEBIDAS' } },
      { status: 'PAID', quoteAmount: 20000, currency: 'CVE', supplier: { category: 'MUSICA_DJ' } },
    ], 'EUR');

    expect(result).toEqual([
      { category: 'BEBIDAS', count: 1, totals: [['EUR', 80]], committed: [['EUR', 0]] },
      { category: 'MUSICA_DJ', count: 3, totals: [['EUR', 1600], ['CVE', 20000]], committed: [['EUR', 700], ['CVE', 20000]] },
    ]);
  });
});

describe('summarizeEventSupplierTotals — overall total', () => {
  it('adds every quote regardless of status', () => {
    const result = summarizeEventSupplierTotals([
      { status: 'PENDING', quoteAmount: 10 },
      { status: 'APPROVED', quoteAmount: 20 },
      { status: 'REJECTED', quoteAmount: 5 },
    ], 'EUR');
    expect(result.total).toEqual([['EUR', 35]]);
  });
});

describe('filterEventSuppliers — search', () => {
  const list = [
    { id: 1, status: 'APPROVED', supplier: { name: 'Pastelaria São João', category: 'CATERING' } },
    { id: 2, status: 'PENDING', supplier: { name: 'Som & Luz', category: 'AV' } },
    { id: 3, status: 'APPROVED', supplier: { name: 'Catering Joana', category: 'CATERING' } },
  ];

  it('matches the supplier name ignoring case and accents, combined with the other filters', () => {
    expect(filterEventSuppliers(list, { search: 'sao joao' }).map((e) => e.id)).toEqual([1]);
    expect(filterEventSuppliers(list, { search: 'JOA', category: 'CATERING' }).map((e) => e.id)).toEqual([1, 3]);
    expect(filterEventSuppliers(list, { search: 'joa', status: 'PENDING' })).toEqual([]);
    expect(filterEventSuppliers(list, { search: '   ' }).map((e) => e.id)).toEqual([1, 2, 3]);
  });
});
