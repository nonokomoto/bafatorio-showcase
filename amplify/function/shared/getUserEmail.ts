import {
  CognitoIdentityProviderClient,
  AdminGetUserCommand,
} from '@aws-sdk/client-cognito-identity-provider';

// Cliente criado aqui dentro, nunca recebido por parâmetro: o shared/ tem
// node_modules próprio e os tipos colidiriam com a cópia do handler.
let cachedClient: CognitoIdentityProviderClient | null = null;
const getCognitoClient = (): CognitoIdentityProviderClient => {
  if (!cachedClient) {
    cachedClient = new CognitoIdentityProviderClient({
      region: process.env.BAFATORIO_APP_REGION || 'eu-west-1',
    });
  }
  return cachedClient;
};

type GetUserEmailInput = {
  userPoolId: string;
  /** O Username do Cognito — NÃO o sub. Vem de identity.claims.username. */
  username: string;
};

type UserIdentity = {
  email: string;
  /** Ausente quando o pool não tem o atributo `name` preenchido. */
  name?: string;
};

/**
 * Devolve o email (e nome) reais de um utilizador, a partir do Cognito.
 *
 * **Porquê ir ao Cognito e não ao token:** os access tokens do AppSync não
 * transportam o email. O `event.identity` só dá `sub` e `username`. Qualquer
 * decisão que dependa do email de quem chama tem de vir daqui — usar um email
 * guardado no registo (ex.: `eventManagerEmail`) é dado sobre outra pessoa,
 * não identidade de conta.
 *
 * Falha em vez de adivinhar: o email decide identidade a jusante, e um palpite
 * aqui vira uma decisão de acesso errada lá à frente.
 */
export async function getUserEmail({
  userPoolId,
  username,
}: GetUserEmailInput): Promise<UserIdentity> {
  if (!userPoolId) {
    throw new Error('User Pool ID not configured');
  }

  let response;
  try {
    response = await getCognitoClient().send(
      new AdminGetUserCommand({ UserPoolId: userPoolId, Username: username })
    );
  } catch (error) {
    console.error('[getUserEmail] Error getting user email from Cognito:', error);
    throw new Error('Failed to get user email from Cognito');
  }

  const email = response.UserAttributes?.find((attr) => attr.Name === 'email')?.Value;
  if (!email) {
    throw new Error('Email attribute not found in user attributes');
  }

  return {
    email,
    name: response.UserAttributes?.find((attr) => attr.Name === 'name')?.Value,
  };
}
