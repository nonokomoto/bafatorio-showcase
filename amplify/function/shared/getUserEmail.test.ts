jest.mock('@aws-sdk/client-cognito-identity-provider', () => {
  const mockSend = jest.fn();
  return {
    CognitoIdentityProviderClient: jest.fn(() => ({ send: mockSend })),
    AdminGetUserCommand: jest.fn((input: unknown) => input),
    _mockSend: mockSend,
  };
});

const { _mockSend: mockSend } = jest.requireMock('@aws-sdk/client-cognito-identity-provider') as {
  _mockSend: jest.Mock;
};

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { getUserEmail } = require('./getUserEmail');

const POOL = 'eu-west-1_TESTPOOL';

const respondWith = (attributes: Array<{ Name: string; Value: string }>) =>
  mockSend.mockResolvedValueOnce({ UserAttributes: attributes });

describe('getUserEmail', () => {
  beforeEach(() => mockSend.mockReset());

  it('returns the email from the user attributes', async () => {
    respondWith([{ Name: 'email', Value: 'ana@exemplo.pt' }]);

    const result = await getUserEmail({ userPoolId: POOL, username: 'ana' });

    expect(result.email).toBe('ana@exemplo.pt');
  });

  it('returns the name when the pool has one', async () => {
    respondWith([
      { Name: 'email', Value: 'ana@exemplo.pt' },
      { Name: 'name', Value: 'Ana Silva' },
    ]);

    const result = await getUserEmail({ userPoolId: POOL, username: 'ana' });

    expect(result.name).toBe('Ana Silva');
  });

  it('leaves the name undefined when the pool has none', async () => {
    respondWith([{ Name: 'email', Value: 'ana@exemplo.pt' }]);

    const result = await getUserEmail({ userPoolId: POOL, username: 'ana' });

    expect(result.name).toBeUndefined();
  });

  it('asks Cognito for the given username in the given pool', async () => {
    respondWith([{ Name: 'email', Value: 'ana@exemplo.pt' }]);

    await getUserEmail({ userPoolId: POOL, username: 'ana' });

    expect(mockSend.mock.calls[0][0]).toEqual({ UserPoolId: POOL, Username: 'ana' });
  });

  // Um utilizador sem email é um estado que não deve existir; adivinhar aqui
  // seria pior que falhar, porque o email decide identidade a jusante.
  it('throws when the user has no email attribute', async () => {
    respondWith([{ Name: 'name', Value: 'Ana Silva' }]);

    await expect(getUserEmail({ userPoolId: POOL, username: 'ana' })).rejects.toThrow(
      'Email attribute not found in user attributes'
    );
  });

  it('throws when Cognito returns no attributes at all', async () => {
    mockSend.mockResolvedValueOnce({});

    await expect(getUserEmail({ userPoolId: POOL, username: 'ana' })).rejects.toThrow(
      'Email attribute not found in user attributes'
    );
  });

  it('throws when the Cognito call fails', async () => {
    mockSend.mockRejectedValueOnce(new Error('UserNotFoundException'));

    await expect(getUserEmail({ userPoolId: POOL, username: 'ana' })).rejects.toThrow(
      'Failed to get user email from Cognito'
    );
  });

  it('refuses to call Cognito without a pool id', async () => {
    await expect(getUserEmail({ userPoolId: '', username: 'ana' })).rejects.toThrow(
      'User Pool ID not configured'
    );
    expect(mockSend).not.toHaveBeenCalled();
  });

  // O cliente é criado lá dentro (regra do repo: shared/ tem node_modules
  // próprio, e receber o cliente por parâmetro parte os tipos). Um cliente por
  // chamada abriria um pool de ligações novo a cada invocação da Lambda.
  //
  // Precisa do módulo fresco: o cache é de módulo e já está quente pelos
  // testes acima.
  it('creates the Cognito client once, not per call', async () => {
    const { CognitoIdentityProviderClient } = jest.requireMock('@aws-sdk/client-cognito-identity-provider');
    CognitoIdentityProviderClient.mockClear();

    await jest.isolateModulesAsync(async () => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const fresh = require('./getUserEmail');
      respondWith([{ Name: 'email', Value: 'a@x.pt' }]);
      respondWith([{ Name: 'email', Value: 'b@x.pt' }]);
      await fresh.getUserEmail({ userPoolId: POOL, username: 'a' });
      await fresh.getUserEmail({ userPoolId: POOL, username: 'b' });
    });

    expect(CognitoIdentityProviderClient).toHaveBeenCalledTimes(1);
  });
});
