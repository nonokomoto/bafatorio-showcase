import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { 
  useDeleteParticipantsMutation
} from '../../../../Api/services/participantApi';
import { 
  useListDependentsByParticipantIdsQuery
} from '../../../../Api/services/dependentsApi';

import {
  selectSelectedParticipantIds,
} from '../../../../Api/services/participantSelectors';

import { selectSelectedEventId } from '../../../../Api/eventSelectors';

import {
  setSelectedParticipantIds,
  clearSelectedParticipants,
  clearSelectedDependents
} from '../../../../Redux/Event/eventSlice';

export const useParticipantActions = () => {
  const dispatch = useDispatch();
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteAlert, setShowDeleteAlert] = useState(false);
  const [emailSendStatus, setEmailSendStatus] = useState({ success: false, failure: false });

  // Selectors
  const selectedParticipantIds = useSelector(selectSelectedParticipantIds);
  const selectedEventId = useSelector(selectSelectedEventId);

  // Prefetch dependents associated with the selected participants (warms the cache)
  useListDependentsByParticipantIdsQuery(
      { participantIds: selectedParticipantIds },
      { skip: selectedParticipantIds.length === 0 }
  );

  // Set selected participants
  const setSelectedParticipants = (participantIds) => {
    dispatch(setSelectedParticipantIds(participantIds));
  };

  // Delete mutations
  const [deleteParticipants] = useDeleteParticipantsMutation();
  
  // Handle delete selected participants
  const handleDeleteSelected = (confirmed) => {
    if (!confirmed) {
      setShowDeleteAlert(true);
      return;
    }

    // Fire mutation — onQueryStarted removes from cache instantly + handles toasts
    deleteParticipants({ participantIds: selectedParticipantIds, eventId: selectedEventId });

    // Clear UI selections immediately
    dispatch(clearSelectedParticipants());
    dispatch(clearSelectedDependents());
    setShowDeleteAlert(false);
  };

  return {
    isEditing,
    setIsEditing,
    showDeleteAlert,
    setShowDeleteAlert,
    setSelectedParticipants,
    selectedParticipantIds,
    emailSendStatus,
    setEmailSendStatus,
    handleDeleteSelected
  };
};