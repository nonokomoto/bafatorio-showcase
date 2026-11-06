import { View, Text, StyleSheet } from '@react-pdf/renderer';
import PropTypes from 'prop-types';
import { theme } from '../theme';
import { sharedStyles } from './shared/styles';
import SectionTitle from './shared/SectionTitle';

const styles = StyleSheet.create({
  section: { ...sharedStyles.section },
  tableWrapper: {
    ...sharedStyles.card,
    padding: 0,
    overflow: 'hidden'
  },
  headerRow: {
    flexDirection: 'row',
    backgroundColor: theme.colors.background.light,
    padding: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border
  },
  row: {
    flexDirection: 'row',
    padding: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border
  },
  rowAlt: {
    backgroundColor: theme.colors.background.default
  },
  lastRow: {
    borderBottomWidth: 0
  },
  nameCol: {
    paddingRight: theme.spacing.sm,
    flex: 2,
    color: theme.colors.text.default,
    fontSize: theme.typography.fontSize.sm,
    fontFamily: theme.typography.fontFamily.primary
  },
  statusCol: {
    paddingRight: theme.spacing.sm,
    flex: 1.3,
    flexDirection: 'row',
    alignItems: 'center'
  },
  roleCol: {
    paddingRight: theme.spacing.sm,
    // A categoria é o nome da role tal como o organizador a criou ("Ambassador",
    // "Organization"): já não são os rótulos curtos e fixos de antes, e com
    // flex: 1 encostavam ao contacto da coluna seguinte.
    flex: 1.4,
    color: theme.colors.text.light,
    fontSize: theme.typography.fontSize.sm,
    fontFamily: theme.typography.fontFamily.primary
  },
  contactCol: {
    paddingRight: theme.spacing.sm,
    flex: 2.2,
    color: theme.colors.text.light,
    fontSize: theme.typography.fontSize.xs,
    fontFamily: theme.typography.fontFamily.primary
  },
  dependentsCol: {
    flex: 1.5,
    color: theme.colors.text.light,
    fontSize: theme.typography.fontSize.xs,
    fontFamily: theme.typography.fontFamily.primary
  },
  headerText: { ...sharedStyles.tableHeaderText },
  statusDot: { ...sharedStyles.statusDot },
  statusText: { ...sharedStyles.statusText },
  emptyText: { ...sharedStyles.emptyText }
});

const STATUS_COLORS = {
  ATTENDED: theme.colors.status.confirmed,
  CONFIRMED: theme.colors.primary,
  REGISTERED: theme.colors.secondary,
  PENDING: theme.colors.status.warning,
  CANCELLED: theme.colors.status.error
};

const ParticipantListSection = ({ participants, t }) => {
  if (!participants?.length) {
    return (
      <View style={styles.section}>
        <SectionTitle>{t('eventReport.participantList.title', 'Participant List')}</SectionTitle>
        <Text style={styles.emptyText}>
          {t('eventReport.participantList.empty', 'No participants registered for this event.')}
        </Text>
      </View>
    );
  }

  const statusLabel = (status) => t(`eventReport.participantList.status.${status}`, status);
  // A role já vem com o nome que o organizador lhe deu: traduzi-la seria
  // reescrever um dado do evento.
  const roleLabel = (role) => role || t('eventReport.distribution.status.uncategorized', 'Sem categoria');
  const notAvailable = t('eventReport.formatters.notAvailable', 'Not available');

  return (
    <View style={styles.section}>
      <SectionTitle>{t('eventReport.participantList.title', 'Participant List')}</SectionTitle>

      <View style={styles.tableWrapper}>
        <View style={styles.headerRow}>
          <Text style={[styles.nameCol, styles.headerText]}>
            {t('eventReport.participantList.table.headers.name', 'Name')}
          </Text>
          <Text style={[styles.statusCol, styles.headerText]}>
            {t('eventReport.participantList.table.headers.status', 'Status')}
          </Text>
          <Text style={[styles.roleCol, styles.headerText]}>
            {t('eventReport.participantList.table.headers.role', 'Category')}
          </Text>
          <Text style={[styles.contactCol, styles.headerText]}>
            {t('eventReport.participantList.table.headers.contact', 'Contact')}
          </Text>
          <Text style={[styles.dependentsCol, styles.headerText]}>
            {t('eventReport.participantList.table.headers.dependents', 'Accompanying Guests')}
          </Text>
        </View>

        {participants.map((p, index) => (
          <View
            key={`${p.name}-${index}`}
            wrap={false}
            style={[
              styles.row,
              index % 2 === 1 && styles.rowAlt,
              index === participants.length - 1 && styles.lastRow
            ]}
          >
            <Text style={styles.nameCol}>{p.name}</Text>
            <View style={styles.statusCol}>
              <View style={[styles.statusDot, { backgroundColor: STATUS_COLORS[p.status] || theme.colors.text.light }]} />
              <Text style={styles.statusText}>{statusLabel(p.status)}</Text>
            </View>
            <Text style={styles.roleCol}>{roleLabel(p.role)}</Text>
            <Text style={styles.contactCol}>
              {[p.email, p.phone].filter(Boolean).join(' · ') || notAvailable}
            </Text>
            <Text style={styles.dependentsCol}>
              {p.dependents.length ? p.dependents.join(', ') : '—'}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
};

ParticipantListSection.propTypes = {
  participants: PropTypes.arrayOf(PropTypes.shape({
    name: PropTypes.string,
    status: PropTypes.string,
    role: PropTypes.string,
    email: PropTypes.string,
    phone: PropTypes.string,
    dependents: PropTypes.arrayOf(PropTypes.string)
  })),
  t: PropTypes.func.isRequired
};

export default ParticipantListSection;
