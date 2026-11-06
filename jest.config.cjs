const frontendProject = {
  displayName: 'frontend',
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/src/setupTests.js'],
  moduleNameMapper: {
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
    '^@/(.*)$': '<rootDir>/src/$1',
    '\\.svg$': '<rootDir>/src/__mocks__/svgrMock.js',
    '^src/(.*)$': '<rootDir>/src/$1',
    // Vite entende `import x from './y.hbs?raw'` nativamente; o Jest não
    // resolve o sufixo `?raw` como ficheiro. Tira o sufixo aqui para o Jest
    // resolver o .hbs real, e o transform abaixo devolve-o como string.
    '^(.*)\\.hbs\\?raw$': '$1.hbs',
  },
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': ['babel-jest', { presets: ['@babel/preset-env', ['@babel/preset-react', { runtime: 'automatic' }], '@babel/preset-typescript'] }],
    '\\.hbs$': '<rootDir>/src/__mocks__/rawLoaderTransform.cjs',
  },
  testMatch: [
    '<rootDir>/src/**/__tests__/**/*.{js,jsx,ts,tsx}',
    '<rootDir>/src/**/*.{spec,test}.{js,jsx,ts,tsx}',
  ],
  moduleDirectories: ['node_modules', 'src'],
  testEnvironmentOptions: { url: 'http://localhost' },
  collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}',
    '!src/**/*.d.ts',
    '!src/main.jsx',
    '!src/vite-env.d.ts',
  ],
};

const lambdaProject = {
  displayName: 'lambda',
  testEnvironment: 'node',
  transform: {
    // .js incluído: o teste de sync dos planos importa src/Utils/plans.js (ESM)
    '^.+\\.(js|ts)$': ['babel-jest', { presets: ['@babel/preset-env', '@babel/preset-typescript'] }],
  },
  // Deduplicate AWS SDK copies: shared/ has its own node_modules but tests must
  // mock the unified module path so jest.mock() intercepts both call sites.
  moduleNameMapper: {
    '^@aws-sdk/client-dynamodb$': '<rootDir>/node_modules/@aws-sdk/client-dynamodb',
    '^@aws-sdk/util-dynamodb$': '<rootDir>/node_modules/@aws-sdk/util-dynamodb',
    '^@aws-sdk/client-cloudwatch$': '<rootDir>/node_modules/@aws-sdk/client-cloudwatch',
    '^@aws-sdk/client-s3$': '<rootDir>/node_modules/@aws-sdk/client-s3',
    '^@aws-sdk/client-cognito-identity-provider$': '<rootDir>/node_modules/@aws-sdk/client-cognito-identity-provider',
  },
  testMatch: [
    '<rootDir>/amplify/function/**/*.test.ts',
    '<rootDir>/amplify/auth/**/*.test.ts',
  ],
};

module.exports = {
  projects: [frontendProject, lambdaProject],
  verbose: true,
};
