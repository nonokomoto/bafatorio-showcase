#!/usr/bin/env node

/**
 * Sync ALL DynamoDB tables to RAG embeddings (api-bafatorio).
 * Tables: Event, Participant, Note, EventSupplier, Dependent
 *
 * Usage:
 *   node scripts/sync-events-to-rag.mjs                    # sync all tables
 *   node scripts/sync-events-to-rag.mjs --table Event      # sync only Event table
 *   node scripts/sync-events-to-rag.mjs --table Participant # sync only Participant table
 *
 * Requires:
 *   - AWS credentials configured (same as Amplify sandbox)
 *   - BAFATORIO_API_URL and BAFATORIO_API_KEY env vars (or uses defaults)
 */

import { DynamoDBClient, GetItemCommand } from '@aws-sdk/client-dynamodb';
import { unmarshall } from '@aws-sdk/util-dynamodb';

import { findTable, listAllTables, scanTable } from './lib/dynamo-helpers.mjs';
import { formatEventDateForEmail } from '../src/Utils/formatEventDateForEmail.js';

const API_URL = process.env.BAFATORIO_API_URL || 'https://api.bafatorio.com/api/v1';
const API_KEY = process.env.BAFATORIO_API_KEY || 'baf_vCgQiXBKLt0uDWJLJ54iBcKHIQFRSNG6EJ58XsphuPM';
const REGION = process.env.AWS_REGION || 'eu-west-1';

const dynamo = new DynamoDBClient({ region: REGION });

// ── Content formatters (Portuguese, same as Lambda handler) ──

function formatEvent(r) {
  const parts = [];
  parts.push(`Nome do evento: ${r.eventTitle || 'Sem título'}`);
  if (r.eventType) parts.push(`Tipo: ${r.eventType}`);
  if (r.eventStatus) parts.push(`Estado: ${r.eventStatus}`);
  const formattedDate = formatEventDateForEmail(r, 'pt');
  if (formattedDate) parts.push(`Data: ${formattedDate}`);
  if (r.eventLocation) parts.push(`Local: ${r.eventLocation}`);
  if (r.eventManager) parts.push(`Gestor: ${r.eventManager}`);
  if (r.eventManagerEmail) parts.push(`Email do gestor: ${r.eventManagerEmail}`);
  if (r.eventManagerPhone) parts.push(`Telefone do gestor: ${r.eventManagerPhone}`);
  if (r.description) parts.push(`Descrição: ${r.description}`);
  if (r.categories?.length) parts.push(`Categorias: ${r.categories.join(', ')}`);
  if (r.budget != null) parts.push(`Orçamento: €${r.budget.toLocaleString('pt-PT')}`);
  if (r.committedExpenses != null) parts.push(`Despesas comprometidas: €${r.committedExpenses.toLocaleString('pt-PT')}`);
  if (r.effectiveExpenses != null) parts.push(`Despesas efetivas: €${r.effectiveExpenses.toLocaleString('pt-PT')}`);
  if (r.participantCount != null) parts.push(`Número de participantes: ${r.participantCount}`);
  if (r.dependentCount != null) parts.push(`Número de dependentes: ${r.dependentCount}`);
  if (r.totalRegistrations != null) parts.push(`Total de inscrições: ${r.totalRegistrations}`);
  return parts.join('\n');
}

function formatParticipant(r) {
  const parts = [];
  parts.push(`Participante: ${r.participantName || 'Sem nome'}`);
  if (r.participantEmail) parts.push(`Email: ${r.participantEmail}`);
  if (r.participantPhone) parts.push(`Telefone: ${r.participantPhone}`);
  if (r.roleId) parts.push(`Função (roleId): ${r.roleId}`);
  if (r.participantJob) parts.push(`Profissão: ${r.participantJob}`);
  if (r.participantStatus) parts.push(`Estado: ${r.participantStatus}`);
  if (r.participantNote) parts.push(`Nota: ${r.participantNote}`);
  if (r.registrationDate) parts.push(`Data de registo: ${r.registrationDate}`);
  if (r.dependentsCount != null) parts.push(`Dependentes: ${r.dependentsCount}`);
  return parts.join('\n');
}

function formatDependent(r) {
  const parts = [];
  parts.push(`Dependente: ${r.name || 'Sem nome'}`);
  if (r.age) parts.push(`Faixa etária: ${r.age}`);
  if (r.status) parts.push(`Estado: ${r.status}`);
  if (r.attendedDate) parts.push(`Presença: ${r.attendedDate}`);
  return parts.join('\n');
}

function formatNote(r) {
  const parts = [];
  parts.push(`Nota: ${r.title || 'Sem título'}`);
  if (r.content) parts.push(`Conteúdo: ${r.content}`);
  if (r.isDone != null) parts.push(`Concluída: ${r.isDone ? 'Sim' : 'Não'}`);
  return parts.join('\n');
}

function formatEventSupplier(r, supplierName) {
  const parts = [];
  parts.push(`Fornecedor do evento: ${supplierName || r.supplierId || 'Desconhecido'}`);
  if (r.quoteAmount != null) parts.push(`Valor do orçamento: €${r.quoteAmount.toLocaleString('pt-PT')}`);
  if (r.status) parts.push(`Estado: ${r.status}`);
  if (r.approvalStatus) parts.push(`Estado de aprovação: ${r.approvalStatus}`);
  if (r.paidAt) parts.push(`Pago em: ${r.paidAt}`);
  return parts.join('\n');
}

// ── Supplier name cache ──

const supplierCache = new Map();

async function getSupplierName(supplierTableName, supplierId) {
  if (!supplierId) return undefined;
  if (supplierCache.has(supplierId)) return supplierCache.get(supplierId);

  try {
    const result = await dynamo.send(new GetItemCommand({
      TableName: supplierTableName,
      Key: { id: { S: supplierId } },
      ProjectionExpression: '#n',
      ExpressionAttributeNames: { '#n': 'name' },
    }));
    const name = result.Item ? unmarshall(result.Item).name : undefined;
    supplierCache.set(supplierId, name);
    return name;
  } catch {
    return undefined;
  }
}

// ── RAG ingest API ──

async function ingestToRag(eventId, sourceId, content, contentType = 'general') {
  const response = await fetch(`${API_URL}/rag/ingest`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': API_KEY,
    },
    body: JSON.stringify({
      eventId,
      sourceType: 'dynamodb',
      sourceId,
      contentType,
      content,
      accessLevel: 'participant',
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: { message: response.statusText } }));
    throw new Error(`Ingest failed (${response.status}): ${error.error?.message || JSON.stringify(error)}`);
  }

  return response.json();
}

// ── Table sync definitions ──

const TABLE_DEFS = [
  {
    name: 'Event',
    prefix: 'Event',
    contentType: 'general',
    getEventId: (r) => r.id,
    getSourceId: (r) => `event-${r.id}`,
    getLabel: (r) => r.eventTitle || r.id,
    format: (r) => formatEvent(r),
  },
  {
    name: 'Participant',
    prefix: 'Participant',
    contentType: 'participant',
    getEventId: (r) => r.eventId,
    getSourceId: (r) => `participant-${r.id}`,
    getLabel: (r) => r.participantName || r.id,
    format: (r) => formatParticipant(r),
  },
  {
    name: 'Dependent',
    prefix: 'Dependent',
    contentType: 'participant',
    getEventId: (r) => r.eventId,
    getSourceId: (r) => `dependent-${r.id}`,
    getLabel: (r) => r.name || r.id,
    format: (r) => formatDependent(r),
  },
  {
    name: 'Note',
    prefix: 'Note',
    contentType: 'general',
    getEventId: (r) => r.eventId,
    getSourceId: (r) => `note-${r.id}`,
    getLabel: (r) => r.title || r.id,
    format: (r) => formatNote(r),
  },
  {
    name: 'EventSupplier',
    prefix: 'EventSupplier',
    contentType: 'supplier',
    getEventId: (r) => r.eventId,
    getSourceId: (r) => `eventsupplier-${r.id}`,
    getLabel: (r) => r.supplierId || r.id,
    format: null, // handled separately (needs supplier name lookup)
  },
];

// ── Sync a single table ──

async function syncTable(def, ddbTableName, supplierTableName) {
  console.log(`\n📋 ${def.name}: ${ddbTableName}`);

  const items = await scanTable(dynamo, ddbTableName);
  console.log(`   Found ${items.length} records`);

  if (items.length === 0) return { success: 0, failed: 0, skipped: 0 };

  let success = 0, failed = 0, skipped = 0;

  for (const item of items) {
    const eventId = def.getEventId(item);
    if (!eventId) {
      skipped++;
      continue;
    }

    try {
      let content;
      if (def.name === 'EventSupplier') {
        const supplierName = await getSupplierName(supplierTableName, item.supplierId);
        content = formatEventSupplier(item, supplierName);
      } else {
        content = def.format(item);
      }

      const result = await ingestToRag(eventId, def.getSourceId(item), content, def.contentType);
      console.log(`   ✅ ${def.getLabel(item)} → ${result.data?.chunksCreated || '?'} chunks`);
      success++;
    } catch (err) {
      console.error(`   ❌ ${def.getLabel(item)}: ${err.message}`);
      failed++;
    }
  }

  return { success, failed, skipped };
}

// ── Main ──

async function main() {
  // Parse arguments
  const tableArg = process.argv.indexOf('--table');
  const filterTable = tableArg !== -1 ? process.argv[tableArg + 1] : null;
  const suffixArg = process.argv.indexOf('--suffix');
  const suffix = suffixArg !== -1 ? process.argv[suffixArg + 1] : null;

  console.log('🔍 Syncing DynamoDB → RAG embeddings\n');
  console.log(`API: ${API_URL}`);
  console.log(`Region: ${REGION}`);
  if (filterTable) console.log(`Filter: ${filterTable} only`);
  if (suffix) console.log(`Suffix: ${suffix}`);

  // Discover all DynamoDB tables
  const allTables = await listAllTables(dynamo);
  console.log(`\nFound ${allTables.length} DynamoDB tables`);

  // Find Supplier table (needed for EventSupplier name resolution)
  let supplierTableName;
  try {
    supplierTableName = findTable(allTables, 'Supplier', { suffix });
  } catch {
    console.warn('⚠️  Supplier table not found — EventSupplier records will use supplierId instead of name');
  }

  const tablesToSync = filterTable
    ? TABLE_DEFS.filter(d => d.name.toLowerCase() === filterTable.toLowerCase())
    : TABLE_DEFS;

  if (tablesToSync.length === 0) {
    console.error(`\n❌ Unknown table: ${filterTable}. Available: ${TABLE_DEFS.map(d => d.name).join(', ')}`);
    process.exit(1);
  }

  const totals = { success: 0, failed: 0, skipped: 0 };

  for (const def of tablesToSync) {
    try {
      const ddbTableName = findTable(allTables, def.prefix, { suffix });
      const result = await syncTable(def, ddbTableName, supplierTableName);
      totals.success += result.success;
      totals.failed += result.failed;
      totals.skipped += result.skipped;
    } catch (err) {
      console.error(`\n❌ ${def.name}: ${err.message}`);
    }
  }

  console.log(`\n📊 Done: ${totals.success} synced, ${totals.failed} failed, ${totals.skipped} skipped (no eventId)`);
}

main().catch(err => {
  console.error('Fatal error:', err.message);
  process.exit(1);
});
