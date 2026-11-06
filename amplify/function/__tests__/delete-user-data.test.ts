import { marshall } from '@aws-sdk/util-dynamodb';

jest.mock('../shared/cascadeDeleteEvent', () => ({
  cascadeDeleteEvent: jest.fn(),
  emptyCounts: jest.requireActual('../shared/cascadeDeleteEvent').emptyCounts,
}));

jest.mock('@aws-sdk/client-dynamodb', () => {
  const mockSend = jest.fn();
  return {
    DynamoDBClient: jest.fn(() => ({ send: mockSend })),
    ScanCommand: jest.fn((input: unknown) => ({ __command: 'Scan', input })),
    QueryCommand: jest.fn((input: unknown) => ({ __command: 'Query', input })),
    BatchWriteItemCommand: jest.fn((input: unknown) => ({ __command: 'BatchWrite', input })),
    UpdateItemCommand: jest.fn((input: unknown) => ({ __command: 'Update', input })),
    _mockSend: mockSend,
  };
});

jest.mock('@aws-sdk/client-s3', () => {
  const mockS3Send = jest.fn();
  return {
    S3Client: jest.fn(() => ({ send: mockS3Send })),
    ListObjectsV2Command: jest.fn((input: unknown) => ({ __command: 'ListObjectsV2', input })),
    DeleteObjectsCommand: jest.fn((input: unknown) => ({ __command: 'DeleteObjects', input })),
    _mockS3Send: mockS3Send,
  };
});

const { cascadeDeleteEvent } = jest.requireMock('../shared/cascadeDeleteEvent') as {
  cascadeDeleteEvent: jest.Mock;
};
const { _mockSend: mockSend } = jest.requireMock('@aws-sdk/client-dynamodb') as {
  _mockSend: jest.Mock;
};
const { _mockS3Send: mockS3Send } = jest.requireMock('@aws-sdk/client-s3') as {
  _mockS3Send: jest.Mock;
};

const ENV = {
  BAFATORIO_APP_REGION: 'eu-west-1',
  BAFATORIO_APP_EVENT_TABLE_NAME: 'Event-table',
  BAFATORIO_APP_PARTICIPANT_TABLE_NAME: 'Participant-table',
  BAFATORIO_APP_USER_SUBSCRIPTION_TABLE_NAME: 'UserSubscription-table',
  BAFATORIO_APP_PAYMENT_METHOD_DATA_TABLE_NAME: 'PaymentMethodData-table',
  BAFATORIO_APP_INVOICE_TABLE_NAME: 'Invoice-table',
  BAFATORIO_APP_DEPENDENT_TABLE_NAME: 'Dependent-table',
  BAFATORIO_APP_EVENT_SUPPLIER_TABLE_NAME: 'EventSupplier-table',
  BAFATORIO_APP_EVENT_COLLABORATOR_TABLE_NAME: 'EventCollaborator-table',
  BAFATORIO_APP_ROLE_TABLE_NAME: 'Role-table',
  BAFATORIO_APP_DOCUMENT_FOLDER_TABLE_NAME: 'DocumentFolder-table',
  BAFATORIO_APP_EVENT_SCHEDULE_ENTRY_TABLE_NAME: 'EventScheduleEntry-table',
  BAFATORIO_APP_NOTION_DOCUMENT_TABLE_NAME: 'NotionDocument-table',
  BAFATORIO_APP_EMAIL_LOG_TABLE_NAME: 'EmailLog-table',
  BAFATORIO_APP_SUPPLIER_TABLE_NAME: 'Supplier-table',
  BAFATORIO_APP_PLAN_PURCHASE_TABLE_NAME: 'PlanPurchase-table',
  BAFATORIO_APP_S3_BUCKET_NAME: 'test-bucket',
};

type Cmd = { __command: string; input: Record<string, any> };

const makeCascadeSuccess = () => ({
  success: true,
  deleted: { event: 1 },
  failed: {},
  errors: [],
});

/** User owns two events; every other scan/list is empty and deletes succeed. */
const routeDefaults = () => {
  mockSend.mockImplementation((cmd: Cmd) => {
    if (cmd.__command === 'Scan' && cmd.input.TableName === 'Event-table') {
      return Promise.resolve({
        Items: [marshall({ id: 'evt-1' }), marshall({ id: 'evt-2' })],
      });
    }
    if (cmd.__command === 'Scan') return Promise.resolve({ Items: [] });
    if (cmd.__command === 'BatchWrite') return Promise.resolve({ UnprocessedItems: {} });
    return Promise.resolve({});
  });
  mockS3Send.mockImplementation((cmd: Cmd) => {
    if (cmd.__command === 'ListObjectsV2') {
      return Promise.resolve({ Contents: [], IsTruncated: false });
    }
    return Promise.resolve({});
  });
};

describe('delete-user-data handler (ADR-035 — shared cascade)', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let handler: (event: any) => Promise<any>;

  beforeAll(() => {
    Object.assign(process.env, ENV);
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    handler = require('../delete-user-data/handler').handler;
  });

  beforeEach(() => {
    mockSend.mockReset();
    mockS3Send.mockReset();
    cascadeDeleteEvent.mockReset();
    cascadeDeleteEvent.mockResolvedValue(makeCascadeSuccess());
  });

  const invoke = () =>
    handler({
      arguments: { identityId: 'identity-1', sub: 'user-1' },
      identity: { sub: 'user-1' },
    });

  it('rejects when the caller sub does not match the requested sub (cross-account wipe)', async () => {
    routeDefaults();

    const result = await handler({
      arguments: { identityId: 'victim-identity', sub: 'victim-sub' },
      identity: { sub: 'attacker-sub' },
    });

    expect(result).toBe(false);
    expect(cascadeDeleteEvent).not.toHaveBeenCalled();
    expect(mockSend).not.toHaveBeenCalled();
    expect(mockS3Send).not.toHaveBeenCalled();
  });

  // Issue #162: o identityId vinha do argumento sem verificação, e com o próprio
  // sub um atacante apontava a limpeza S3 ao prefixo da vítima. A limpeza dos
  // prefixos por identidade passou para o cliente (IAM escopado por
  // ${cognito-identity.amazonaws.com:sub}); a Lambda ignora o argumento e o S3
  // que aqui resta é só o dos eventos do dono, feito pelo cascade por eventId.
  it('ignora o identityId do argumento e nunca varre prefixos por identidade', async () => {
    routeDefaults();

    const result = await handler({
      arguments: { identityId: 'eu-west-1:victim-identity', sub: 'user-1' },
      identity: { sub: 'user-1' },
    });

    expect(result).toBe(true);
    const listedPrefixes = mockS3Send.mock.calls
      .map(([cmd]: [{ input?: { Prefix?: string } }]) => cmd?.input?.Prefix)
      .filter(Boolean);
    expect(listedPrefixes).toEqual([]);
  });

  it('runs the shared cascade once per owned event, with the full table map', async () => {
    routeDefaults();

    const result = await invoke();

    expect(result).toBe(true);
    expect(cascadeDeleteEvent).toHaveBeenCalledTimes(2);
    expect(cascadeDeleteEvent).toHaveBeenNthCalledWith(1, {
      eventId: 'evt-1',
      bucketName: 'test-bucket',
      tables: {
        event: 'Event-table',
        participant: 'Participant-table',
        dependent: 'Dependent-table',
        eventSupplier: 'EventSupplier-table',
        eventCollaborator: 'EventCollaborator-table',
        role: 'Role-table',
        documentFolder: 'DocumentFolder-table',
        eventScheduleEntry: 'EventScheduleEntry-table',
        notionDocument: 'NotionDocument-table',
        emailLog: 'EmailLog-table',
      },
    });
    expect(cascadeDeleteEvent.mock.calls[1][0].eventId).toBe('evt-2');
  });

  it('never batch-deletes Event records directly — the cascade owns the Event lifecycle', async () => {
    routeDefaults();

    await invoke();

    const eventBatchWrites = mockSend.mock.calls
      .map(([cmd]: [Cmd]) => cmd)
      .filter(
        (cmd: Cmd) =>
          cmd.__command === 'BatchWrite' && cmd.input.RequestItems?.['Event-table']
      );
    expect(eventBatchWrites).toEqual([]);
  });

  it('não varre prefixos por identidade — essa limpeza é do cliente (issue #162)', async () => {
    routeDefaults();

    await invoke();

    const listPrefixes = mockS3Send.mock.calls
      .map(([cmd]: [Cmd]) => cmd)
      .filter((cmd: Cmd) => cmd.__command === 'ListObjectsV2')
      .map((cmd: Cmd) => cmd.input.Prefix);
    expect(listPrefixes).toEqual([]);
  });

  it('returns false when a cascade reports failure, and still processes the other events', async () => {
    routeDefaults();
    cascadeDeleteEvent
      .mockResolvedValueOnce({
        success: false,
        deleted: {},
        failed: { roles: 2 },
        errors: ['Role-table: throttled'],
      })
      .mockResolvedValueOnce(makeCascadeSuccess());

    const result = await invoke();

    expect(result).toBe(false);
    expect(cascadeDeleteEvent).toHaveBeenCalledTimes(2);
  });

  describe('registos financeiros: anonimizar em vez de apagar', () => {
    // O PlanPurchase e a Invoice sustentam a reconciliação com a Stripe e a
    // prova de consumo compra→evento (ADR-034). Apagá-los destruía o rasto
    // financeiro; mantê-los com o titular era reter dados pessoais depois de
    // um pedido de eliminação. Anonimizar resolve os dois.
    const anonimizaveis = ['PlanPurchase-table', 'Invoice-table'];

    const routeComRegistos = () => {
      mockSend.mockImplementation((cmd: Cmd) => {
        if (cmd.__command === 'Scan' && cmd.input.TableName === 'Event-table') {
          return Promise.resolve({ Items: [marshall({ id: 'evt-1' })] });
        }
        if (cmd.__command === 'Scan' && anonimizaveis.includes(cmd.input.TableName)) {
          return Promise.resolve({ Items: [marshall({ id: 'rec-1' }), marshall({ id: 'rec-2' })] });
        }
        if (cmd.__command === 'Scan') return Promise.resolve({ Items: [] });
        if (cmd.__command === 'BatchWrite') return Promise.resolve({ UnprocessedItems: {} });
        return Promise.resolve({});
      });
      mockS3Send.mockImplementation(() => Promise.resolve({ Contents: [], IsTruncated: false }));
    };

    const updatesA = (tabela: string) =>
      mockSend.mock.calls
        .map(([cmd]: [Cmd]) => cmd)
        .filter((cmd: Cmd) => cmd.__command === 'Update' && cmd.input.TableName === tabela);

    const apagadosDe = (tabela: string) =>
      mockSend.mock.calls
        .map(([cmd]: [Cmd]) => cmd)
        .filter((cmd: Cmd) => cmd.__command === 'BatchWrite' && cmd.input.RequestItems?.[tabela]);

    it.each(anonimizaveis)('%s é anonimizado, nunca apagado', async (tabela) => {
      routeComRegistos();
      await invoke();

      expect(updatesA(tabela)).toHaveLength(2);
      expect(apagadosDe(tabela)).toHaveLength(0);
    });

    it('remove o titular e marca a data, mantendo o valor e os ids da Stripe', async () => {
      routeComRegistos();
      await invoke();

      const upd = updatesA('PlanPurchase-table')[0].input;
      // Resolver os aliases: 'owner' é palavra reservada e vai por #nome.
      const expr = Object.entries(upd.ExpressionAttributeNames ?? {}).reduce(
        (out: string, [alias, real]) => out.replaceAll(alias, real as string),
        upd.UpdateExpression as string,
      );
      const removidos = expr.split('REMOVE')[1] ?? '';

      expect(removidos).toMatch(/\bowner\b/);
      expect(removidos).toMatch(/\buserId\b/);
      expect(expr).toContain('anonymizedAt');
      // Nada que toque no dinheiro nem na ligação à Stripe.
      expect(expr).not.toMatch(/amount|stripe/i);
    });

    it('condiciona ao item existir — não ressuscita registos apagados noutra via', async () => {
      routeComRegistos();
      await invoke();

      expect(updatesA('PlanPurchase-table')[0].input.ConditionExpression)
        .toBe('attribute_exists(id)');
    });
  });
});
