/**
 * @file create-event/handler.test.ts
 * @description Gate de conta na criação de eventos (§3 do modelo canónico):
 * o servidor decide o planKey (snapshot imutável) e consome a PlanPurchase —
 * o cliente nunca escolhe o plano nem o organizerId.
 * O gate em si (resolveAccountEntitlements) é mockado diretamente, como manda
 * o CLAUDE.md para shared functions; as leituras estão testadas no módulo shared.
 */
import { handler } from './handler';

jest.mock('@aws-sdk/client-dynamodb', () => {
  const mockSend = jest.fn();
  return {
    DynamoDBClient: jest.fn(() => ({ send: mockSend })),
    PutItemCommand: jest.fn((input: unknown) => ({ __type: 'PutItem', ...(input as object) })),
    TransactWriteItemsCommand: jest.fn((input: unknown) => ({ __type: 'TransactWrite', ...(input as object) })),
    _mockSend: mockSend,
  };
});

jest.mock('../../shared/resolveAccountEntitlements', () => ({
  resolveAccountEntitlements: jest.fn(),
}));

jest.mock('../../shared/getUserEmail', () => ({
  getUserEmail: jest.fn(),
}));

const { _mockSend: mockSend } = jest.requireMock('@aws-sdk/client-dynamodb') as {
  _mockSend: jest.Mock;
};
const { resolveAccountEntitlements: mockResolve } = jest.requireMock(
  '../../shared/resolveAccountEntitlements'
) as { resolveAccountEntitlements: jest.Mock };
const { getUserEmail: mockGetUserEmail } = jest.requireMock('../../shared/getUserEmail') as {
  getUserEmail: jest.Mock;
};

const EVENT_TABLE = 'test-event-table';
const PLAN_PURCHASE_TABLE = 'test-plan-purchase-table';
const USER_POOL_ID = 'test-pool';

const makeEvent = (args: Record<string, unknown>, userId = 'user-1') => ({
  arguments: args,
  identity: { sub: userId, username: userId },
});

const baseArgs = {
  eventTitle: 'Festa de Verão',
  eventDateType: 'specific',
  eventStatus: 'SCHEDULED',
  budget: 500,
  currency: 'EUR',
};

beforeEach(() => {
  mockSend.mockReset();
  mockResolve.mockReset();
  mockGetUserEmail.mockReset();
  mockGetUserEmail.mockResolvedValue({ email: 'dono@exemplo.pt', name: 'Ney Carvalho' });
  process.env.BAFATORIO_APP_EVENT_TABLE_NAME = EVENT_TABLE;
  process.env.BAFATORIO_APP_USER_SUBSCRIPTION_TABLE_NAME = 'test-user-subscription-table';
  process.env.BAFATORIO_APP_PLAN_PURCHASE_TABLE_NAME = PLAN_PURCHASE_TABLE;
  process.env.BAFATORIO_APP_USER_POOL_ID = USER_POOL_ID;
});

const putItem = () =>
  mockSend.mock.calls.map(([cmd]) => cmd).find((cmd) => cmd.__type === 'PutItem').Item;

const grant = (
  planKey: string,
  reason: string,
  firstUnconsumedPurchaseId: string | null = null,
  firstUnconsumedPurchaseTierKey: string | null = null
) =>
  mockResolve.mockResolvedValueOnce({
    planKey,
    canCreateEvent: true,
    reason,
    firstUnconsumedPurchaseId,
    firstUnconsumedPurchaseTierKey,
  });

const deny = (planKey: string, reason: string) =>
  mockResolve.mockResolvedValueOnce({ planKey, canCreateEvent: false, reason, firstUnconsumedPurchaseId: null });

describe('create-event handler — gate de conta', () => {
  it('conta Starter com margem: cria o evento com planKey STARTER e owner do identity', async () => {
    grant('STARTER', 'WITHIN_STARTER_LIMIT');
    mockSend.mockResolvedValueOnce({}); // PutItem do Event

    const result = await handler(makeEvent(baseArgs) as never);

    expect(result.success).toBe(true);
    expect(result.event?.planKey).toBe('STARTER');
    expect(result.event?.organizerId).toBe('user-1');
    expect(result.event?.eventTitle).toBe('Festa de Verão');

    // O gate recebe o userId do identity e as tabelas do ambiente
    expect(mockResolve).toHaveBeenCalledWith({
      userId: 'user-1',
      eventTableName: EVENT_TABLE,
      subscriptionTableName: 'test-user-subscription-table',
      planPurchaseTableName: PLAN_PURCHASE_TABLE,
    });

    const put = mockSend.mock.calls.map(([cmd]) => cmd).find((cmd) => cmd.__type === 'PutItem');
    expect(put.TableName).toBe(EVENT_TABLE);
    expect(put.Item.planKey.S).toBe('STARTER');
    expect(put.Item.owner.S).toBe('user-1::user-1');
    expect(put.Item.__typename.S).toBe('Event');
  });

  it('conta ADMIN: cria com snapshot planKey PRO, sem TransactWrite de consumo (ADR-036)', async () => {
    // O reason ADMIN nunca traz firstUnconsumedPurchaseId — mesmo que o admin
    // tenha compras pendentes, o gate curto-circuita antes (não as consome).
    grant('PRO', 'ADMIN');
    mockSend.mockResolvedValueOnce({}); // PutItem simples do Event

    const result = await handler(makeEvent(baseArgs) as never);

    expect(result.success).toBe(true);
    expect(result.event?.planKey).toBe('PRO');

    const put = mockSend.mock.calls.map(([cmd]) => cmd).find((cmd) => cmd.__type === 'PutItem');
    expect(put.Item.planKey.S).toBe('PRO');
    const transact = mockSend.mock.calls.map(([cmd]) => cmd).find((cmd) => cmd.__type === 'TransactWrite');
    expect(transact).toBeUndefined();
  });

  it('gate recusa (ex.: STARTER_LIMIT_REACHED): devolve o reason e não escreve nada', async () => {
    deny('STARTER', 'STARTER_LIMIT_REACHED');

    const result = await handler(makeEvent(baseArgs) as never);

    expect(result.success).toBe(false);
    expect(result.message).toBe('STARTER_LIMIT_REACHED');
    expect(result.event).toBeUndefined();
    expect(mockSend).not.toHaveBeenCalled();
  });

  it('compra Pay-per-event por consumir: cria com planKey PAY_PER_EVENT e consome a compra na mesma transação', async () => {
    grant('PAY_PER_EVENT', 'PURCHASE_AVAILABLE', 'purchase-1');
    mockSend.mockResolvedValueOnce({}); // TransactWriteItems

    const result = await handler(makeEvent(baseArgs) as never);

    expect(result.success).toBe(true);
    expect(result.event?.planKey).toBe('PAY_PER_EVENT');

    const transact = mockSend.mock.calls.map(([cmd]) => cmd).find((cmd) => cmd.__type === 'TransactWrite');
    expect(transact).toBeDefined();

    const [putItem, updateItem] = transact.TransactItems;
    expect(putItem.Put.TableName).toBe(EVENT_TABLE);
    expect(putItem.Put.Item.planKey.S).toBe('PAY_PER_EVENT');

    expect(updateItem.Update.TableName).toBe(PLAN_PURCHASE_TABLE);
    expect(updateItem.Update.Key.id.S).toBe('purchase-1');
    // Anti-consumo-duplo + anti-refund: nem duas criações simultâneas nem um
    // refund entre a leitura do gate e o consumo podem gastar esta compra
    expect(updateItem.Update.ConditionExpression).toBe(
      'attribute_not_exists(consumedByEventId) AND attribute_not_exists(refundedAt)'
    );
    const eventId = putItem.Put.Item.id.S;
    expect(updateItem.Update.ExpressionAttributeValues[':eventId'].S).toBe(eventId);
  });

  describe('teto do escalão comprado (ADR-038)', () => {
    it('escalão com teto: congela participantLimit no evento', async () => {
      grant('PAY_PER_EVENT', 'PURCHASE_AVAILABLE', 'purchase-1', 'PPE_100');
      mockSend.mockResolvedValueOnce({});

      const result = await handler(makeEvent(baseArgs) as never);

      expect(result.event?.participantLimit).toBe(100);
      const transact = mockSend.mock.calls.map(([cmd]) => cmd).find((cmd) => cmd.__type === 'TransactWrite');
      expect(transact.TransactItems[0].Put.Item.participantLimit.N).toBe('100');
    });

    it('escalão sem teto: não escreve o campo — ausente é a representação do ilimitado', async () => {
      grant('PAY_PER_EVENT', 'PURCHASE_AVAILABLE', 'purchase-1', 'PPE_UNLIMITED');
      mockSend.mockResolvedValueOnce({});

      const result = await handler(makeEvent(baseArgs) as never);

      expect(result.event?.participantLimit).toBeUndefined();
      const transact = mockSend.mock.calls.map(([cmd]) => cmd).find((cmd) => cmd.__type === 'TransactWrite');
      expect(transact.TransactItems[0].Put.Item.participantLimit).toBeUndefined();
    });

    it('compra anterior aos escalões (sem tierKey): evento sem teto', async () => {
      grant('PAY_PER_EVENT', 'PURCHASE_AVAILABLE', 'purchase-1');
      mockSend.mockResolvedValueOnce({});

      const result = await handler(makeEvent(baseArgs) as never);

      expect(result.event?.participantLimit).toBeUndefined();
    });

    it('Starter e Pro nunca congelam teto — os limites vêm do catálogo', async () => {
      grant('STARTER', 'WITHIN_STARTER_LIMIT');
      mockSend.mockResolvedValueOnce({});
      const starter = await handler(makeEvent(baseArgs) as never);
      expect(starter.event?.participantLimit).toBeUndefined();

      grant('PRO', 'PRO_ACTIVE');
      mockSend.mockResolvedValueOnce({});
      const pro = await handler(makeEvent(baseArgs) as never);
      expect(pro.event?.participantLimit).toBeUndefined();
    });
  });

  it('Pro ativo: cria com planKey PRO sem transação de consumo', async () => {
    grant('PRO', 'PRO_ACTIVE');
    mockSend.mockResolvedValueOnce({}); // PutItem

    const result = await handler(makeEvent(baseArgs) as never);

    expect(result.success).toBe(true);
    expect(result.event?.planKey).toBe('PRO');

    const transact = mockSend.mock.calls.map(([cmd]) => cmd).find((cmd) => cmd.__type === 'TransactWrite');
    expect(transact).toBeUndefined();
  });

  it('ignora id, planKey, organizerId, owner e a identidade do dono injetados pelo cliente — o servidor decide', async () => {
    grant('STARTER', 'WITHIN_STARTER_LIMIT');
    mockSend.mockResolvedValueOnce({}); // PutItem

    const result = await handler(makeEvent({
      ...baseArgs,
      id: 'id-do-atacante',
      planKey: 'PRO',
      organizerId: 'outro-user',
      owner: 'outro-user::outro-user',
      ownerName: 'Impostor',
      ownerEmail: 'impostor@exemplo.pt',
    }) as never);

    expect(result.success).toBe(true);
    const put = mockSend.mock.calls.map(([cmd]) => cmd).find((cmd) => cmd.__type === 'PutItem');
    expect(put.Item.id.S).not.toBe('id-do-atacante');
    expect(put.Item.planKey.S).toBe('STARTER');
    expect(put.Item.organizerId.S).toBe('user-1');
    expect(put.Item.owner.S).toBe('user-1::user-1');
    // A identidade do dono é a que o Cognito devolve, nunca a que o cliente manda
    expect(put.Item.ownerName.S).toBe('Ney Carvalho');
    expect(put.Item.ownerEmail.S).toBe('dono@exemplo.pt');
  });

  it('sem identity: recusa com UNAUTHENTICATED e não consulta o gate nem escreve', async () => {
    const result = await handler({ arguments: baseArgs, identity: undefined } as never);

    expect(result.success).toBe(false);
    expect(result.message).toBe('UNAUTHENTICATED');
    expect(mockResolve).not.toHaveBeenCalled();
    expect(mockSend).not.toHaveBeenCalled();
  });

  it('escreve os campos que o eventStream/email consome e inicializa participantCount a 0', async () => {
    grant('STARTER', 'WITHIN_STARTER_LIMIT');
    mockSend.mockResolvedValueOnce({}); // PutItem

    await handler(makeEvent({
      ...baseArgs,
      eventManager: 'Ney',
      eventManagerEmail: 'ney@example.com',
      eventManagerPhone: '+351911111111',
      eventLocation: 'Lisboa',
    }) as never);

    const put = mockSend.mock.calls.map(([cmd]) => cmd).find((cmd) => cmd.__type === 'PutItem');
    // O eventStream (email de criação) lê estes campos do NewImage do stream
    expect(put.Item.eventManager.S).toBe('Ney');
    expect(put.Item.eventManagerEmail.S).toBe('ney@example.com');
    expect(put.Item.eventManagerPhone.S).toBe('+351911111111');
    expect(put.Item.eventLocation.S).toBe('Lisboa');
    expect(put.Item.participantCount.N).toBe('0');
    expect(put.Item.eventCreationDate.S).toBe(put.Item.createdAt.S);
  });
});

describe('create-event handler — identidade do dono', () => {
  it('grava o nome e o email reais da conta, resolvidos no Cognito', async () => {
    grant('STARTER', 'WITHIN_STARTER_LIMIT');
    mockSend.mockResolvedValueOnce({}); // PutItem

    const result = await handler(makeEvent(baseArgs) as never);

    expect(result.success).toBe(true);
    expect(mockGetUserEmail).toHaveBeenCalledWith({
      userPoolId: USER_POOL_ID,
      username: 'user-1',
    });
    expect(putItem().ownerName.S).toBe('Ney Carvalho');
    expect(putItem().ownerEmail.S).toBe('dono@exemplo.pt');
  });

  it('não confunde o Responsável do evento com a identidade da conta', async () => {
    grant('STARTER', 'WITHIN_STARTER_LIMIT');
    mockSend.mockResolvedValueOnce({}); // PutItem

    // O cenário de f6bbed4b: quem cria é uma conta, o "Responsável" escrito no
    // formulário é outra pessoa. São dados diferentes e não podem colapsar.
    await handler(makeEvent({
      ...baseArgs,
      eventManager: 'Maria Santos',
      eventManagerEmail: 'daniela@exemplo.pt',
    }) as never);

    expect(putItem().ownerName.S).toBe('Ney Carvalho');
    expect(putItem().ownerEmail.S).toBe('dono@exemplo.pt');
    expect(putItem().eventManager.S).toBe('Maria Santos');
    expect(putItem().eventManagerEmail.S).toBe('daniela@exemplo.pt');
  });

  it('cria o evento na mesma quando o Cognito falha — aqui a identidade é um rótulo, não uma decisão', async () => {
    grant('STARTER', 'WITHIN_STARTER_LIMIT');
    mockSend.mockResolvedValueOnce({}); // PutItem
    mockGetUserEmail.mockRejectedValue(new Error('Failed to get user email from Cognito'));

    const result = await handler(makeEvent(baseArgs) as never);

    // Ao contrário do invite-collaborator, que falha alto: lá o email decide
    // acesso. Um soluço do Cognito não pode impedir alguém de criar um evento.
    expect(result.success).toBe(true);
    expect(putItem().ownerName).toBeUndefined();
    expect(putItem().ownerEmail).toBeUndefined();
  });

  it('grava só o email quando o pool não tem o atributo name preenchido', async () => {
    grant('STARTER', 'WITHIN_STARTER_LIMIT');
    mockSend.mockResolvedValueOnce({}); // PutItem
    mockGetUserEmail.mockResolvedValue({ email: 'dono@exemplo.pt', name: undefined });

    await handler(makeEvent(baseArgs) as never);

    expect(putItem().ownerEmail.S).toBe('dono@exemplo.pt');
    expect(putItem().ownerName).toBeUndefined();
  });

  it('não vai ao Cognito quando o gate de conta recusa a criação', async () => {
    deny('STARTER', 'STARTER_LIMIT_REACHED');

    await handler(makeEvent(baseArgs) as never);

    expect(mockGetUserEmail).not.toHaveBeenCalled();
  });
});
