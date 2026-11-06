/**
 * Teste anti-drift do teto de participantes (ADR-038).
 *
 * O gate por contagem só vale se TODOS os caminhos que criam participantes o
 * chamarem. O buraco do Fidelize existiu precisamente assim: o handler chamava
 * ensureEventWritable e ensureIntegrationsAllowed, mas nunca ensureWithinLimit,
 * e ninguém deu por isso enquanto o Por Evento teve participantes ilimitados.
 *
 * Este teste lê a FONTE dos handlers: qualquer novo caminho de criação passa a
 * falhar aqui até gatear ou até ser isentado por escrito, com razão.
 */
import { readdirSync, readFileSync, existsSync } from 'fs';
import { join } from 'path';

const FUNCTION_DIR = join(__dirname, '..');

// Comandos que ACRESCENTAM linhas à tabela. Update/Delete não fazem crescer a
// contagem, logo não têm de gatear.
const CREATE_COMMANDS = /new (PutItemCommand|BatchWriteItemCommand|TransactWriteItemsCommand)|batchWriteItems\(/;

// Isenções, cada uma com a sua razão. Uma entrada nesta lista é uma decisão,
// não um esquecimento.
const EXEMPT: Record<string, string> = {
  // Dependentes não entram no limite: o gate conta participantCount e não
  // totalRegistrations. Já está comentado no próprio handler — não "corrigir".
  'create-dependent': 'dependentes não contam para o limite (participantCount ≠ totalRegistrations)',
  // Escrevem na tabela para a esvaziar ou para reconciliar contagens.
  'delete-event-cascade': 'apaga participantes, nunca cria',
  'delete-user-data': 'apaga participantes, nunca cria',
  'dependent-stream': 'reconcilia contadores desnormalizados, não cria participantes',
  'confirm-participant': 'confirma um participante existente',
  'delete-participants': 'BatchWrite só de DeleteRequest',
  // Só passa o nome da tabela ao resolver de acesso; as escritas são de agenda.
  'create-event-schedule-entry': 'lê participantes, escreve entradas de agenda',
};

const handlersWritingParticipants = (): string[] =>
  readdirSync(FUNCTION_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .filter((name) => {
      const handlerPath = join(FUNCTION_DIR, name, 'handler.ts');
      if (!existsSync(handlerPath)) return false;
      const source = readFileSync(handlerPath, 'utf8');
      return source.includes('PARTICIPANT_TABLE') && CREATE_COMMANDS.test(source);
    });

describe('teto de participantes — nenhum caminho de criação sem gate', () => {
  test.each(handlersWritingParticipants())(
    '%s chama ensureWithinLimit (ou está isentado com razão)',
    (name) => {
      const source = readFileSync(join(FUNCTION_DIR, name, 'handler.ts'), 'utf8');
      if (EXEMPT[name]) {
        expect(EXEMPT[name]).toBeTruthy();
        return;
      }
      expect(source).toContain('ensureWithinLimit');
    }
  );

  test('o levantamento não está vazio — um regex partido tornaria isto decorativo', () => {
    expect(handlersWritingParticipants().length).toBeGreaterThanOrEqual(4);
  });
});
