import { ListTablesCommand, ScanCommand } from '@aws-sdk/client-dynamodb';
import { unmarshall } from '@aws-sdk/util-dynamodb';

export async function listAllTables(client) {
  const tables = [];
  let lastToken;

  do {
    const result = await client.send(new ListTablesCommand({
      ExclusiveStartTableName: lastToken,
    }));
    tables.push(...(result.TableNames || []));
    lastToken = result.LastEvaluatedTableName;
  } while (lastToken);

  return tables;
}

export function findTable(allTables, prefix, { suffix } = {}) {
  const table = suffix
    ? allTables.find(name => name.startsWith(`${prefix}-`) && name.includes(suffix))
    : allTables.find(name => name.startsWith(`${prefix}-`));

  if (!table) {
    const candidates = allTables.filter(name => name.startsWith(`${prefix}-`)).join(', ') || '<none>';
    throw new Error(`${prefix} table not found${suffix ? ` (suffix: ${suffix})` : ''}. Candidates: ${candidates}`);
  }

  return table;
}

export async function scanTable(client, tableName, { projection } = {}) {
  const items = [];
  let lastKey;
  const params = { TableName: tableName };

  if (projection) {
    const names = {};
    const aliased = projection.map((field, index) => {
      const alias = `#p${index}`;
      names[alias] = field;
      return alias;
    });
    params.ProjectionExpression = aliased.join(', ');
    params.ExpressionAttributeNames = names;
  }

  do {
    const result = await client.send(new ScanCommand({
      ...params,
      ExclusiveStartKey: lastKey,
    }));
    items.push(...(result.Items || []).map(item => unmarshall(item)));
    lastKey = result.LastEvaluatedKey;
  } while (lastKey);

  return items;
}
