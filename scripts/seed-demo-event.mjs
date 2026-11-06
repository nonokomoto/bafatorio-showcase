#!/usr/bin/env node

/**
 * Seed de eventos de demonstração — povoa o sandbox com eventos realistas e
 * cheios que exercitam as 7 capacidades do rollup (Participantes, Fornecedores,
 * Documentação, Planeamento, Comunicação, Check-in, Relatórios).
 *
 * Escrita DIRETA no DynamoDB + S3 (o padrão dos outros scripts do repo). O dono
 * é dev@bafatorio.com, admin — o gate de participantes (STARTER corta aos 25) é
 * contornado; o Event.planKey grava 'PRO', que é o que o create-event grava para
 * um admin (resolveEventEntitlements faz bypass antes do snapshot).
 *
 * Multi-evento: cada entrada em EVENTS traz o seu próprio conteúdo (roles,
 * fornecedores, agenda) e uma `phase` que controla os estados de presença
 * (live = a decorrer com check-in; upcoming = futuro/RSVP; past = concluído).
 *
 * Idempotente: IDs determinísticos por evento + ConditionExpression
 * attribute_not_exists(id). Re-correr não duplica. Os contadores do Event
 * são mantidos pelos DynamoDB Streams em cada INSERT — o script escreve o Event
 * com counts a 0 e reconcilia no fim com um SET absoluto.
 *
 * Usage:
 *   node scripts/seed-demo-event.mjs --env sandbox                              # dry-run (1.º evento)
 *   node scripts/seed-demo-event.mjs --env sandbox --event gala-angariacao --execute
 *   node scripts/seed-demo-event.mjs --env sandbox --reset gala-angariacao --execute
 *
 * Requires: credenciais AWS (conta 074280453839, eu-west-1).
 */

import { deflateSync } from 'node:zlib';

import {
  CognitoIdentityProviderClient,
  ListUsersCommand,
} from '@aws-sdk/client-cognito-identity-provider';
import {
  DynamoDBClient,
  PutItemCommand,
  UpdateItemCommand,
  DeleteItemCommand,
  QueryCommand,
  ScanCommand,
} from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import {
  S3Client,
  PutObjectCommand,
  ListObjectsV2Command,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import ExcelJS from 'exceljs';

import { findTable, listAllTables } from './lib/dynamo-helpers.mjs';

// ── Configuração de ambiente ────────────────────────────────────────────────
const REGION = 'eu-west-1';

// Identificadores por ambiente. O bucket S3 e os subs dos users são específicos
// do sandbox; dev/prod ficam por preencher (só semeamos o sandbox por agora).
const ENVS = {
  sandbox: {
    poolId: 'eu-west-1_XXXXXXXXX',
    suffix: 'xxxxxxxxxxxxxxxxxxxxxxxxxx',
    bucket: 'amplify-bafatorioapp-macb-userstoragebucket33351ca-ilq65tq6hpx5',
    users: {
      owner: '00000000-0000-0000-0000-000000000000', // dev@bafatorio.com (admin)
      ney: '00000000-0000-0000-0000-000000000000', // owner@example.com
      dark: '00000000-0000-0000-0000-000000000000', // demo@example.com
    },
  },
};

const arg = (name) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : undefined;
};
const EXECUTE = process.argv.includes('--execute');
const envName = arg('env');
const resetSlug = arg('reset');
const eventSlug = arg('event');
const suffixOverride = arg('suffix');

if (!ENVS[envName]) {
  console.error(`--env obrigatório: ${Object.keys(ENVS).join(' | ')}`);
  process.exit(1);
}
const ENV = ENVS[envName];
const SUFFIX = suffixOverride || ENV.suffix;

const dynamo = new DynamoDBClient({ region: REGION });
const s3 = new S3Client({ region: REGION });
const cognito = new CognitoIdentityProviderClient({ region: REGION });

const owner = (sub) => `${sub}::${sub}`; // formato Gen1 (sub::sub), como o resto do repo

// Nome/email reais de cada user, do Cognito — como o create-event e o
// accept-invitation resolvem (ListUsers filter sub, o AdminGetUser pede username).
// Sem isto os avatares mostravam nomes inventados, inconsistentes com o Header.
const identityCache = new Map();
async function resolveIdentity(sub) {
  if (!sub) return { name: null, email: null };
  if (identityCache.has(sub)) return identityCache.get(sub);
  const res = await cognito.send(
    new ListUsersCommand({ UserPoolId: ENV.poolId, Filter: `sub = "${sub}"`, Limit: 1 })
  );
  const attrs = res.Users?.[0]?.Attributes ?? [];
  const identity = {
    name: attrs.find((a) => a.Name === 'name')?.Value ?? null,
    email: attrs.find((a) => a.Name === 'email')?.Value ?? null,
  };
  identityCache.set(sub, identity);
  return identity;
}

// ── Listas de dados PT-PT (distribuição determinística por índice) ───────────
const FIRST = ['Ana', 'João', 'Maria', 'Pedro', 'Carla', 'Rui', 'Sofia', 'Miguel', 'Inês', 'Tiago', 'Beatriz', 'Diogo', 'Catarina', 'Bruno', 'Mariana', 'André', 'Joana', 'Ricardo', 'Helena', 'Paulo', 'Margarida', 'Filipe', 'Teresa', 'Gonçalo', 'Patrícia', 'Vasco', 'Madalena', 'Henrique', 'Cristina', 'Daniel'];
const LAST = ['Silva', 'Santos', 'Pereira', 'Costa', 'Oliveira', 'Rodrigues', 'Martins', 'Ferreira', 'Sousa', 'Carvalho', 'Lopes', 'Alves', 'Pinto', 'Marques', 'Ribeiro', 'Gomes', 'Cardoso', 'Teixeira', 'Rocha', 'Mendes'];
const ORGS = ['Grupo Lusíada', 'Universidade de Lisboa', 'Banco BPI', 'Caixa Geral', 'EDP', 'TAP Portugal', 'Galp Energia', 'Sonae', 'Jerónimo Martins', 'Fundação Gulbenkian', 'NOS', 'Câmara de Lisboa', 'Vodafone Portugal', 'Pestana Hotels', 'Millennium BCP', 'Critical Software', 'Feedzai', 'OutSystems', 'Farfetch', 'Nova SBE'];
const JOBS = ['Diretora de Marketing', 'CEO', 'CFO', 'Engenheiro de Software', 'Account Manager', 'Product Manager', 'Consultor', 'Designer', 'Investigadora', 'Professor Associado', 'Gestor de Operações', 'Diretora Comercial', 'Analista', 'Coordenador', 'Diretora de RH', 'Arquiteta'];
const DEP_NAMES = ['Leonor', 'Martim', 'Matilde', 'Santiago', 'Carolina', 'Afonso', 'Benedita', 'Duarte', 'Francisca', 'Tomás', 'Alice', 'Rodrigo', 'Constança', 'Salvador', 'Mafalda'];

// Cores da paleta curada da agenda (src/Utils/scheduleColors.js) — a Lambda
// recusa hex fora dela.
const C = { tomate: '#D50000', flamingo: '#E67C73', tangerina: '#F4511E', banana: '#F6BF26', manjericao: '#0B8043', pavao: '#039BE5', mirtilo: '#3F51B5', uva: '#8E24AA' };

// Fornecedores globais do catálogo (partilháveis entre eventos). Só os
// referenciados por cada evento é que são inseridos.
const SUPPLIERS = [
  { key: 'catering', name: 'Sabores de Lisboa Catering', category: 'Catering', contact: 'Rita Nunes', unit: 'PER_GUEST', min: 22, max: 35 },
  { key: 'av', name: 'ProAV Soluções Audiovisuais', category: 'Audiovisual', contact: 'Hugo Faria', unit: 'PER_DAY', min: 800, max: 1500 },
  { key: 'seguranca', name: 'Vigilância Atlântico', category: 'Segurança', contact: 'Nuno Braga', unit: 'PER_HOUR', min: 18, max: 25 },
  { key: 'transporte', name: 'CityTransfer Lisboa', category: 'Transporte', contact: 'Sara Lima', unit: 'PER_EVENT', min: 1200, max: 1200 },
  { key: 'decoracao', name: 'Flora & Cenografia', category: 'Decoração', contact: 'Inês Real', unit: 'FIXED', min: 900, max: 3200 },
  { key: 'banda', name: 'Quinteto Azul — Jazz ao Vivo', category: 'Música', contact: 'Miguel Sá', unit: 'PER_EVENT', min: 4000, max: 5000 },
  { key: 'fotografia', name: 'Luz & Instante Fotografia', category: 'Fotografia', contact: 'Clara Dias', unit: 'PER_EVENT', min: 1500, max: 2000 },
  { key: 'iluminacao', name: 'Cena Viva Iluminação', category: 'Iluminação', contact: 'Paulo Rego', unit: 'PER_EVENT', min: 2000, max: 3000 },
];

// ── Config dos eventos ───────────────────────────────────────────────────────
// phase: 'live' (a decorrer, check-in em curso) | 'upcoming' (futuro, RSVP) |
//        'past' (concluído). Controla os estados de participantes/dependentes.
// depCount(i, status): quantos acompanhantes cada participante leva.
// buildSchedule({ C, S, pg, ev }): entradas de agenda (planeamento + evento).
const EVENTS = [
  {
    slug: 'workshop-lideranca',
    id: '00000000-0000-0000-0000-000000000000',
    title: 'Workshop de Liderança',
    location: 'Lisboa',
    startDate: '2026-07-24',
    endDate: '2026-07-25',
    status: 'ONGOING',
    phase: 'live',
    eventType: 'public',
    travel: true, // participantes vêm de fora → viagem+hotel num subset
    currency: 'EUR',
    budget: 48000,
    managerPhone: '+351 912 000 111',
    description: 'Programa intensivo de dois dias sobre liderança de equipas e gestão de eventos.',
    participants: 120,
    roles: [
      { key: 'participante', name: 'Participante' },
      { key: 'orador', name: 'Orador' },
      { key: 'vip', name: 'VIP' },
      { key: 'parceiro', name: 'Parceiro' },
      { key: 'organizacao', name: 'Organização' },
      { key: 'staff', name: 'Staff' },
    ],
    // Parte dos primeiros 96 leva famílias (para o check-in ter dependentes).
    depCount: (i) => (i < 96 && i % 4 === 2 ? (i % 8 === 2 ? 2 : 1) : 0),
    eventSuppliers: [
      { supplier: 'catering', amount: 3600, status: 'APPROVED', approval: 'APPROVED', desc: 'Coffee-breaks e almoços dos dois dias' },
      { supplier: 'av', amount: 2400, status: 'PAID', approval: 'APPROVED', desc: 'Som, projeção e tradução simultânea' },
      { supplier: 'seguranca', amount: 900, status: 'PENDING', approval: 'PENDING_APPROVAL', desc: 'Segurança nas entradas (16h)' },
      { supplier: 'transporte', amount: 1200, status: 'APPROVED', approval: 'APPROVED', desc: 'Transfers aeroporto–hotel para oradores' },
      { supplier: 'decoracao', amount: 900, status: 'PAID', approval: 'APPROVED', desc: 'Cenografia do palco e sinalética' },
    ],
    buildSchedule: ({ C, S, pg, ev }) => {
      const oradores = pg(2, 6, 5); // role Orador (i % 6 === 1)
      const staff = pg(6, 6, 4); // role Staff (i % 6 === 5)
      const primeiros = pg(1, 1, 12);
      return [
        // — Planeamento (semanas antes) —  author: ney = CO_MANAGER, dark = STAFF_LOGISTICS
        { date: '2026-07-01', title: 'Abertura de inscrições', loc: 'Plataforma online', color: C.uva, desc: 'Formulário de inscrição publicado no site do evento.' },
        { date: '2026-07-06', start: '10:00', end: '11:30', title: 'Kickoff da organização', loc: 'Escritório', color: C.mirtilo, parts: staff, desc: 'Alinhamento da equipa: papéis, cronograma e responsabilidades.', author: 'ney' },
        { date: '2026-07-10', start: '15:00', end: '16:00', title: 'Confirmação de oradores', loc: 'Videochamada', color: C.pavao, parts: oradores, desc: 'Fecho do programa e biografias dos oradores.', author: 'ney' },
        { date: '2026-07-15', title: 'Fecho de inscrições', color: C.tomate, desc: 'Prazo final para novas inscrições.' },
        { date: '2026-07-18', start: '11:00', end: '12:00', title: 'Reunião com o catering', loc: 'Escritório', color: C.banana, supplier: S('catering'), desc: 'Ementa dos coffee-breaks e almoços, restrições alimentares.', author: 'dark' },
        { date: '2026-07-20', start: '14:00', end: '15:00', title: 'Aprovação de orçamentos', loc: 'Escritório', color: C.tangerina, supplier: S('av'), desc: 'Validação final dos orçamentos de audiovisual e transporte.', author: 'ney' },
        { date: '2026-07-23', start: '16:00', end: '18:00', title: 'Montagem da sala e ensaio técnico', loc: 'Auditório Principal', color: C.flamingo, supplier: S('av'), parts: staff, desc: 'Montagem do palco, teste de som, projeção e tradução.', author: 'dark' },
        // — Dia 1 —
        { date: ev.startDate, start: '09:30', end: '10:00', title: 'Abertura e boas-vindas', loc: 'Auditório Principal', color: C.pavao, parts: primeiros },
        { date: ev.startDate, start: '10:00', end: '12:30', title: 'Liderança de equipas de alta performance', loc: 'Auditório Principal', color: C.mirtilo, supplier: S('av'), parts: oradores, desc: 'Sessão principal do primeiro dia.' },
        { date: ev.startDate, start: '12:30', end: '14:00', title: 'Almoço de networking', loc: 'Sala Panorâmica', color: C.manjericao, supplier: S('catering'), author: 'dark' },
        { date: ev.startDate, start: '14:30', end: '17:00', title: 'Gestão de eventos ponta-a-ponta', loc: 'Sala B', color: C.uva, parts: primeiros },
        { date: ev.startDate, start: '17:00', end: '18:00', title: 'Perguntas e respostas', loc: 'Auditório Principal', color: C.banana, author: 'dark' },
        // — Dia 2 —
        { date: ev.endDate, start: '09:30', end: '11:00', title: 'Comunicação e feedback', loc: 'Auditório Principal', color: C.tomate, parts: oradores },
        { date: ev.endDate, start: '11:15', end: '12:30', title: 'Painel: casos reais', loc: 'Auditório Principal', color: C.tangerina, parts: oradores, desc: 'Debate com líderes convidados.', author: 'ney' },
        { date: ev.endDate, start: '12:30', end: '14:00', title: 'Almoço', loc: 'Sala Panorâmica', color: C.manjericao, supplier: S('catering'), author: 'dark' },
        { date: ev.endDate, start: '14:00', end: '15:30', title: 'Estudo de caso em grupo', loc: 'Salas de Grupo', color: C.flamingo, parts: primeiros, author: 'ney' },
        { date: ev.endDate, start: '15:30', end: '16:00', title: 'Encerramento e certificados', loc: 'Auditório Principal', color: C.uva, parts: primeiros, desc: 'Entrega de certificados de participação.' },
      ];
    },
  },
  {
    slug: 'gala-angariacao',
    id: '00000000-0000-0000-0000-000000000000',
    title: 'Gala de Angariação Solidária',
    location: 'Lisboa',
    startDate: '2026-09-19',
    endDate: '2026-09-19',
    status: 'SCHEDULED',
    phase: 'upcoming', // futuro → RSVP, ninguém compareceu ainda (sem check-in)
    eventType: 'private',
    travel: false, // evento local, sem viagem/hotel
    currency: 'EUR',
    budget: 90000,
    managerPhone: '+351 912 000 222',
    description: 'Jantar de gala anual para angariação de fundos, com leilão solidário e atuação musical ao vivo.',
    participants: 180,
    roles: [
      { key: 'convidado', name: 'Convidado' },
      { key: 'vip', name: 'VIP' },
      { key: 'mesa-honra', name: 'Mesa de Honra' },
      { key: 'patrocinador', name: 'Patrocinador' },
      { key: 'organizacao', name: 'Organização' },
      { key: 'staff', name: 'Staff' },
    ],
    // Gala: cada convidado não-cancelado leva um acompanhante (mesas de casais).
    depCount: (i, status) => (status !== 'CANCELLED' && i % 3 !== 0 ? 1 : 0),
    eventSuppliers: [
      { supplier: 'catering', amount: 21000, status: 'APPROVED', approval: 'APPROVED', desc: 'Jantar de gala servido à mesa (180 convidados)' },
      { supplier: 'banda', amount: 4500, status: 'APPROVED', approval: 'APPROVED', desc: 'Atuação de quinteto de jazz ao vivo' },
      { supplier: 'decoracao', amount: 3200, status: 'PENDING', approval: 'PENDING_APPROVAL', desc: 'Centros de mesa e decoração floral do salão' },
      { supplier: 'fotografia', amount: 1800, status: 'APPROVED', approval: 'APPROVED', desc: 'Cobertura fotográfica e vídeo do evento' },
      { supplier: 'iluminacao', amount: 2600, status: 'PENDING', approval: 'PENDING_APPROVAL', desc: 'Iluminação cénica e ambiente do salão' },
    ],
    buildSchedule: ({ C, S, pg, ev }) => {
      const vips = pg(3, 6, 5); // role VIP (i % 6 === 2)
      const staff = pg(6, 6, 4); // role Staff (i % 6 === 5)
      const primeiros = pg(1, 1, 12);
      return [
        // — Planeamento (antes da gala) —
        { date: '2026-08-20', start: '10:00', end: '11:30', title: 'Reunião do comité organizador', loc: 'Escritório', color: C.mirtilo, parts: staff, desc: 'Definição do programa, orçamento e metas de angariação.', author: 'ney' },
        { date: '2026-08-28', start: '15:00', end: '16:00', title: 'Confirmação de patrocinadores', loc: 'Videochamada', color: C.pavao, desc: 'Fecho dos pacotes de patrocínio e contrapartidas.', author: 'ney' },
        { date: '2026-09-05', title: 'Fecho de RSVP', color: C.tomate, desc: 'Prazo final de confirmação de presença dos convidados.' },
        { date: '2026-09-10', start: '11:00', end: '12:00', title: 'Prova de menu', loc: 'Cozinha do catering', color: C.banana, supplier: S('catering'), desc: 'Degustação e escolha final da ementa.', author: 'dark' },
        { date: '2026-09-15', start: '14:00', end: '17:00', title: 'Ensaio da atuação e plano de sala', loc: 'Salão da gala', color: C.flamingo, supplier: S('banda'), parts: staff, desc: 'Passagem de som e disposição das mesas.', author: 'dark' },
        // — Dia da gala —
        { date: ev.startDate, start: '19:00', end: '20:00', title: 'Receção e cocktail de boas-vindas', loc: 'Foyer', color: C.pavao, parts: primeiros },
        { date: ev.startDate, start: '20:00', end: '20:30', title: 'Abertura e discurso do anfitrião', loc: 'Salão Principal', color: C.uva, parts: vips, desc: 'Boas-vindas e apresentação das causas apoiadas.' },
        { date: ev.startDate, start: '20:30', end: '22:00', title: 'Jantar de gala', loc: 'Salão Principal', color: C.manjericao, supplier: S('catering') },
        { date: ev.startDate, start: '22:00', end: '23:00', title: 'Leilão solidário', loc: 'Salão Principal', color: C.tangerina, parts: vips, desc: 'Leilão ao vivo de peças e experiências doadas.' },
        { date: ev.startDate, start: '23:00', end: '23:45', title: 'Atuação musical', loc: 'Salão Principal', color: C.banana, supplier: S('banda') },
        { date: ev.startDate, start: '23:45', title: 'Encerramento e agradecimentos', loc: 'Salão Principal', color: C.flamingo, parts: vips, desc: 'Balanço da angariação e agradecimentos finais.' },
      ];
    },
  },
  {
    slug: 'summit-inovacao',
    id: '00000000-0000-0000-0000-000000000000',
    title: 'Summit de Inovação 2026',
    location: 'Porto',
    startDate: '2026-07-08',
    endDate: '2026-07-09',
    status: 'COMPLETED',
    phase: 'past', // já realizado → presenças fechadas, fornecedores pagos
    eventType: 'public',
    travel: true, // conferência grande, oradores/participantes de fora
    currency: 'EUR',
    budget: 40000,
    managerPhone: '+351 912 000 333',
    description: 'Conferência de dois dias sobre inovação e tecnologia, com keynotes, painéis e workshops.',
    participants: 250,
    roles: [
      { key: 'participante', name: 'Participante' },
      { key: 'orador', name: 'Orador' },
      { key: 'vip', name: 'VIP' },
      { key: 'patrocinador', name: 'Patrocinador' },
      { key: 'imprensa', name: 'Imprensa' },
      { key: 'organizacao', name: 'Organização' },
      { key: 'staff', name: 'Staff' },
    ],
    // Conferência profissional: poucos acompanhantes.
    depCount: (i) => (i < 120 && i % 6 === 4 ? 1 : 0),
    eventSuppliers: [
      { supplier: 'catering', amount: 8500, status: 'PAID', approval: 'APPROVED', desc: 'Coffee-breaks e almoços dos dois dias' },
      { supplier: 'av', amount: 6200, status: 'PAID', approval: 'APPROVED', desc: 'Produção de palco, som, ecrãs LED e streaming' },
      { supplier: 'seguranca', amount: 2400, status: 'PAID', approval: 'APPROVED', desc: 'Segurança e controlo de acessos (2 dias)' },
      { supplier: 'transporte', amount: 3000, status: 'PAID', approval: 'APPROVED', desc: 'Shuttle hotel–venue para oradores e VIP' },
      { supplier: 'decoracao', amount: 2600, status: 'PAID', approval: 'APPROVED', desc: 'Cenografia, sinalética e branding do espaço' },
    ],
    buildSchedule: ({ C, S, pg, ev }) => {
      const oradores = pg(2, 7, 6);
      const staff = pg(6, 7, 5);
      const primeiros = pg(1, 1, 12);
      return [
        // — Planeamento (semanas antes) —
        { date: '2026-06-15', title: 'Abertura de inscrições', loc: 'Plataforma online', color: C.uva, desc: 'Bilhetes e call for speakers publicados.' },
        { date: '2026-06-25', start: '15:00', end: '16:30', title: 'Confirmação de keynotes', loc: 'Videochamada', color: C.pavao, parts: oradores, desc: 'Fecho dos oradores principais e temas.', author: 'ney' },
        { date: '2026-07-02', title: 'Fecho de inscrições', color: C.tomate, desc: 'Prazo final de inscrição.' },
        { date: '2026-07-05', start: '11:00', end: '12:30', title: 'Reunião com fornecedores', loc: 'Escritório', color: C.banana, supplier: S('av'), desc: 'Alinhamento de produção, palco e streaming.', author: 'dark' },
        { date: '2026-07-07', start: '14:00', end: '19:00', title: 'Montagem e credenciamento', loc: 'Centro de Congressos', color: C.flamingo, supplier: S('decoracao'), parts: staff, desc: 'Montagem dos stands, sinalética e balcões de check-in.', author: 'dark' },
        // — Dia 1 —
        { date: ev.startDate, start: '08:30', end: '09:30', title: 'Credenciamento e welcome coffee', loc: 'Foyer', color: C.manjericao, supplier: S('catering'), parts: staff },
        { date: ev.startDate, start: '09:30', end: '10:30', title: 'Sessão de abertura — Keynote', loc: 'Auditório Principal', color: C.mirtilo, supplier: S('av'), parts: oradores, desc: 'Discurso de abertura e visão do setor.' },
        { date: ev.startDate, start: '11:00', end: '13:00', title: 'Painéis paralelos', loc: 'Salas A / B / C', color: C.pavao, parts: primeiros },
        { date: ev.startDate, start: '13:00', end: '14:30', title: 'Almoço de networking', loc: 'Sala Panorâmica', color: C.manjericao, supplier: S('catering') },
        { date: ev.startDate, start: '14:30', end: '17:30', title: 'Workshops práticos', loc: 'Salas de Grupo', color: C.uva, parts: primeiros, desc: 'Sessões hands-on em paralelo.' },
        // — Dia 2 —
        { date: ev.endDate, start: '09:30', end: '10:30', title: 'Keynote de encerramento', loc: 'Auditório Principal', color: C.tangerina, supplier: S('av'), parts: oradores },
        { date: ev.endDate, start: '11:00', end: '12:30', title: 'Mesa redonda: futuro da inovação', loc: 'Auditório Principal', color: C.banana, parts: oradores, desc: 'Debate com líderes do setor.', author: 'ney' },
        { date: ev.endDate, start: '12:30', end: '14:00', title: 'Almoço', loc: 'Sala Panorâmica', color: C.manjericao, supplier: S('catering') },
        { date: ev.endDate, start: '14:00', end: '15:30', title: 'Entrega de prémios e networking', loc: 'Foyer', color: C.flamingo, parts: primeiros, desc: 'Prémios de inovação e sessão de contactos.' },
        { date: ev.endDate, start: '15:30', end: '16:00', title: 'Encerramento', loc: 'Auditório Principal', color: C.tomate, parts: primeiros },
      ];
    },
  },
  {
    slug: 'casamento-ana-rui',
    id: '00000000-0000-0000-0000-000000000000',
    title: 'Casamento de Ana & Rui',
    location: 'Quinta da Serra, Sintra',
    startDate: '2026-10-10',
    endDate: '2026-10-10',
    status: 'SCHEDULED',
    phase: 'upcoming', // a planear → RSVP dos convidados, sem check-in
    eventType: 'private',
    travel: false,
    currency: 'EUR',
    budget: 45000,
    managerPhone: '+351 912 000 444',
    description: 'Cerimónia e festa de casamento na Quinta da Serra, com jantar, música ao vivo e baile.',
    participants: 140,
    roles: [
      { key: 'convidado', name: 'Convidado' },
      { key: 'familia', name: 'Família dos Noivos' },
      { key: 'padrinhos', name: 'Padrinhos' },
      { key: 'testemunhas', name: 'Testemunhas' },
      { key: 'organizacao', name: 'Organização' },
      { key: 'staff', name: 'Staff' },
    ],
    // Casamento: convidados levam par e famílias com crianças (muitos acompanhantes).
    depCount: (i, status) => (status !== 'CANCELLED' && i % 2 === 0 ? (i % 6 === 0 ? 2 : 1) : 0),
    eventSuppliers: [
      { supplier: 'catering', amount: 18000, status: 'APPROVED', approval: 'APPROVED', desc: 'Cocktail e jantar servido para 140 convidados' },
      { supplier: 'banda', amount: 3500, status: 'APPROVED', approval: 'APPROVED', desc: 'Banda ao vivo e DJ para a festa' },
      { supplier: 'decoracao', amount: 4200, status: 'PENDING', approval: 'PENDING_APPROVAL', desc: 'Decoração floral da cerimónia e do salão' },
      { supplier: 'fotografia', amount: 2500, status: 'APPROVED', approval: 'APPROVED', desc: 'Fotografia e vídeo do casamento' },
      { supplier: 'iluminacao', amount: 1800, status: 'PENDING', approval: 'PENDING_APPROVAL', desc: 'Iluminação decorativa do espaço e jardim' },
    ],
    buildSchedule: ({ C, S, pg, ev }) => {
      const familia = pg(2, 6, 6); // role Família (i % 6 === 1)
      const staff = pg(6, 6, 4); // role Staff (i % 6 === 5)
      const primeiros = pg(1, 1, 12);
      return [
        // — Planeamento (meses antes) —
        { date: '2026-08-05', start: '18:00', end: '19:30', title: 'Reunião com o wedding planner', loc: 'Escritório', color: C.mirtilo, parts: staff, desc: 'Cronograma, orçamento e lista de fornecedores.', author: 'ney' },
        { date: '2026-08-22', start: '11:00', end: '13:00', title: 'Prova de menu', loc: 'Cozinha do catering', color: C.banana, supplier: S('catering'), desc: 'Degustação e escolha da ementa e do bolo.', author: 'dark' },
        { date: '2026-09-12', title: 'Fecho de confirmações (RSVP)', color: C.tomate, desc: 'Prazo final de resposta dos convidados.' },
        { date: '2026-09-26', start: '15:00', end: '16:00', title: 'Reunião com floristas e decoração', loc: 'Quinta da Serra', color: C.uva, supplier: S('decoracao'), desc: 'Escolha de flores, cores e disposição das mesas.', author: 'ney' },
        { date: '2026-10-09', start: '17:00', end: '19:00', title: 'Ensaio da cerimónia', loc: 'Quinta da Serra', color: C.flamingo, parts: familia, desc: 'Ensaio da entrada, votos e disposição dos lugares.', author: 'dark' },
        // — Dia do casamento —
        { date: ev.startDate, start: '16:00', end: '16:45', title: 'Cerimónia', loc: 'Jardim da Quinta', color: C.pavao, parts: familia, desc: 'Troca de votos e alianças.' },
        { date: ev.startDate, start: '17:00', end: '18:30', title: 'Cocktail de boas-vindas', loc: 'Terraço', color: C.manjericao, supplier: S('catering'), parts: primeiros },
        { date: ev.startDate, start: '19:00', end: '21:30', title: 'Jantar', loc: 'Salão Principal', color: C.tangerina, supplier: S('catering') },
        { date: ev.startDate, start: '21:30', end: '22:00', title: 'Corte do bolo e brinde', loc: 'Salão Principal', color: C.banana, parts: familia },
        { date: ev.startDate, start: '22:00', end: '22:30', title: 'Abertura de baile', loc: 'Salão Principal', color: C.uva, supplier: S('banda') },
        { date: ev.startDate, start: '22:30', title: 'Festa', loc: 'Salão Principal', color: C.flamingo, supplier: S('banda') },
      ];
    },
  },
  {
    slug: 'workshop-fotografia',
    id: '00000000-0000-0000-0000-000000000000',
    title: 'Workshop de Fotografia',
    location: 'Lisboa',
    startDate: '2026-07-16',
    endDate: '2026-07-16',
    status: 'ONGOING',
    phase: 'live', // a decorrer hoje → check-in em curso
    eventType: 'public',
    travel: false, // workshop local de um dia
    currency: 'EUR',
    budget: 8000,
    managerPhone: '+351 912 000 555',
    description: 'Workshop intensivo de um dia sobre composição, luz e retrato, com sessões práticas em estúdio e exterior.',
    participants: 50,
    roles: [
      { key: 'participante', name: 'Participante' },
      { key: 'formador', name: 'Formador' },
      { key: 'assistente', name: 'Assistente' },
      { key: 'organizacao', name: 'Organização' },
      { key: 'staff', name: 'Staff' },
    ],
    // Workshop profissional pequeno: poucos acompanhantes.
    depCount: (i) => (i % 12 === 5 ? 1 : 0),
    eventSuppliers: [
      { supplier: 'catering', amount: 900, status: 'PAID', approval: 'APPROVED', desc: 'Coffee-breaks e almoço leve' },
      { supplier: 'av', amount: 1500, status: 'APPROVED', approval: 'APPROVED', desc: 'Projeção, iluminação de estúdio e equipamento' },
    ],
    buildSchedule: ({ C, S, pg, ev }) => {
      const formadores = pg(2, 5, 3); // role Formador (i % 5 === 1)
      const staff = pg(5, 5, 3); // role Staff (i % 5 === 4)
      const primeiros = pg(1, 1, 10);
      return [
        // — Planeamento (semanas antes) —
        { date: '2026-06-30', title: 'Abertura de inscrições', loc: 'Plataforma online', color: C.uva, desc: 'Vagas limitadas a 50 participantes.' },
        { date: '2026-07-08', start: '16:00', end: '17:00', title: 'Confirmação do formador e programa', loc: 'Videochamada', color: C.pavao, parts: formadores, desc: 'Fecho do plano de sessões e materiais.', author: 'ney' },
        { date: '2026-07-14', start: '15:00', end: '17:00', title: 'Preparação do estúdio e equipamento', loc: 'Estúdio', color: C.flamingo, supplier: S('av'), parts: staff, desc: 'Montagem de luzes, fundos e teste de equipamento.', author: 'dark' },
        // — Dia do workshop —
        { date: ev.startDate, start: '09:30', end: '10:00', title: 'Receção e credenciamento', loc: 'Estúdio', color: C.manjericao, parts: staff },
        { date: ev.startDate, start: '10:00', end: '12:00', title: 'Sessão teórica: composição e luz', loc: 'Sala de Formação', color: C.mirtilo, parts: formadores, desc: 'Fundamentos de composição e leitura de luz.' },
        { date: ev.startDate, start: '12:00', end: '12:30', title: 'Coffee-break', loc: 'Foyer', color: C.banana, supplier: S('catering') },
        { date: ev.startDate, start: '12:30', end: '13:30', title: 'Prática: retrato em estúdio', loc: 'Estúdio', color: C.tangerina, parts: primeiros, desc: 'Exercício de retrato com luz controlada.' },
        { date: ev.startDate, start: '13:30', end: '14:30', title: 'Almoço', loc: 'Foyer', color: C.manjericao, supplier: S('catering') },
        { date: ev.startDate, start: '14:30', end: '16:30', title: 'Prática: fotografia de exterior', loc: 'Jardim próximo', color: C.pavao, parts: primeiros, desc: 'Saída fotográfica com luz natural.' },
        { date: ev.startDate, start: '16:30', end: '17:30', title: 'Revisão de portfólios e encerramento', loc: 'Sala de Formação', color: C.tomate, parts: primeiros, desc: 'Feedback individual e entrega de certificados.' },
      ];
    },
  },
  {
    slug: 'feira-artesanato',
    id: '00000000-0000-0000-0000-000000000000',
    title: 'Feira de Artesanato',
    location: 'Cascais',
    startDate: '2026-08-15',
    endDate: '2026-08-15',
    status: 'CANCELLED',
    phase: 'cancelled', // cancelado → inscritos sem presenças, fornecedores rejeitados
    eventType: 'public',
    travel: false,
    currency: 'EUR',
    budget: 25000,
    managerPhone: '+351 912 000 666',
    description: 'Feira de artesanato ao ar livre — cancelada por condições logísticas. As inscrições ficam registadas para reembolso.',
    participants: 90,
    roles: [
      { key: 'visitante', name: 'Visitante' },
      { key: 'expositor', name: 'Expositor' },
      { key: 'vip', name: 'VIP' },
      { key: 'patrocinador', name: 'Patrocinador' },
      { key: 'organizacao', name: 'Organização' },
      { key: 'staff', name: 'Staff' },
    ],
    depCount: (i) => (i % 8 === 3 ? 1 : 0),
    eventSuppliers: [
      { supplier: 'av', amount: 3000, status: 'PAID', approval: 'APPROVED', desc: 'Sinal de som ambiente e sinalética (pago antes do cancelamento, não reembolsável)' },
      { supplier: 'catering', amount: 4000, status: 'REJECTED', approval: 'REJECTED', desc: 'Food court da feira — contrato cancelado' },
      { supplier: 'seguranca', amount: 2200, status: 'REJECTED', approval: 'REJECTED', desc: 'Segurança do recinto — contrato cancelado' },
      { supplier: 'decoracao', amount: 1800, status: 'REJECTED', approval: 'REJECTED', desc: 'Montagem e decoração dos stands — contrato cancelado' },
    ],
    buildSchedule: ({ C, S, pg, ev }) => {
      const expositores = pg(2, 6, 5); // role Expositor (i % 6 === 1)
      const staff = pg(6, 6, 4); // role Staff (i % 6 === 5)
      const primeiros = pg(1, 1, 10);
      return [
        // — Planeamento (antes do cancelamento) —
        { date: '2026-06-20', title: 'Abertura de inscrições de expositores', loc: 'Plataforma online', color: C.uva, desc: 'Candidaturas de artesãos abertas.' },
        { date: '2026-07-05', start: '15:00', end: '16:30', title: 'Confirmação de expositores', loc: 'Videochamada', color: C.pavao, parts: expositores, desc: 'Seleção dos artesãos e distribuição dos stands.', author: 'ney' },
        { date: '2026-07-28', start: '10:00', end: '11:00', title: 'Reunião de logística e segurança', loc: 'Escritório', color: C.tangerina, supplier: S('seguranca'), parts: staff, desc: 'Plano de acessos, stands e segurança do recinto.', author: 'dark' },
        { date: '2026-08-01', title: 'Cancelamento do evento', color: C.tomate, desc: 'Evento cancelado por condições logísticas. Início do processo de reembolso.' },
        // — Dia previsto (não se realiza) —
        { date: ev.startDate, start: '10:00', end: '11:00', title: 'Abertura ao público (previsto)', loc: 'Recinto de Cascais', color: C.manjericao, parts: primeiros },
        { date: ev.startDate, start: '11:00', end: '18:00', title: 'Feira e workshops de artesanato (previsto)', loc: 'Stands', color: C.mirtilo, supplier: S('av'), parts: expositores },
      ];
    },
  },
];

const pick = (arr, i) => arr[i % arr.length];
const pad = (n, w = 3) => String(n).padStart(w, '0');
const stripAccents = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '');

// Estado de um participante consoante a fase do evento. 'upcoming' nunca tem
// ATTENDED (ninguém compareceu ainda); 'past' tem a maioria ATTENDED.
function statusForPhase(i, phase) {
  if (phase === 'cancelled') {
    // evento cancelado: tinha inscritos (RSVP), agora com mais cancelamentos; sem presenças
    if (i % 3 === 0) return 'CANCELLED';
    return i % 2 === 0 ? 'CONFIRMED' : 'REGISTERED';
  }
  if (phase === 'upcoming') {
    if (i % 10 === 4) return 'CANCELLED';
    return i % 3 === 0 ? 'REGISTERED' : 'CONFIRMED';
  }
  if (phase === 'past') {
    if (i % 12 === 5) return 'CANCELLED';
    return i % 10 < 8 ? 'ATTENDED' : 'CONFIRMED';
  }
  // 'live'
  if (i % 10 === 4) return 'CANCELLED';
  if (i % 3 === 0) return 'ATTENDED';
  if (i % 3 === 1) return 'CONFIRMED';
  return 'REGISTERED';
}

// ── Geração de ficheiros de demonstração (sem libs externas p/ PDF e PNG) ────

/** CRC32 (tabela) — para os chunks do PNG. */
function crc32(buf) {
  let c;
  const table = crc32.table || (crc32.table = (() => {
    const t = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      t[n] = c >>> 0;
    }
    return t;
  })());
  c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = table[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

/** PNG de cor sólida (RGB), sem dependências. */
function pngSolid(width, height, [r, g, b]) {
  const chunk = (type, data) => {
    const typeBuf = Buffer.from(type, 'ascii');
    const body = Buffer.concat([typeBuf, data]);
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length, 0);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(body), 0);
    return Buffer.concat([len, body, crc]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // colour type: truecolour
  const stride = width * 3;
  const raw = Buffer.alloc(height * (stride + 1));
  for (let y = 0; y < height; y++) {
    const off = y * (stride + 1);
    raw[off] = 0;
    for (let x = 0; x < width; x++) {
      const p = off + 1 + x * 3;
      raw[p] = r; raw[p + 1] = g; raw[p + 2] = b;
    }
  }
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

/** PDF de 1 página com linhas de texto (Helvetica), xref correto. */
function pdfSimple(title, lines) {
  const esc = (s) => stripAccents(s).replace(/([()\\])/g, '\\$1');
  const content =
    `BT /F1 22 Tf 60 770 Td (${esc(title)}) Tj ET\n` +
    lines.map((l, i) => `BT /F1 12 Tf 60 ${730 - i * 22} Td (${esc(l)}) Tj ET`).join('\n');
  const objs = [
    '<</Type/Catalog/Pages 2 0 R>>',
    '<</Type/Pages/Kids[3 0 R]/Count 1>>',
    '<</Type/Page/Parent 2 0 R/MediaBox[0 0 595 842]/Resources<</Font<</F1 4 0 R>>>>/Contents 5 0 R>>',
    '<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>',
    `<</Length ${Buffer.byteLength(content, 'latin1')}>>\nstream\n${content}\nendstream`,
  ];
  let pdf = '%PDF-1.4\n';
  const offsets = [];
  objs.forEach((o, i) => {
    offsets.push(Buffer.byteLength(pdf, 'latin1'));
    pdf += `${i + 1} 0 obj\n${o}\nendobj\n`;
  });
  const xrefStart = Buffer.byteLength(pdf, 'latin1');
  pdf += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n`;
  offsets.forEach((off) => { pdf += `${String(off).padStart(10, '0')} 00000 n \n`; });
  pdf += `trailer\n<</Size ${objs.length + 1}/Root 1 0 R>>\nstartxref\n${xrefStart}\n%%EOF`;
  return Buffer.from(pdf, 'latin1');
}

/** Folha de orçamento (XLSX) a partir dos fornecedores do evento. */
async function xlsxBudget(ev, eventSuppliers) {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Orçamento');
  ws.columns = [
    { header: 'Fornecedor', key: 'f', width: 32 },
    { header: 'Serviço', key: 's', width: 40 },
    { header: 'Valor (EUR)', key: 'v', width: 14 },
    { header: 'Estado', key: 'e', width: 14 },
  ];
  ws.getRow(1).font = { bold: true };
  for (const es of eventSuppliers) {
    const sup = SUPPLIERS.find((s) => s.key === es.supplier);
    ws.addRow({ f: sup.name, s: es.desc, v: es.amount, e: es.status });
  }
  const total = eventSuppliers.reduce((a, es) => a + es.amount, 0);
  ws.addRow({});
  ws.addRow({ s: 'TOTAL', v: total, e: '' }).font = { bold: true };
  ws.addRow({ s: 'Orçamento', v: ev.budget, e: '' }).font = { bold: true };
  return Buffer.from(await wb.xlsx.writeBuffer());
}

// ── Escrita idempotente ──────────────────────────────────────────────────────
const counters = {};
const bump = (k) => { counters[k] = (counters[k] || 0) + 1; };

async function put(tableName, item, label) {
  bump(label);
  if (!EXECUTE) return;
  try {
    await dynamo.send(new PutItemCommand({
      TableName: tableName,
      Item: marshall(item, { removeUndefinedValues: true }),
      ConditionExpression: 'attribute_not_exists(id)',
    }));
  } catch (err) {
    if (err.name !== 'ConditionalCheckFailedException') throw err;
    // já existe — idempotente, segue
  }
}

async function putObject(bucket, key, body, contentType) {
  bump('s3Files');
  if (!EXECUTE) return;
  await s3.send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: body, ContentType: contentType }));
}

// ── Build de um evento ───────────────────────────────────────────────────────
async function seedEvent(ev, tables) {
  const now = new Date().toISOString();
  const OWNER = owner(ENV.users.owner);
  const eid = ev.id;
  const roleId = (key) => `${eid}-role-${key}`;
  // Grupo de participantes por índice, p/ associar às entradas de agenda.
  const pg = (offset, step, count) => Array.from({ length: count }, (_, k) => `${eid}-p-${pad(offset + k * step)}`);
  const ownerId = await resolveIdentity(ENV.users.owner); // nome/email reais do dono

  console.log(`\n▸ ${ev.title}  (${eid}) — dono: ${ownerId.name ?? '(sem nome)'} · fase ${ev.phase}`);

  // 1 · Event — counts a 0 (streams somam; reconciliados no fim).
  const committed = ev.eventSuppliers.filter((e) => e.status !== 'PAID' && e.status !== 'REJECTED').reduce((a, e) => a + e.amount, 0);
  const effective = ev.eventSuppliers.filter((e) => e.status === 'PAID').reduce((a, e) => a + e.amount, 0);
  await put(tables.Event, {
    id: eid,
    eventTitle: ev.title,
    eventManager: ownerId.name,
    eventManagerEmail: ownerId.email,
    eventManagerPhone: ev.managerPhone,
    eventLocation: ev.location,
    eventDateType: 'range',
    eventStartDate: ev.startDate,
    eventEndDate: ev.endDate,
    eventStatus: ev.status,
    // eventType no schema É o tipo de ACESSO — o frontend renderiza
    // t(`eventForm.accessTypes.${eventType}`) e só 'public'/'private' são válidos.
    eventType: ev.eventType,
    description: ev.description,
    categories: ['CORPORATE'],
    budget: ev.budget,
    currency: ev.currency,
    committedExpenses: committed,
    effectiveExpenses: effective,
    participantCount: 0,
    dependentCount: 0,
    totalRegistrations: 0,
    planKey: 'PRO',
    organizerId: ENV.users.owner,
    owner: OWNER,
    ownerName: ownerId.name,
    ownerEmail: ownerId.email,
    eventCreationDate: now,
    createdAt: now,
    updatedAt: now,
    __typename: 'Event',
  }, 'Event');

  // 2 · Roles
  for (const r of ev.roles) {
    await put(tables.Role, {
      id: roleId(r.key), name: r.name, eventId: eid, owner: OWNER,
      archived: false, createdAt: now, updatedAt: now, __typename: 'Role',
    }, 'Role');
  }

  // 3 · Participants — estados consoante a fase; subset com viagem se ev.travel.
  const depPlan = []; // { pIndex, count }
  for (let i = 0; i < ev.participants; i++) {
    const name = `${pick(FIRST, i * 7 + 3)} ${pick(LAST, i * 3 + 1)}`;
    const org = pick(ORGS, i);
    const roleKey = ev.roles[i % ev.roles.length].key;
    const status = statusForPhase(i, ev.phase);

    const depCount = ev.depCount(i, status);
    if (depCount) depPlan.push({ pIndex: i, count: depCount });

    const withTravel = ev.travel && i % 5 === 0;
    const email = `${stripAccents(name).toLowerCase().replace(/\s+/g, '.')}@${stripAccents(org).toLowerCase().replace(/[^a-z]/g, '').slice(0, 12)}.pt`;

    await put(tables.Participant, {
      id: `${eid}-p-${pad(i + 1)}`,
      participantName: name,
      participantEmail: email,
      participantPhone: `+351 9${pick(['1', '2', '3', '6'], i)}${pad((i * 137) % 10000000, 7)}`,
      participantStatus: status,
      participantJob: pick(JOBS, i * 2),
      organization: org,
      nationality: 'Portuguesa',
      residenceCountry: 'Portugal',
      roleId: roleId(roleKey),
      eventId: eid,
      dependentsCount: depCount,
      registrationDate: now,
      confirmationDate: status === 'CONFIRMED' || status === 'ATTENDED' ? now : undefined,
      attendedDate: status === 'ATTENDED' ? now : undefined,
      ...(withTravel ? {
        arrivalDate: ev.startDate, arrivalFlight: `TP${1000 + i}`, arrivalAirport: 'LIS',
        hotel: pick(['Pestana Palace', 'Tivoli Avenida', 'Corinthia Lisboa'], i),
        roomType: 'Individual', checkInDate: ev.startDate, checkOutDate: ev.endDate, nights: 1,
        transferRequired: true,
      } : {}),
      createdAt: now, updatedAt: now, __typename: 'Participant',
    }, 'Participant');
  }

  // 4 · Dependents — ligados ao subset planeado; ATTENDED só se a fase o permite.
  const attendedPhase = ev.phase === 'live' || ev.phase === 'past';
  let depSeq = 0;
  for (const { pIndex, count } of depPlan) {
    for (let d = 0; d < count; d++) {
      depSeq++;
      const attended = attendedPhase && depSeq % 3 === 0;
      await put(tables.Dependent, {
        id: `${eid}-dep-${pad(depSeq)}`,
        name: pick(DEP_NAMES, depSeq + d),
        age: pick(['adult', 'child', 'baby'], depSeq),
        participantId: `${eid}-p-${pad(pIndex + 1)}`,
        eventId: eid,
        status: attended ? 'ATTENDED' : 'REGISTERED',
        attendedDate: attended ? now : undefined,
        createdAt: now, updatedAt: now, __typename: 'Dependent',
      }, 'Dependent');
    }
  }
  const dependentTotal = depSeq;

  // 5 · DocumentFolders — default "Geral" + 3 pastas.
  const folders = [
    { id: `default-${eid}`, name: 'Geral', isDefault: true, order: -1, color: '#6C4CC4' },
    { id: `${eid}-folder-programa`, name: 'Programa', order: 1, color: '#2E6FB5' },
    { id: `${eid}-folder-logistica`, name: 'Logística', order: 2, color: '#1B9668' },
    { id: `${eid}-folder-contratos`, name: 'Contratos', order: 3, color: '#B67E13' },
  ];
  for (const f of folders) {
    await put(tables.DocumentFolder, {
      id: f.id, eventId: eid, name: f.name, isDefault: f.isDefault || false,
      order: f.order, color: f.color, owner: OWNER,
      createdAt: now, updatedAt: now, __typename: 'DocumentFolder',
    }, 'DocumentFolder');
  }

  // 6 · Ficheiros → S3 (cobrem os renderers: md, pdf, png, xlsx, csv). Derivados
  //   dos dados do evento — o programa vem das entradas da agenda nos dias do evento.
  const schedule = ev.buildSchedule({ C, S: (k) => `demo-supplier-${k}`, pg, ev });
  const bucket = ENV.bucket;
  const s3key = (folderId, file) => `event-documents/${eid}/${folderId}/${file}`;
  const notasMd = `# Notas — ${ev.title}\n\n- **Datas:** ${ev.startDate}${ev.endDate !== ev.startDate ? ` a ${ev.endDate}` : ''}\n- **Local:** ${ev.location}\n\n${ev.description}\n`;
  const contactosCsv =
    'Nome,Organização,Cargo,Email\n' +
    Array.from({ length: 12 }, (_, i) => {
      const n = `${pick(FIRST, i * 5)} ${pick(LAST, i * 2)}`;
      return `${n},${pick(ORGS, i)},${pick(JOBS, i)},${stripAccents(n).toLowerCase().replace(/\s+/g, '.')}@exemplo.pt`;
    }).join('\n') + '\n';
  const programaPdf = pdfSimple(`Programa - ${stripAccents(ev.title)}`,
    schedule
      .filter((s) => s.date >= ev.startDate && s.date <= ev.endDate)
      .map((s) => `${s.date} ${s.start ?? 'todo o dia'}  ${s.title}`));
  const plantaPng = pngSolid(640, 400, [108, 76, 196]);
  const orcamentoXlsx = await xlsxBudget(ev, ev.eventSuppliers);

  await putObject(bucket, s3key(`default-${eid}`, 'notas.md'), notasMd, 'text/markdown');
  await putObject(bucket, s3key(`${eid}-folder-programa`, 'programa.pdf'), programaPdf, 'application/pdf');
  await putObject(bucket, s3key(`${eid}-folder-logistica`, 'planta-sala.png'), plantaPng, 'image/png');
  await putObject(bucket, s3key(`${eid}-folder-logistica`, 'orcamento.xlsx'), orcamentoXlsx, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  await putObject(bucket, s3key(`${eid}-folder-contratos`, 'lista-contactos.csv'), contactosCsv, 'text/csv');

  // 7 · Suppliers (só os usados pelo evento) + EventSupplier (ligação).
  const usedKeys = [...new Set(ev.eventSuppliers.map((e) => e.supplier))];
  for (const key of usedKeys) {
    const s = SUPPLIERS.find((x) => x.key === key);
    await put(tables.Supplier, {
      id: `demo-supplier-${s.key}`, name: s.name, owner: OWNER, country: 'Portugal',
      category: s.category, contactName: s.contact,
      contactEmail: `${s.key}@exemplo.pt`, contactPhone: '+351 210 000 000',
      estimateMinAmount: s.min, estimateMaxAmount: s.max, estimateUnit: s.unit,
      currency: 'EUR', tags: [s.category], createdAt: now, updatedAt: now, __typename: 'Supplier',
    }, 'Supplier');
  }
  let esSeq = 0;
  for (const es of ev.eventSuppliers) {
    esSeq++;
    const paid = es.status === 'PAID';
    const approved = es.approval === 'APPROVED';
    await put(tables.EventSupplier, {
      id: `${eid}-es-${pad(esSeq)}`, eventId: eid, supplierId: `demo-supplier-${es.supplier}`,
      quoteAmount: es.amount, currency: 'EUR', status: es.status, description: es.desc,
      approvalStatus: es.approval, requestedBy: ENV.users.owner,
      approvedBy: approved ? ENV.users.owner : undefined,
      approvedAt: approved ? now : undefined,
      paidAt: paid ? now : undefined,
      owner: OWNER, createdAt: now, updatedAt: now, __typename: 'EventSupplier',
    }, 'EventSupplier');
  }

  // 8 · EventCollaborators — 2 aceites (users reais) + 1 pendente. Nome/email
  //   resolvidos do Cognito (como o accept-invitation faz), não inventados.
  const collabs = [
    { key: 'ney', sub: ENV.users.ney, role: 'CO_MANAGER', status: 'ACCEPTED' },
    { key: 'dark', sub: ENV.users.dark, role: 'STAFF_LOGISTICS', status: 'ACCEPTED' },
    { key: 'pend', sub: undefined, email: 'convidado@exemplo.pt', role: 'STAFF_LOGISTICS', status: 'PENDING' },
  ];
  for (const c of collabs) {
    const id = await resolveIdentity(c.sub);
    await put(tables.EventCollaborator, {
      id: `${eid}-collab-${c.key}`, eventId: eid,
      userId: c.sub, userEmail: id.email ?? c.email, userName: id.name ?? undefined, role: c.role, status: c.status,
      invitedBy: ENV.users.owner, invitedAt: now,
      acceptedAt: c.status === 'ACCEPTED' ? now : undefined,
      owner: OWNER, createdAt: now, updatedAt: now, __typename: 'EventCollaborator',
    }, 'EventCollaborator');
  }

  // 9 · EventScheduleEntry — planeamento (antes) + sessões no(s) dia(s) do evento.
  //   author: quem criou a entrada (avatar na agenda). Omisso = dev (dono).
  let schSeq = 0;
  for (const s of schedule) {
    schSeq++;
    await put(tables.EventScheduleEntry, {
      id: `${eid}-sch-${pad(schSeq)}`, eventId: eid, date: s.date,
      startTime: s.start, endTime: s.end, title: s.title, description: s.desc,
      location: s.loc, color: s.color, supplierId: s.supplier, participantIds: s.parts,
      order: schSeq, owner: owner(ENV.users[s.author] || ENV.users.owner),
      createdAt: now, updatedAt: now, __typename: 'EventScheduleEntry',
    }, 'EventScheduleEntry');
  }

  // 10 · Reconciliação dos contadores (SET absoluto sobre o que os streams somaram).
  const pCount = ev.participants;
  const dCount = dependentTotal;
  if (EXECUTE) {
    console.log('  … a aguardar os streams antes de reconciliar os contadores');
    await new Promise((r) => setTimeout(r, 8000));
    await dynamo.send(new UpdateItemCommand({
      TableName: tables.Event,
      Key: marshall({ id: eid }),
      UpdateExpression: 'SET participantCount = :p, dependentCount = :d, totalRegistrations = :t, updatedAt = :u',
      ExpressionAttributeValues: marshall({ ':p': pCount, ':d': dCount, ':t': pCount + dCount, ':u': new Date().toISOString() }),
    }));
  }
  console.log(`  counts → participantes ${pCount} · dependentes ${dCount} · registos ${pCount + dCount}`);
}

// ── Reset de um evento ───────────────────────────────────────────────────────
async function deleteByEventId(tableName, eid, viaIndex) {
  const ids = [];
  if (viaIndex) {
    let lastKey;
    do {
      const res = await dynamo.send(new QueryCommand({
        TableName: tableName, IndexName: 'byEventId',
        KeyConditionExpression: 'eventId = :e',
        ExpressionAttributeValues: marshall({ ':e': eid }),
        ProjectionExpression: 'id', ExclusiveStartKey: lastKey,
      }));
      ids.push(...(res.Items || []).map((i) => unmarshall(i).id));
      lastKey = res.LastEvaluatedKey;
    } while (lastKey);
  } else {
    // Participant/Dependent não têm GSI byEventId — scan + filtro.
    let lastKey;
    do {
      const res = await dynamo.send(new ScanCommand({
        TableName: tableName, FilterExpression: 'eventId = :e',
        ExpressionAttributeValues: marshall({ ':e': eid }),
        ProjectionExpression: 'id', ExclusiveStartKey: lastKey,
      }));
      ids.push(...(res.Items || []).map((i) => unmarshall(i).id));
      lastKey = res.LastEvaluatedKey;
    } while (lastKey);
  }
  for (const id of ids) {
    if (EXECUTE) await dynamo.send(new DeleteItemCommand({ TableName: tableName, Key: marshall({ id }) }));
  }
  return ids.length;
}

async function resetEvent(ev, tables) {
  const eid = ev.id;
  console.log(`\n✗ Reset ${ev.title} (${eid})`);
  const plan = [
    ['Role', tables.Role, true], ['EventSupplier', tables.EventSupplier, true],
    ['DocumentFolder', tables.DocumentFolder, true], ['EventCollaborator', tables.EventCollaborator, true],
    ['EventScheduleEntry', tables.EventScheduleEntry, true],
    ['Participant', tables.Participant, false], ['Dependent', tables.Dependent, false],
  ];
  for (const [label, table, viaIndex] of plan) {
    const n = await deleteByEventId(table, eid, viaIndex);
    console.log(`  ${EXECUTE ? 'apagados' : 'apagaria'} ${n}  ${label}`);
  }
  // S3
  let s3n = 0, token;
  do {
    const res = await s3.send(new ListObjectsV2Command({ Bucket: ENV.bucket, Prefix: `event-documents/${eid}/`, ContinuationToken: token }));
    for (const obj of res.Contents || []) {
      s3n++;
      if (EXECUTE) await s3.send(new DeleteObjectCommand({ Bucket: ENV.bucket, Key: obj.Key }));
    }
    token = res.IsTruncated ? res.NextContinuationToken : undefined;
  } while (token);
  console.log(`  ${EXECUTE ? 'apagados' : 'apagaria'} ${s3n}  ficheiros S3`);
  // Event (por último)
  if (EXECUTE) await dynamo.send(new DeleteItemCommand({ TableName: tables.Event, Key: marshall({ id: eid }) }));
  console.log(`  ${EXECUTE ? 'apagado' : 'apagaria'} 1  Event`);
  console.log('  (Suppliers globais do catálogo mantidos)');
}

// ── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log('\n=== Seed de evento de demonstração ===');
  console.log(`   Mode: ${EXECUTE ? 'EXECUTING' : 'DRY-RUN (use --execute para escrever)'}`);
  console.log(`   Env:  ${envName} · suffix ${SUFFIX}`);

  const all = await listAllTables(dynamo);
  const MODELS = ['Event', 'Role', 'Participant', 'Dependent', 'DocumentFolder', 'Supplier', 'EventSupplier', 'EventCollaborator', 'EventScheduleEntry'];
  const tables = Object.fromEntries(MODELS.map((m) => [m, findTable(all, m, { suffix: SUFFIX })]));

  if (resetSlug) {
    const ev = EVENTS.find((e) => e.slug === resetSlug);
    if (!ev) { console.error(`Evento desconhecido: ${resetSlug}`); process.exit(1); }
    await resetEvent(ev, tables);
    console.log('');
    return;
  }

  const ev = eventSlug ? EVENTS.find((e) => e.slug === eventSlug) : EVENTS[0];
  if (!ev) { console.error(`Evento desconhecido: ${eventSlug}`); process.exit(1); }
  await seedEvent(ev, tables);

  console.log('\n── Resumo ──');
  for (const [k, v] of Object.entries(counters)) console.log(`   ${k}: ${v}`);
  console.log(`\n${EXECUTE ? '✅ Semeado.' : 'Dry-run concluído — re-corre com --execute para escrever.'}\n`);
}

main().catch((err) => { console.error('\nFalhou:', err); process.exit(1); });
