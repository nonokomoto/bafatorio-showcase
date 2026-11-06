import { memo } from 'react';
import PropTypes from 'prop-types';
import { FiHome, FiChevronRight, FiFolder } from 'react-icons/fi';
import { Text } from '../UI';
import { useTranslation } from 'react-i18next';

const DocumentBreadcrumb = memo(({
  folderPath = [],
  currentFolder = null,
  onNavigate
}) => {
  const { t } = useTranslation('event');

  const handleRootClick = () => {
    onNavigate?.(null);
  };

  const handleFolderClick = (folder) => {
    onNavigate?.(folder.id);
  };

  // Don't render if we're at root level
  if (!currentFolder && folderPath.length === 0) {
    return null;
  }

  return (
    <nav
      aria-label={t('eventDetails.documents.folders.breadcrumbLabel')}
      className="flex items-center gap-1 mb-4 py-2 px-3 bg-muted rounded-lg overflow-x-auto"
    >
      {/* Root/Home */}
      <button
        onClick={handleRootClick}
        className="flex items-center gap-1.5 px-2 py-1 rounded-md
          text-muted-foreground hover:text-primary-600 dark:hover:text-primary-400
          hover:bg-accent
          transition-colors duration-200 shrink-0"
        aria-label={t('eventDetails.documents.folders.goToRoot')}
      >
        <FiHome className="w-4 h-4" />
        <Text variant="body2" className="font-medium">
          {t('eventDetails.documents.folders.root')}
        </Text>
      </button>

      {/* Folder path */}
      {folderPath.map((folder, index) => (
        <div key={folder.id} className="flex items-center shrink-0">
          <FiChevronRight className="w-4 h-4 text-muted-foreground mx-1" />

          {index === folderPath.length - 1 && currentFolder?.id === folder.id ? (
            // Current folder (not clickable)
            <div
              className="flex items-center gap-1.5 px-2 py-1 rounded-md
                text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/20"
            >
              <FiFolder
                className="w-4 h-4"
                style={{ color: folder.color || 'currentColor' }}
              />
              <Text variant="body2" className="font-medium max-w-[150px] truncate">
                {folder.name}
              </Text>
            </div>
          ) : (
            // Navigable folder
            <button
              onClick={() => handleFolderClick(folder)}
              className="flex items-center gap-1.5 px-2 py-1 rounded-md
                text-muted-foreground hover:text-primary-600 dark:hover:text-primary-400
                hover:bg-accent
                transition-colors duration-200"
            >
              <FiFolder
                className="w-4 h-4"
                style={{ color: folder.color || 'currentColor' }}
              />
              <Text variant="body2" className="font-medium max-w-[150px] truncate">
                {folder.name}
              </Text>
            </button>
          )}
        </div>
      ))}

      {/* Current folder if not in path */}
      {currentFolder && !folderPath.some(f => f.id === currentFolder.id) && (
        <div className="flex items-center shrink-0">
          <FiChevronRight className="w-4 h-4 text-muted-foreground mx-1" />
          <div
            className="flex items-center gap-1.5 px-2 py-1 rounded-md
              text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/20"
          >
            <FiFolder
              className="w-4 h-4"
              style={{ color: currentFolder.color || 'currentColor' }}
            />
            <Text variant="body2" className="font-medium max-w-[150px] truncate">
              {currentFolder.name}
            </Text>
          </div>
        </div>
      )}
    </nav>
  );
});

DocumentBreadcrumb.displayName = 'DocumentBreadcrumb';

DocumentBreadcrumb.propTypes = {
  folderPath: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      name: PropTypes.string.isRequired,
      color: PropTypes.string,
    })
  ),
  currentFolder: PropTypes.shape({
    id: PropTypes.string.isRequired,
    name: PropTypes.string.isRequired,
    color: PropTypes.string,
  }),
  onNavigate: PropTypes.func,
};

export default DocumentBreadcrumb;
