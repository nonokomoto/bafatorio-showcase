import '@testing-library/jest-dom';
import { jest } from '@jest/globals';

// Mock do Redux
jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
  useDispatch: () => jest.fn(),
  useStore: jest.fn(),
  Provider: ({ children }) => children
}));

// Mock do RTK Query
jest.mock('@reduxjs/toolkit/query/react', () => ({
  fetchBaseQuery: jest.fn().mockReturnValue(jest.fn()),
  createApi: jest.fn(() => ({
    reducerPath: 'api',
    reducer: jest.fn(),
    middleware: jest.fn(),
    injectEndpoints: jest.fn(),
    enhanceEndpoints: jest.fn(),
    useQueryState: jest.fn(),
    useQuerySubscription: jest.fn(),
  })),
  setupListeners: jest.fn(),
}));

// Mock do Redux Toolkit
jest.mock('@reduxjs/toolkit', () => ({
  configureStore: jest.fn(() => ({
    dispatch: jest.fn(),
    getState: jest.fn(),
    subscribe: jest.fn(),
    replaceReducer: jest.fn(),
  })),
  combineReducers: jest.fn((reducers) => reducers),
  createSlice: jest.fn((config) => ({
    name: config.name,
    reducer: jest.fn(),
    actions: Object.keys(config.reducers || {}).reduce((acc, key) => {
      acc[key] = jest.fn();
      return acc;
    }, {}),
  })),
  createAsyncThunk: jest.fn((type) => {
    const actionCreator = jest.fn();
    actionCreator.pending = `${type}/pending`;
    actionCreator.fulfilled = `${type}/fulfilled`;
    actionCreator.rejected = `${type}/rejected`;
    return actionCreator;
  }),
  createSelector: jest.fn((selectors, resultFn) => resultFn),
}));

// Mock SVG
jest.mock('*.svg', () => 'SvgMock');

// Mock CSS modules
jest.mock('*.module.css', () => ({}));

// Mock dos componentes UI
jest.mock('../src/Components/UI', () => {
  const Table = function MockTable({ children, ...props }) { return <div data-testid="table" {...props}>{children}</div>; };
  Table.Head = function MockTableHead({ children, ...props }) { return <thead data-testid="table-head" {...props}>{children}</thead>; };
  Table.Body = function MockTableBody({ children, ...props }) { return <tbody data-testid="table-body" {...props}>{children}</tbody>; };
  Table.Row = function MockTableRow({ children, ...props }) { return <tr data-testid="table-row" {...props}>{children}</tr>; };
  Table.Cell = function MockTableCell({ children, ...props }) { return <td data-testid="table-cell" {...props}>{children}</td>; };
  Table.HeaderCell = function MockTableHeaderCell({ children, ...props }) { return <th data-testid="table-header-cell" {...props}>{children}</th>; };

  return {
    Card: ({ children, ...props }) => <div data-testid="card" {...props}>{children}</div>,
    Button: ({ children, ...props }) => <button data-testid="button" {...props}>{children}</button>,
    Text: ({ children, ...props }) => <span data-testid="text" {...props}>{children}</span>,
    Table
  };
});

// Adicionar mock do matchMedia para testes de responsividade
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Adicionar mock do ResizeObserver
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Limpar todos os mocks após cada teste
afterEach(() => {
  jest.clearAllMocks();
});

// Mock do localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  clear: jest.fn(),
  removeItem: jest.fn()
};
global.localStorage = localStorageMock;

// Mock do sessionStorage
const sessionStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  clear: jest.fn(),
  removeItem: jest.fn()
};
global.sessionStorage = sessionStorageMock;

// Suprimir warnings do console durante os testes
global.console = {
  ...console,
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
};

// Mock react-icons/fi
jest.mock('react-icons/fi', () => ({
  FiBriefcase: () => 'FiBriefcase Icon',
  FiEdit: () => 'FiEdit Icon',
  FiTrash2: () => 'FiTrash2 Icon',
  FiMapPin: () => 'FiMapPin Icon',
  FiTag: () => 'FiTag Icon',
  FiUser: () => 'FiUser Icon',
  FiMail: () => 'FiMail Icon',
  FiGlobe: () => 'FiGlobe Icon',
  FiPhone: () => 'FiPhone Icon',
  FiDollarSign: () => 'FiDollarSign Icon',
  FiFileText: () => 'FiFileText Icon',
  FiPlus: () => 'FiPlus Icon',
  // Ícones da tela de planos / landing (modelo 3 planos)
  FiCalendar: () => 'FiCalendar Icon',
  FiUsers: () => 'FiUsers Icon',
  FiTruck: () => 'FiTruck Icon',
  FiZap: () => 'FiZap Icon',
  FiCheck: () => 'FiCheck Icon',
  FiClock: () => 'FiClock Icon',
  FiCheckCircle: () => 'FiCheckCircle Icon',
  FiFolder: () => 'FiFolder Icon',
  FiUpload: () => 'FiUpload Icon'
}));
