import { theme } from '../../theme';

export const sharedStyles = {
  // Plain, unboxed section wrapper — running text and headings flow
  // directly on the page, no card background/border around them.
  section: {
    marginBottom: theme.spacing.xl,
    minPresenceAhead: 300
  },
  contentWrapper: {
    marginBottom: theme.spacing.md
  },
  card: {
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.white,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.md
  },
  label: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.text.light,
    fontFamily: theme.typography.fontFamily.primary,
    marginBottom: theme.spacing.xs
  },
  value: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.text.dark,
    fontFamily: theme.typography.fontFamily.primary,
    fontWeight: theme.typography.fontWeight.semibold
  },
  metric: {
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.md
  },
  description: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.text.light,
    fontFamily: theme.typography.fontFamily.primary,
    marginBottom: theme.spacing.sm
  },
  // Running-text sections (no cards): prose paragraphs with highlighted
  // key figures, matching ExecutiveSummary's established look.
  content: {
    color: theme.colors.text.default,
    fontSize: theme.typography.fontSize.md,
    lineHeight: theme.typography.lineHeight.relaxed,
    fontFamily: theme.typography.fontFamily.primary
  },
  highlight: {
    color: theme.colors.primary,
    fontFamily: theme.typography.fontFamily.primary,
    fontWeight: theme.typography.fontWeight.bold
  },
  paragraph: {
    marginBottom: theme.spacing.md
  },
  // Peças comuns às tabelas do relatório (participantes, fornecedores,
  // distribuição). As larguras das colunas ficam em cada tabela — só isso é
  // que varia entre elas.
  tableHeaderText: {
    fontFamily: theme.typography.fontFamily.primary,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.text.default,
    fontSize: theme.typography.fontSize.sm
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: theme.spacing.sm
  },
  statusText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.text.default
  },
  emptyText: {
    fontSize: theme.typography.fontSize.md,
    color: theme.colors.text.light,
    textAlign: 'center',
    padding: theme.spacing.lg
  }
};