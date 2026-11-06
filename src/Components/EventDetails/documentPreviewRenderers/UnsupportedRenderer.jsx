import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import { useEffect } from 'react';
import { Text } from '../../UI';
import { getFileIcon, getFileExtension } from '../utils/fileUtils';

const UnsupportedRenderer = ({ name, onLoaded }) => {
  const { t } = useTranslation('event');
  const ext = getFileExtension(name);

  useEffect(() => {
    onLoaded();
  }, [onLoaded]);

  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="w-16 h-16 flex items-center justify-center mb-4">
        {getFileIcon(name, 'lg')}
      </div>
      <Text variant="body1" weight="medium" className="text-foreground mb-2">
        {t('eventDetails.documents.preview.unsupported')}
      </Text>
      <Text variant="body2" className="text-muted-foreground max-w-sm">
        {t('eventDetails.documents.preview.unsupportedMessage', { ext: ext ? `.${ext}` : '' })}
      </Text>
    </div>
  );
};

UnsupportedRenderer.propTypes = {
  name: PropTypes.string,
  onLoaded: PropTypes.func.isRequired,
  onError: PropTypes.func,
};

export default UnsupportedRenderer;
