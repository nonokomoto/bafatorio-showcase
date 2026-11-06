import { memo, useState, useMemo } from 'react';
import PropTypes from 'prop-types';
import { FaFolder, FaEdit, FaTrash } from 'react-icons/fa';
import { FiUsers } from 'react-icons/fi';
import { Text } from '../UI';
import { useTranslation } from 'react-i18next';
import { getAvatarColor, getInitials } from '../../Utils/avatarColors';

// Default folder colors
const DEFAULT_FOLDER_COLORS = [
  '#3B82F6', // blue
  '#10B981', // green
  '#F59E0B', // amber
  '#EF4444', // red
  '#8B5CF6', // violet
  '#EC4899', // pink
  '#06B6D4', // cyan
  '#F97316', // orange
];

const DocumentFolderItem = memo(({
  folder,
  documentCount = 0,
  sharedWith = [],
  creatorName = null,
  creatorEmail = null,
  onOpen,
  onEdit,
  onDelete,
  isSelected = false,
  canEdit = true,
  canDelete = true
}) => {
  const { t } = useTranslation('event');
  const folderColor = folder.color || DEFAULT_FOLDER_COLORS[0];
  const [showTooltip, setShowTooltip] = useState(false);
  const [showCreatorTooltip, setShowCreatorTooltip] = useState(false);

  // Memoize creator avatar data to avoid recalculating on every render
  const creatorAvatar = useMemo(() => {
    if (!creatorName && !creatorEmail) return null;
    return {
      avatarColor: getAvatarColor(creatorEmail || creatorName),
      initials: getInitials(creatorName, creatorEmail),
      displayName: creatorName || creatorEmail,
    };
  }, [creatorName, creatorEmail]);

  const handleClick = () => {
    onOpen?.(folder);
  };

  const handleEdit = (e) => {
    e.stopPropagation();
    onEdit?.(folder);
  };

  const handleDelete = (e) => {
    e.stopPropagation();
    onDelete?.(folder);
  };

  return (
    <div
      onClick={handleClick}
      className={`
        group relative flex flex-col items-center justify-center p-4
        bg-card rounded-xl border-2
        ${isSelected
          ? 'border-primary-500 dark:border-primary-400'
          : 'border-border hover:border-primary-300 dark:hover:border-primary-600'
        }
        cursor-pointer transition-[box-shadow,transform,border-color] duration-200
        hover:shadow-md hover:-translate-y-0.5
        min-w-[120px] min-h-[120px]
      `}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && handleClick()}
      aria-label={t('eventDetails.documents.folders.openFolder', { name: folder.name })}
    >
      {/* Creator avatar badge — top-left, shown for folders created by collaborators */}
      {creatorAvatar && (
        <div
          className="absolute top-2 left-2 z-10"
          onMouseEnter={() => setShowCreatorTooltip(true)}
          onMouseLeave={() => setShowCreatorTooltip(false)}
          onClick={(e) => e.stopPropagation()}
        >
          <div
            className={`w-5 h-5 rounded-full ${creatorAvatar.avatarColor.bg} ${creatorAvatar.avatarColor.text} flex items-center justify-center text-[9px] font-semibold leading-none select-none`}
            aria-label={t('eventDetails.documents.folders.createdBy', { name: creatorAvatar.displayName })}
          >
            {creatorAvatar.initials}
          </div>

          {showCreatorTooltip && (
            <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1.5 z-50 whitespace-nowrap px-2.5 py-1.5 bg-neutral-900 dark:bg-neutral-700 text-white text-xs rounded-lg shadow-lg pointer-events-none">
              {t('eventDetails.documents.folders.createdBy', { name: creatorAvatar.displayName })}
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 w-0 h-0 border-x-4 border-x-transparent border-b-4 border-b-neutral-900 dark:border-b-neutral-700" />
            </div>
          )}
        </div>
      )}

      {/* Action buttons - visible on hover, only if user has permissions */}
      {(canEdit || canDelete) && (
        <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          {canEdit && (
            <button
              onClick={handleEdit}
              className="p-1.5 rounded-lg bg-muted hover:bg-primary-100 dark:hover:bg-primary-900/30
                text-muted-foreground hover:text-primary-600 dark:hover:text-primary-400
                transition-colors duration-200"
              aria-label={t('eventDetails.documents.folders.editFolder')}
            >
              <FaEdit className="w-3 h-3" />
            </button>
          )}
          {canDelete && (
            <button
              onClick={handleDelete}
              className="p-1.5 rounded-lg bg-muted hover:bg-error-100 dark:hover:bg-error-900/30
                text-muted-foreground hover:text-error-600 dark:hover:text-error-400
                transition-colors duration-200"
              aria-label={t('eventDetails.documents.folders.deleteFolder')}
            >
              <FaTrash className="w-3 h-3" />
            </button>
          )}
        </div>
      )}

      {/* Folder Icon */}
      <div
        className="mb-2"
        style={{ color: folderColor }}
      >
        <FaFolder className="w-12 h-12 drop-shadow-sm" />
      </div>

      {/* Folder Name */}
      <Text
        variant="subtitle2"
        className="text-center font-medium text-foreground line-clamp-2 max-w-full px-1"
      >
        {folder.name}
      </Text>

      {/* Document Count */}
      <Text
        variant="caption"
        className="text-muted-foreground mt-1"
      >
        {documentCount} {documentCount === 1
          ? t('eventDetails.documents.folders.document')
          : t('eventDetails.documents.folders.documents')
        }
      </Text>

      {/* Sharing indicator */}
      {sharedWith.length > 0 && (
        <div
          className="relative mt-1.5"
          onMouseEnter={() => setShowTooltip(true)}
          onMouseLeave={() => setShowTooltip(false)}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center gap-1 text-primary-500 dark:text-primary-400">
            <FiUsers className="w-3 h-3" />
            <Text variant="caption" className="text-primary-500 dark:text-primary-400 text-[10px]">
              {sharedWith.length} {sharedWith.length === 1
                ? t('eventDetails.documents.folders.person', 'pessoa')
                : t('eventDetails.documents.folders.people', 'pessoas')
              }
            </Text>
          </div>

          {/* Tooltip with names */}
          {showTooltip && (
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 min-w-[160px] max-w-[220px] p-2 bg-neutral-900 dark:bg-neutral-700 text-white text-xs rounded-lg shadow-lg pointer-events-none">
              <p className="font-medium mb-1 text-neutral-300 text-[10px] uppercase tracking-wider">
                {t('eventDetails.documents.folders.sharedWith', 'Partilhado com')}
              </p>
              {sharedWith.map((person, i) => (
                <p key={i} className="truncate leading-relaxed">
                  {person.userName || person.userEmail}
                </p>
              ))}
              <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-x-4 border-x-transparent border-t-4 border-t-neutral-900 dark:border-t-neutral-700" />
            </div>
          )}
        </div>
      )}
    </div>
  );
});

DocumentFolderItem.displayName = 'DocumentFolderItem';

DocumentFolderItem.propTypes = {
  folder: PropTypes.shape({
    id: PropTypes.string.isRequired,
    name: PropTypes.string.isRequired,
    color: PropTypes.string,
    description: PropTypes.string,
  }).isRequired,
  documentCount: PropTypes.number,
  creatorName: PropTypes.string,
  creatorEmail: PropTypes.string,
  sharedWith: PropTypes.arrayOf(
    PropTypes.shape({
      userEmail: PropTypes.string.isRequired,
      userName: PropTypes.string,
    })
  ),
  onOpen: PropTypes.func,
  onEdit: PropTypes.func,
  onDelete: PropTypes.func,
  isSelected: PropTypes.bool,
  canEdit: PropTypes.bool,
  canDelete: PropTypes.bool,
};

export default DocumentFolderItem;
