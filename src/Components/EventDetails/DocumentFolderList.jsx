import { memo } from 'react';
import PropTypes from 'prop-types';
import DocumentFolderItem from './DocumentFolderItem';
import { Text } from '../UI';
import { useTranslation } from 'react-i18next';

const DocumentFolderList = memo(({
  folders = [],
  documentCounts = {},
  folderSharingMap = {},
  folderOwnerMap = {},
  isOwner = false,
  onOpenFolder,
  onEditFolder,
  onDeleteFolder,
  selectedFolderId = null,
  isLoading = false,
  canEdit = true,
  canDelete = true,
  isCoManager = false,
  isStaffLogistics = false,
  currentUserId = null
}) => {
  const { t } = useTranslation('event');

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 mb-6">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="animate-pulse flex flex-col items-center justify-center p-4
              bg-muted rounded-xl
              min-w-[120px] min-h-[120px]"
          >
            <div className="w-12 h-12 bg-muted rounded-lg mb-2" />
            <div className="w-16 h-4 bg-muted rounded" />
          </div>
        ))}
      </div>
    );
  }

  if (folders.length === 0) {
    return null;
  }

  return (
    <div className="mb-6">
      <Text variant="subtitle2" className="text-muted-foreground mb-3">
        {t('eventDetails.documents.folders.title')}
      </Text>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {folders.map((folder) => {
          // CO_MANAGER and Staff Logistics can only edit/delete their own folders
          // Normalize owner to handle both Gen 1 (userId::userId) and Gen 2 (userId) formats
          const normalizedOwner = folder.owner ? folder.owner.split('::')[0] : '';
          const isOwnFolder = (isCoManager || isStaffLogistics) && currentUserId
            ? normalizedOwner === currentUserId
            : true;
          // Show creator name only for Owner viewing folders created by collaborators
          const creatorInfo = isOwner && normalizedOwner && normalizedOwner !== currentUserId
            ? folderOwnerMap[normalizedOwner]
            : null;
          return (
            <DocumentFolderItem
              key={folder.id}
              folder={folder}
              documentCount={documentCounts[folder.id] || 0}
              creatorName={creatorInfo?.userName || null}
              creatorEmail={creatorInfo?.userEmail || null}
              sharedWith={folderSharingMap[folder.id] || []}
              onOpen={onOpenFolder}
              onEdit={onEditFolder}
              onDelete={onDeleteFolder}
              isSelected={selectedFolderId === folder.id}
              canEdit={canEdit && isOwnFolder && !folder.isDefault}
              canDelete={canDelete && isOwnFolder && !folder.isDefault}
            />
          );
        })}
      </div>
    </div>
  );
});

DocumentFolderList.displayName = 'DocumentFolderList';

DocumentFolderList.propTypes = {
  folders: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      name: PropTypes.string.isRequired,
      color: PropTypes.string,
    })
  ),
  documentCounts: PropTypes.objectOf(PropTypes.number),
  folderSharingMap: PropTypes.objectOf(PropTypes.array),
  folderOwnerMap: PropTypes.objectOf(PropTypes.shape({
    userName: PropTypes.string,
    userEmail: PropTypes.string,
  })),
  isOwner: PropTypes.bool,
  onOpenFolder: PropTypes.func,
  onEditFolder: PropTypes.func,
  onDeleteFolder: PropTypes.func,
  selectedFolderId: PropTypes.string,
  isLoading: PropTypes.bool,
  canEdit: PropTypes.bool,
  canDelete: PropTypes.bool,
  isCoManager: PropTypes.bool,
  isStaffLogistics: PropTypes.bool,
  currentUserId: PropTypes.string,
};

export default DocumentFolderList;
