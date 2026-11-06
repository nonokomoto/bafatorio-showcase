import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { FiCamera } from 'react-icons/fi';
import { IoCheckmark, IoClose } from "react-icons/io5";
import { useSelector, shallowEqual, useDispatch } from 'react-redux';
import { useTranslation } from 'react-i18next';
import ProfileAvatar from '../Common/ProfileAvatar';
import { updateUserAttributeThunk } from '../../Redux/Auth/userSlice';
import { uploadData, list, remove } from 'aws-amplify/storage';
import useProfileImage, { invalidateProfileImageCache } from '../../Hook/useProfileImage';
import { deleteUser } from 'aws-amplify/auth';
import { deleteUserData } from '../../../Graphql/mutations';
import { getClient } from '../../Api/amplifyClient.js';
import { resetStoreAndPersistor } from '../../Api/store';
import { Text, Button, Card, Badge, Input, Modal } from '../UI';

// Prefixos por identidade que guardam ficheiros pessoais. O caminho é resolvido
// pelo Amplify com o identityId da sessão, e o IAM só autoriza esse — daí a
// limpeza correr no cliente e não na Lambda (issue #162).
const OWN_STORAGE_PREFIXES = ['profile-pictures', 'documents'];

const removeOwnStorageObjects = async () => {
  for (const prefix of OWN_STORAGE_PREFIXES) {
    const { items } = await list({ path: ({ identityId }) => `${prefix}/${identityId}/` });
    await Promise.all(items.map(({ path }) => remove({ path })));
  }
};

// Retry helper function for network-related failures
const retryOperation = async (operation, maxRetries = 2, baseDelay = 1000) => {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      const isLastAttempt = attempt === maxRetries;
      const isNetworkError = error.message?.toLowerCase().includes('network') ||
                           error.message?.toLowerCase().includes('timeout') ||
                           error.message?.toLowerCase().includes('connection') ||
                           error.code === 'NetworkError' ||
                           error.name === 'NetworkError';

      if (isLastAttempt || !isNetworkError) {
        throw error;
      }

      // Exponential backoff: 1s, 2s, 4s
      const delay = baseDelay * Math.pow(2, attempt);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
};

// Error type classification
const classifyError = (error) => {
  const errorMessage = error?.message?.toLowerCase() || '';

  if (errorMessage.includes('network') || errorMessage.includes('timeout') || errorMessage.includes('connection')) {
    return { type: 'NETWORK_ERROR', retryable: true };
  }

  if (errorMessage.includes('unauthorized') || errorMessage.includes('forbidden')) {
    return { type: 'AUTH_ERROR', retryable: false };
  }

  if (errorMessage.includes('graphql') || errorMessage.includes('mutation')) {
    return { type: 'API_ERROR', retryable: false };
  }

  if (errorMessage.includes('user') && errorMessage.includes('delete')) {
    return { type: 'USER_DELETE_ERROR', retryable: false };
  }

  return { type: 'UNKNOWN_ERROR', retryable: false };
};

// Main ProfilePage component
const ProfilePage = () => {
  const { register, handleSubmit, formState: { errors }, setValue } = useForm();
  const { t } = useTranslation('settings');
  // Bug #9: useSelector with shallowEqual to prevent unnecessary re-renders
  const user = useSelector((state) => state.user, shallowEqual);
  const providerName = user?.providerName;
  const dispatch = useDispatch();

  // Bug #6: Separate loading states for upload vs form submission
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState({ message: '', type: '' });
  const [file, setFile] = useState(null);
  const profileImageUrl = useProfileImage(user?.user?.picture);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [deletionStatus, setDeletionStatus] = useState(null);
  const [deletionStep, setDeletionStep] = useState('');

  // Enhanced deletion progress tracking
  const [deletionProgress, setDeletionProgress] = useState({
    dataDeleted: false,
    accountDeleted: false,
    stateCleared: false,
    currentStep: 0,
    totalSteps: 4
  });

  // Error state for better error handling
  const [lastError, setLastError] = useState(null);

  // Bug #5: Removed dead useOutsideClick — Modal component handles backdrop clicks

  // Initialize form with user data
  useEffect(() => {
    if (user && providerName !== 'Google') {
      setValue("name", user.name);
    }
  }, [user, setValue, providerName]);

  // key={profileImageUrl} repõe o estado de erro quando a foto muda
  const getProfileImage = () => (
    <ProfileAvatar
      key={profileImageUrl}
      src={profileImageUrl}
      name={user?.name}
      size="lg"
    />
  );

  // Handle file selection — upload immediately
  const handleFileChange = (event) => {
    const selectedFile = event.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      uploadProfilePicture(selectedFile);
    }
  };

  // Upload profile picture with enhanced error handling
  const uploadProfilePicture = async (fileToUpload = file) => {
    // Parameter validation
    if (!fileToUpload) {
      setFeedback({ message: t('profile.profilePicture.uploadError'), type: 'error' });
      return;
    }

    if (!user?.name) {
      setFeedback({ message: t('profile.profilePicture.missingUserName'), type: 'error' });
      return;
    }

    // File type validation
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(fileToUpload.type)) {
      setFeedback({ message: t('profile.profilePicture.invalidFileType'), type: 'error' });
      return;
    }

    // File size validation (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (fileToUpload.size > maxSize) {
      setFeedback({ message: t('profile.profilePicture.fileTooLarge'), type: 'error' });
      return;
    }

    // Bug #6: Use separate isUploading state
    setIsUploading(true);
    setFeedback({ message: '', type: '' });

    try {
      // Bug #7: Sanitize filename and add extension
      const extension = fileToUpload.name?.split('.').pop()?.toLowerCase() || 'jpg';
      const safeExtension = ['jpg', 'jpeg', 'png', 'webp'].includes(extension) ? extension : 'jpg';

      const uploadOperation = async () => {
        return uploadData({
          path: ({identityId}) => `profile-pictures/${identityId}/avatar.${safeExtension}`,
          data: fileToUpload,
        });
      };

      const uploadTask = await retryOperation(uploadOperation, 2, 1000);
      const uploadResult = await uploadTask.result;
      const s3Path = uploadResult.path;
      // O path é estável (avatar.<ext>) — sem isto a cache servia a foto antiga
      invalidateProfileImageCache(s3Path);

      // Store the S3 path (not signed URL) in Cognito — the hook resolves it at display time
      const updateAttributeOperation = async () => {
        return await dispatch(updateUserAttributeThunk({
          attributeKey: 'picture',
          value: s3Path
        })).unwrap();
      };

      await retryOperation(updateAttributeOperation, 2, 1000);

      // Success
      setFeedback({ message: t('profile.profilePicture.uploadSuccess'), type: 'success' });
      setFile(null);

    } catch (error) {
      console.error('Profile picture upload error:', error);

      // Classify and handle different error types
      const errorClassification = classifyError(error);
      let userMessage = t('profile.profilePicture.uploadFailed');

      switch (errorClassification.type) {
        case 'NETWORK_ERROR':
          userMessage = t('profile.profilePicture.networkError');
          break;
        case 'AUTH_ERROR':
          userMessage = t('profile.profilePicture.authError');
          break;
        default:
          if (error.message?.includes('storage')) {
            userMessage = t('profile.profilePicture.storageError');
          } else if (error.message?.includes('size')) {
            userMessage = t('profile.profilePicture.fileTooLarge');
          }
          // Bug #12: Don't expose raw error.message to user
      }

      setFeedback({ message: userMessage, type: 'error' });
    } finally {
      setIsUploading(false);
    }
  };

  // Handle form submission with enhanced validation and error handling
  const onSubmit = async (data) => {
    // Parameter validation
    if (!data) {
      setFeedback({ message: t('profile.feedback.invalidData'), type: 'error' });
      return;
    }

    const isNameChanged = data.name && data.name !== user?.name;

    if (!isNameChanged) {
      setFeedback({ message: t('profile.feedback.noChanges'), type: 'info' });
      return;
    }

    setIsSubmitting(true);
    setFeedback({ message: '', type: '' });

    try {
      const updateNameOperation = async () => {
        return await dispatch(updateUserAttributeThunk({
          attributeKey: 'name',
          value: data.name.trim()
        })).unwrap();
      };

      await retryOperation(updateNameOperation, 2, 1000);
      setFeedback({ message: t('profile.feedback.nameUpdated'), type: 'success' });

    } catch (error) {
      console.error('Profile update error:', error);

      const errorClassification = classifyError(error);
      let userMessage = t('profile.feedback.unknownError');

      switch (errorClassification.type) {
        case 'NETWORK_ERROR':
          userMessage = t('profile.feedback.networkError');
          break;
        case 'AUTH_ERROR':
          userMessage = t('profile.feedback.authError');
          break;
        default:
          if (error.message?.includes('name')) {
            userMessage = t('profile.feedback.nameUpdateError');
          }
          // Bug #12: Don't expose raw error.message to user
      }

      setFeedback({ message: userMessage, type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle account deletion with comprehensive error handling
  const handleDeleteAccount = async () => {
    // Reset states
    setIsDeletingAccount(true);
    setFeedback({ message: '', type: '' });
    setDeletionStatus('loading');
    setLastError(null);
    setDeletionProgress({
      dataDeleted: false,
      accountDeleted: false,
      stateCleared: false,
      currentStep: 0,
      totalSteps: 4
    });

    // Bug #4: Use local variable to track status (avoids stale closure)
    let finalStatus = 'loading';

    // Track deletion state for rollback
    let deletionState = {
      dataDeleted: false,
      accountDeleted: false,
      canRollback: false
    };

    try {
      // Step 0: Validate required parameters
      setDeletionStep(t('profile.deleteAccount.status.validating'));
      setDeletionProgress(prev => ({ ...prev, currentStep: 1 }));

      if (!user) {
        throw new Error('User object is not available');
      }

      if (!user.user?.sub) {
        throw new Error('User sub (authentication ID) is missing');
      }

      // Step 1a: os ficheiros pessoais são apagados aqui, e não na Lambda: as
      // credenciais desta sessão só alcançam o prefixo da própria identidade
      // (IAM com ${cognito-identity.amazonaws.com:sub}), pelo que ninguém
      // consegue apontar a limpeza à identidade de outra pessoa — issue #162.
      // Corre antes da mutation para que uma falha aqui aborte tudo, em vez de
      // deixar ficheiros órfãos sem dono para os reclamar.
      setDeletionStep(t('profile.deleteAccount.status.deletingData'));
      setDeletionProgress(prev => ({ ...prev, currentStep: 2 }));

      await removeOwnStorageObjects();

      // Step 1b: Delete user data using the mutation with retry logic
      const deleteDataOperation = async () => {
        const deleteResult = await getClient().graphql({
          query: deleteUserData,
          variables: {
            sub: user.user.sub
          }
        });

        if (deleteResult.errors && deleteResult.errors.length > 0) {
          const errorMessages = deleteResult.errors.map(err => err.message).join(', ');
          throw new Error(`GraphQL errors: ${errorMessages}`);
        }

        if (!deleteResult.data) {
          throw new Error('No data returned from delete operation');
        }

        if (deleteResult.data.deleteUserData !== true) {
          throw new Error('Delete operation returned false - data may not have been fully deleted');
        }

        return deleteResult;
      };

      await retryOperation(deleteDataOperation, 2, 1000);
      deletionState.dataDeleted = true;
      setDeletionProgress(prev => ({ ...prev, dataDeleted: true }));

      // Step 2: Delete the user account from Cognito (CRITICAL SECTION)
      setDeletionStep(t('profile.deleteAccount.status.deletingAccount'));
      setDeletionProgress(prev => ({ ...prev, currentStep: 3 }));

      const deleteAccountOperation = async () => {
        await deleteUser();
      };

      try {
        await retryOperation(deleteAccountOperation, 2, 1000);
        deletionState.accountDeleted = true;
        setDeletionProgress(prev => ({ ...prev, accountDeleted: true }));

      } catch (accountError) {
        const criticalError = new Error('CRITICAL_PARTIAL_FAILURE: Data deleted but account deletion failed');
        criticalError.originalError = accountError;
        criticalError.deletionState = deletionState;

        console.error('Critical partial failure detected', {
          dataDeleted: deletionState.dataDeleted,
          accountDeleted: deletionState.accountDeleted,
          originalError: accountError
        });

        finalStatus = 'partial-failure';
        setDeletionStatus('partial-failure');
        setDeletionStep(t('profile.deleteAccount.status.partialFailure'));
        setLastError(criticalError);

        setTimeout(() => {
          setShowDeleteConfirmation(false);
          setDeletionStatus(null);
          setDeletionStep('');
          setDeletionProgress({
            dataDeleted: false,
            accountDeleted: false,
            stateCleared: false,
            currentStep: 0,
            totalSteps: 4
          });
          setLastError(null);
        }, 10000);

        return;
      }

      // Step 3: Clear Redux store and persistor (only if account deletion succeeded)
      setDeletionStep(t('profile.deleteAccount.status.clearingLocalData'));
      setDeletionProgress(prev => ({ ...prev, currentStep: 4 }));

      try {
        resetStoreAndPersistor();
        setDeletionProgress(prev => ({ ...prev, stateCleared: true }));
      } catch (storeError) {
        console.warn('Failed to clear local store, but continuing with deletion:', storeError);
      }

      // Step 4: Handle successful deletion
      finalStatus = 'success';
      setDeletionStatus('success');
      setDeletionStep(t('profile.deleteAccount.status.success'));

      // Bug #13: Redirect immediately after store reset to avoid crash
      setTimeout(() => {
        window.location.href = '/signin';
      }, 1500);
      return; // Skip finally cleanup — we're redirecting

    } catch (error) {
      console.error('Account deletion error:', error);
      setLastError(error);

      if (error.message?.includes('CRITICAL_PARTIAL_FAILURE')) {
        return;
      }

      finalStatus = 'error';
      setDeletionStatus('error');

      const errorClassification = classifyError(error);
      let userMessage = t('profile.feedback.unknownError');

      switch (errorClassification.type) {
        case 'NETWORK_ERROR':
          userMessage = t('profile.deleteAccount.status.networkError');
          break;
        case 'AUTH_ERROR':
          userMessage = t('profile.deleteAccount.status.authError');
          break;
        case 'API_ERROR':
          userMessage = t('profile.deleteAccount.status.apiError');
          break;
        case 'USER_DELETE_ERROR':
          userMessage = t('profile.deleteAccount.status.userDeleteError');
          break;
        default:
          if (error.message?.includes('sub')) {
            userMessage = t('profile.deleteAccount.status.missingUserData');
          } else if (error.message?.includes('GraphQL')) {
            userMessage = t('profile.deleteAccount.status.dataError');
          }
          // Bug #12: Don't expose raw error.message to user
      }

      setDeletionStep(`${t('profile.deleteAccount.status.error')} ${userMessage}`);

      console.error('Deletion error details:', {
        errorType: errorClassification.type,
        retryable: errorClassification.retryable,
        originalError: error,
        deletionState
      });

    } finally {
      setIsDeletingAccount(false);

      // Bug #4: Use local finalStatus instead of stale closure deletionStatus
      if (finalStatus !== 'partial-failure' && finalStatus !== 'success') {
        setTimeout(() => {
          setShowDeleteConfirmation(false);
          setDeletionStatus(null);
          setDeletionStep('');
          setDeletionProgress({
            dataDeleted: false,
            accountDeleted: false,
            stateCleared: false,
            currentStep: 0,
            totalSteps: 4
          });
          setLastError(null);
        }, 5000);
      }
    }
  };

  // Redirect to Google profile
  const redirectToGoogleProfile = () => {
    window.open('https://myaccount.google.com/', '_blank');
  };

  // Bug #13: Guard against null user (e.g. after store reset)
  if (!user) return null;

  // Delete confirmation modal — shared between Google and standard profiles (Bug #1)
  const deleteConfirmationModal = (
    <Modal
      isOpen={showDeleteConfirmation}
      onClose={() => !isDeletingAccount && setShowDeleteConfirmation(false)}
    >
      <Card className="w-full max-w-md">
        <Modal.Header>
          <Text variant="h5" weight="medium">
            {t('profile.deleteAccount.confirmation.title')}
          </Text>
        </Modal.Header>

        <Modal.Body>
          {deletionStatus ? (
            <div className="text-center">
              {deletionStatus === 'loading' && (
                <div className="mb-4">
                  <div className="w-full bg-muted rounded-full h-2 mb-4">
                    <div
                      className="bg-primary-500 h-2 rounded-full transition-[width] duration-300"
                      style={{ width: `${(deletionProgress.currentStep / deletionProgress.totalSteps) * 100}%` }}
                    ></div>
                  </div>
                  <Text variant="body2" className="mt-2 mb-4">{deletionStep}</Text>

                  {/* Progress indicators */}
                  <div className="text-left space-y-2 text-sm">
                    <div className={`flex items-center ${deletionProgress.dataDeleted ? 'text-success-600' : 'text-muted-foreground'}`}>
                      {deletionProgress.dataDeleted ? (
                        <IoCheckmark className="mr-2" />
                      ) : (
                        <div className="w-4 h-4 border-2 border-primary-500 border-t-transparent rounded-full animate-spin mr-2"></div>
                      )}
                      <span>{t('profile.deleteAccount.progress.deletingData')}</span>
                    </div>

                    <div className={`flex items-center ${deletionProgress.accountDeleted ? 'text-success-600' : 'text-muted-foreground'}`}>
                      {deletionProgress.accountDeleted ? (
                        <IoCheckmark className="mr-2" />
                      ) : deletionProgress.currentStep >= 3 ? (
                        <div className="w-4 h-4 border-2 border-primary-500 border-t-transparent rounded-full animate-spin mr-2"></div>
                      ) : (
                        <div className="w-4 h-4 border-2 border-muted rounded-full mr-2"></div>
                      )}
                      <span>{t('profile.deleteAccount.progress.deletingAccount')}</span>
                    </div>

                    <div className={`flex items-center ${deletionProgress.stateCleared ? 'text-success-600' : 'text-muted-foreground'}`}>
                      {deletionProgress.stateCleared ? (
                        <IoCheckmark className="mr-2" />
                      ) : deletionProgress.currentStep >= 4 ? (
                        <div className="w-4 h-4 border-2 border-primary-500 border-t-transparent rounded-full animate-spin mr-2"></div>
                      ) : (
                        <div className="w-4 h-4 border-2 border-muted rounded-full mr-2"></div>
                      )}
                      <span>{t('profile.deleteAccount.progress.clearingData')}</span>
                    </div>
                  </div>
                </div>
              )}
              {deletionStatus === 'success' && (
                <div className="mb-4 text-success-600">
                  <IoCheckmark className="mx-auto h-12 w-12" />
                  <Text variant="body2" className="mt-2">{deletionStep}</Text>
                  <Text variant="small" color="muted" className="mt-2">
                    {t('profile.deleteAccount.progress.redirecting')}
                  </Text>
                </div>
              )}
              {(deletionStatus === 'error' || deletionStatus === 'partial-failure') && (
                <div className="mb-4 text-error-600">
                  <IoClose className="mx-auto h-12 w-12" />
                  <Text variant="body2" className="mt-2">{deletionStep}</Text>
                  {/* Bug #12: Show generic error details, not raw error.message */}
                  {lastError && (
                    <div className="mt-4 p-3 bg-error-50 dark:bg-error-900/20 rounded-md">
                      <Text variant="small" className="text-error-700 dark:text-error-300">
                        {t('profile.deleteAccount.progress.errorDetails')}: {t('profile.feedback.unknownError')}
                      </Text>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div>
              <Text variant="body2" color="muted" className="mb-4">
                {t('profile.deleteAccount.confirmation.description')}
              </Text>
              <div className="bg-warning-50 dark:bg-warning-900/20 border border-warning-200 dark:border-warning-800 rounded-md p-3 mb-4">
                <Text variant="small" className="text-warning-800 dark:text-warning-200">
                  {t('profile.deleteAccount.confirmation.warning')}
                </Text>
              </div>
            </div>
          )}
        </Modal.Body>

        {!deletionStatus && (
          <Modal.Footer>
            <Button
              variant="ghost"
              onClick={() => setShowDeleteConfirmation(false)}
            >
              {t('profile.deleteAccount.confirmation.cancelButton')}
            </Button>
            <Button
              variant="danger"
              onClick={handleDeleteAccount}
              loading={isDeletingAccount}
            >
              {t('profile.deleteAccount.confirmation.confirmButton')}
            </Button>
          </Modal.Footer>
        )}
      </Card>
    </Modal>
  );

  // Render Google-specific profile page
  if (providerName === 'Google') {
    return (
      <>
        <Card className="max-w-4xl mx-auto bg-card border border-border rounded-xl shadow-sm">
          <div className="p-8">

            <Text variant="body2" color="muted" className="mb-4">
              {t('profile.googleProfile.description')}
            </Text>
            <Button
              onClick={redirectToGoogleProfile}
              variant="primary"
              size="md"
              className="mt-4"
            >
              {t('profile.googleProfile.buttonText')}
            </Button>

            {/* Account Deletion Section */}
            <div className="mt-8 pt-6 border-t border-border">
              <Text
                variant="h6"
                weight="medium"
                className="text-error-600 dark:text-error-400 mb-2"
              >
                {t('profile.deleteAccount.title')}
              </Text>
              <Text variant="body2" color="muted" className="mb-4">
                {t('profile.deleteAccount.description')}
              </Text>
              <Button
                onClick={() => setShowDeleteConfirmation(true)}
                variant="danger"
                size="md"
              >
                {t('profile.deleteAccount.deleteButton')}
              </Button>
            </div>
          </div>
        </Card>
        {/* Bug #1: Modal renders for Google users too */}
        {deleteConfirmationModal}
      </>
    );
  }

  // Render standard profile page
  return (
    <>
      <Card className="max-w-4xl mx-auto bg-card border border-border rounded-xl shadow-sm">
        <div className="p-8">
          <div className="mb-8 border-b border-border pb-4">
            <Text
              variant="h4"
              weight="medium"
              className="mb-2"
            >
              {t('profile.title')}
            </Text>
            <Text variant="body2" color="muted">
              {t('profile.subtitle')}
            </Text>
          </div>

          <div className="grid md:grid-cols-[240px_1fr] gap-8">
            {/* Profile Picture Section */}
            <div>
              <Text
                variant="h6"
                weight="medium"
                className="mb-4"
              >
                {t('profile.profilePicture.title')}
              </Text>

              <div className="flex flex-col items-center">
                <div className="relative">
                  {getProfileImage()}
                  <label htmlFor="profilePicture" className="absolute bottom-0 right-0 bg-primary-500 hover:bg-primary-600 text-white p-2 rounded-full cursor-pointer transition-colors shadow-sm">
                    <FiCamera size={16} />
                    <input
                      type="file"
                      id="profilePicture"
                      // Bug #10: Restrict accept to match validation
                      accept="image/jpeg,image/png,image/webp"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </label>
                </div>

                {/* Bug #6: Use isUploading for photo upload indicator */}
                {isUploading && (
                  <div className="mt-3 flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-muted border-t-primary-500" />
                    <Text variant="small" color="muted">
                      {t('profile.profilePicture.uploading')}
                    </Text>
                  </div>
                )}
              </div>
            </div>

            {/* Form Section */}
            <div>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                {feedback.message && (
                  <Badge
                    variant={feedback.type === 'success' ? 'success' : feedback.type === 'error' ? 'error' : 'info'}
                    tone="soft"
                    className="w-full p-3"
                  >
                    {feedback.message}
                  </Badge>
                )}

                <div className="space-y-6">
                  <Text
                    variant="h6"
                    weight="medium"
                  >
                    {t('profile.personalInfo.title')}
                  </Text>

                  <Input
                    {...register("name", { required: t('profile.form.name.required') })}
                    label={t('profile.form.name.label')}
                    error={errors.name?.message}
                    fullWidth
                  />

                  {/* Bug #3: Use user?.user?.email (not user?.email) */}
                  <Input
                    name="email"
                    value={user?.user?.email || ''}
                    label={t('profile.form.email.label')}
                    helperText={t('profile.form.email.readOnlyHint', 'O email não pode ser alterado')}
                    readOnly
                    fullWidth
                  />

                </div>

                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  loading={isSubmitting}
                  className="mt-6"
                >
                  {isSubmitting ? t('profile.form.submit.saving') : t('profile.form.submit.saveButton')}
                </Button>
              </form>
            </div>
          </div>

          {/* Account Deletion Section */}
          <div className="mt-8 pt-6 border-t border-border">

            <Text variant="body2" color="muted" className="mb-4">
              {t('profile.deleteAccount.description')}
            </Text>
            <Button
              onClick={() => setShowDeleteConfirmation(true)}
              variant="ghost"
              size="md"
            >
              {t('profile.deleteAccount.deleteButton')}
            </Button>
          </div>
        </div>
      </Card>

      {/* Bug #1: Modal extracted to shared variable */}
      {deleteConfirmationModal}
    </>
  );
};

ProfilePage.propTypes = {};

ProfilePage.displayName = 'ProfilePage';

export default ProfilePage;
