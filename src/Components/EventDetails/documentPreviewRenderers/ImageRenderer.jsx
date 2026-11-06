import { useState, useCallback } from 'react';
import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';

// Internal component holds the zoom state. Wrapping with key={url} on the
// outer component (see default export) remounts this whenever url changes,
// resetting `zoomed` naturally — the React-idiomatic way to reset state on
// prop change. https://react.dev/reference/react/useState#resetting-state-with-a-key
const ImageRendererInner = ({ url, name, onLoaded, onError }) => {
  const { t } = useTranslation('event');
  const [zoomed, setZoomed] = useState(false);

  const handleLoad = useCallback(() => {
    onLoaded();
  }, [onLoaded]);

  const handleError = useCallback(() => {
    onError(t('eventDetails.documents.preview.fetchError'));
  }, [onError, t]);

  return (
    <div className="flex items-center justify-center">
      <button
        onClick={() => setZoomed((z) => !z)}
        className={`focus:outline-none ${zoomed ? 'cursor-zoom-out' : 'cursor-zoom-in'}`}
        aria-label={zoomed ? t('eventDetails.documents.preview.zoomOut') : t('eventDetails.documents.preview.zoomIn')}
      >
        <img
          src={url}
          alt={name || ''}
          onLoad={handleLoad}
          onError={handleError}
          // Mobile (<md): cap zoomed width to viewport so iOS Safari does not
          // OOM-crash on very large images. Desktop (md+): no width cap so the
          // zoom behaviour stays useful (image can exceed viewport, scrollable
          // by the parent overflow). Non-zoomed mode is already constrained
          // by max-h-[70vh] + object-contain.
          className={`rounded-lg transition-[max-height] duration-200 ${
            zoomed
              ? 'max-h-none max-w-full md:max-w-none'
              : 'max-h-[70vh] object-contain'
          }`}
        />
      </button>
    </div>
  );
};

ImageRendererInner.propTypes = {
  url: PropTypes.string.isRequired,
  name: PropTypes.string,
  onLoaded: PropTypes.func.isRequired,
  onError: PropTypes.func.isRequired,
};

// Outer wrapper supplies key={url} so changing the previewed image remounts
// the inner component and resets `zoomed` to false without an effect.
const ImageRenderer = (props) => <ImageRendererInner key={props.url} {...props} />;

ImageRenderer.propTypes = {
  url: PropTypes.string.isRequired,
  name: PropTypes.string,
  onLoaded: PropTypes.func.isRequired,
  onError: PropTypes.func.isRequired,
};

export default ImageRenderer;
