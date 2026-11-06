export const TABLE_COLUMNS = [
  { Header: 'table.columns.select', accessor: 'select', width: '50px' },
  { Header: 'table.columns.name', accessor: 'participantName', width: '240px' },
  { Header: 'table.columns.email', accessor: 'participantEmail', width: '200px' },
  { Header: 'table.columns.category', accessor: 'role', width: '120px' },
  { Header: 'table.columns.status', accessor: 'participantStatus', width: '120px' },
  { Header: 'table.columns.organization', accessor: 'organization', width: '150px' },
  { Header: 'table.columns.registrationDate', accessor: 'registrationDate', width: '120px' },
  { Header: 'table.columns.dependents', accessor: 'dependentsCount', width: '100px' }
];

export const ITEMS_PER_PAGE = 100;

// Filter options
export const PARTICIPANT_STATUSES = ['REGISTERED', 'CONFIRMED', 'CANCELLED', 'ATTENDED'];
export const PAYMENT_STATUSES = ['PENDING', 'PAID', 'PARTIAL'];
export const DEPENDENT_CATEGORIES = ['child', 'baby', 'adult'];

// Default filter state
export const DEFAULT_FILTERS = {
  status: '',
  roleId: '',
  dependentCategory: ''
};