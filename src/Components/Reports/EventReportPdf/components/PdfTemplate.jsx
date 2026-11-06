import { Page, View, Text, StyleSheet } from '@react-pdf/renderer';
import PropTypes from 'prop-types';
import { theme } from '../theme';
import BrandIcon from './shared/BrandIcon';

const styles = StyleSheet.create({
  page: {
    padding: theme.spacing.lg,
    fontFamily: theme.typography.fontFamily.primary,
    backgroundColor: theme.colors.white,
    minPresenceAhead: 300,
    // Lexend/Plus Jakarta Sans substitute "fi"/"fl" with a single ligature
    // glyph by default; react-pdf's PDF text layer doesn't map that glyph
    // back to "fi"/"fl" on copy/extraction, silently dropping the "i"/"l"
    // (e.g. "confirmar" -> "confrmar"). Disabling both ligature features
    // here cascades to every nested Text in the document.
    fontFeatureSettings: [['liga', 0], ['dlig', 0]]
  },
  header: {
    backgroundColor: theme.colors.primary,
    padding: theme.spacing.md,
    borderTopLeftRadius: theme.borderRadius.md,
    borderTopRightRadius: theme.borderRadius.md
  },
  accentBar: {
    flexDirection: 'row',
    height: 4,
    marginBottom: theme.spacing.lg,
    borderBottomLeftRadius: theme.borderRadius.sm,
    borderBottomRightRadius: theme.borderRadius.sm,
    overflow: 'hidden'
  },
  accentBarPrimary: {
    flex: 1,
    backgroundColor: theme.colors.primary
  },
  accentBarSecondary: {
    flex: 1,
    backgroundColor: theme.colors.secondary
  },
  headerBrand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm
  },
  headerTitle: {
    color: theme.colors.white,
    fontSize: theme.typography.fontSize['2xl'],
    fontFamily: theme.typography.fontFamily.display,
    fontWeight: theme.typography.fontWeight.bold
  },
  headerSubtitle: {
    color: theme.colors.background.light,
    fontSize: theme.typography.fontSize.md,
    marginTop: theme.spacing.xs
  },
  dateBox: {
    backgroundColor: theme.colors.white,
    padding: theme.spacing.sm,
    borderRadius: theme.borderRadius.md
  },
  dateLabel: {
    color: theme.colors.text.light,
    fontSize: theme.typography.fontSize.xs,
    textTransform: 'uppercase'
  },
  dateValue: {
    color: theme.colors.primary,
    fontFamily: theme.typography.fontFamily.primary,
    fontWeight: theme.typography.fontWeight.semibold,
    fontSize: theme.typography.fontSize.sm
  },
  title: {
    fontSize: theme.typography.fontSize.xl,
    color: theme.colors.text.default,
    fontFamily: theme.typography.fontFamily.display,
    fontWeight: theme.typography.fontWeight.bold,
    textAlign: 'center',
    marginBottom: theme.spacing.md
  },
  subtitle: {
    fontSize: theme.typography.fontSize.lg,
    color: theme.colors.text.light,
    textAlign: 'center',
    marginBottom: theme.spacing.lg
  },
  content: {
    flex: 1,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md
  },
  footer: {
    borderTopWidth: 1,
    borderColor: theme.colors.background.default,
    paddingTop: theme.spacing.md,
    marginTop: theme.spacing.lg,
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  footerText: {
    color: theme.colors.text.light,
    fontSize: theme.typography.fontSize.xs
  }
});

const PdfTemplate = ({ title, subtitle, date, children, t }) => {
  return (
    <Page size="A4" style={styles.page}>
      {/* Header */}
      <View style={styles.header}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <View style={styles.headerBrand}>
            <BrandIcon size={28} color={theme.colors.white} />
            <View>
              <Text style={styles.headerTitle}>{t('eventReport.pdfTemplate.header.title', 'Bafatório')}</Text>
              <Text style={styles.headerSubtitle}>{t('eventReport.pdfTemplate.header.subtitle', 'Gestão de Eventos')}</Text>
            </View>
          </View>
          <View style={styles.dateBox}>
            <Text style={styles.dateLabel}>{t('eventReport.pdfTemplate.header.dateLabel', 'Data do Relatório')}</Text>
            <Text style={styles.dateValue}>{date}</Text>
          </View>
        </View>
      </View>
      <View style={styles.accentBar}>
        <View style={styles.accentBarPrimary} />
        <View style={styles.accentBarSecondary} />
      </View>

      {/* Title Section */}
      <View style={{ marginBottom: 30 }}>
        <Text style={styles.title}>{title || t('eventReport.title')}</Text>
        {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
      </View>

      {/* Content */}
      <View style={styles.content}>
        {children}
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <View>
          <Text style={[styles.footerText, { fontFamily: theme.typography.fontFamily.primary, fontWeight: theme.typography.fontWeight.semibold }]}>
            {t('eventReport.pdfTemplate.footer.copyright', '© Bafatório {{year}}. Todos os direitos reservados.', { year: new Date().getFullYear() })}
          </Text>
        </View>
        {/* O documento quebra em quantas páginas o conteúdo pedir; os números
            só existem na paginação do react-pdf, não no sítio que o monta. */}
        <Text
          style={styles.footerText}
          fixed
          render={({ pageNumber, totalPages }) =>
            t('eventReport.pdfTemplate.footer.pageInfo', 'Página {{pageNumber}} de {{totalPages}}', { pageNumber, totalPages })
          }
        />
      </View>
    </Page>
  );
};

PdfTemplate.propTypes = {
  title: PropTypes.string,
  subtitle: PropTypes.string,
  date: PropTypes.string.isRequired,
  children: PropTypes.node.isRequired,
  t: PropTypes.func.isRequired
};

export { PdfTemplate };