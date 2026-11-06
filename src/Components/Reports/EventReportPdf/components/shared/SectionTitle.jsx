import { View, Text, StyleSheet } from '@react-pdf/renderer';
import PropTypes from 'prop-types';
import { theme } from '../../theme';

const styles = StyleSheet.create({
  wrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  accent: {
    width: 4,
    height: 14,
    backgroundColor: theme.colors.primary,
    borderRadius: 2,
    marginRight: theme.spacing.sm,
  },
  title: {
    fontSize: theme.typography.fontSize.xl,
    color: theme.colors.text.dark,
    fontFamily: theme.typography.fontFamily.display,
    fontWeight: theme.typography.fontWeight.semibold,
  },
});

const SectionTitle = ({ children }) => (
  <View style={styles.wrapper}>
    <View style={styles.accent} />
    <Text style={styles.title}>{children}</Text>
  </View>
);

SectionTitle.propTypes = {
  children: PropTypes.node.isRequired,
};

export default SectionTitle;
