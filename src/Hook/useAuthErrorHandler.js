import { useEffect, useCallback } from 'react';
import { signOut } from 'aws-amplify/auth';
import { Hub } from 'aws-amplify/utils';
import { resetStoreAndPersistor } from '../Api/store';

/**
 * List of authentication error messages that indicate revoked/invalid tokens
 * These errors require a full logout and data cleanup
 */
const REVOKED_TOKEN_ERRORS = [
  'Access Token has been revoked',
  'NotAuthorizedException',
  'Invalid access token',
  'Token expired',
  'Invalid Refresh Token',
  'Refresh Token has been revoked',
];

/**
 * Checks if an error message indicates a revoked or invalid token
 * @param {string} errorMessage - The error message to check
 * @returns {boolean} - True if the error indicates a revoked token
 */
const isRevokedTokenError = (errorMessage) => {
  if (!errorMessage || typeof errorMessage !== 'string') return false;
  return REVOKED_TOKEN_ERRORS.some(error => 
    errorMessage.includes(error)
  );
};

/**
 * Clears all authentication data from local storage
 * This is necessary when tokens are revoked to allow fresh login
 */
const clearAuthData = () => {
  try {
    // Clear all localStorage
    localStorage.clear();
    // Clear sessionStorage
    sessionStorage.clear();
    console.log('[AuthErrorHandler] Cleared all local authentication data');
  } catch (error) {
    console.error('[AuthErrorHandler] Error clearing auth data:', error);
  }
};

/**
 * Hook to handle authentication errors globally
 * Automatically detects revoked tokens and performs cleanup
 * 
 * Usage: Add <AuthErrorHandler /> component to your App
 * or use this hook in a component that wraps your app
 */
export const useAuthErrorHandler = () => {

  const handleAuthError = useCallback(async (error) => {
    const errorMessage = error?.message || error?.toString() || '';
    
    if (isRevokedTokenError(errorMessage)) {
      console.warn('[AuthErrorHandler] Detected revoked token, performing cleanup...');
      
      try {
        // Try to sign out cleanly (may fail if token is already invalid)
        await signOut({ global: true }).catch(() => {
          // Ignore signOut errors - token is already invalid
        });
      } catch {
        // Ignore - we're cleaning up anyway
      }
      
      // Clear all local data
      clearAuthData();
      
      // Reset Redux store and persistor
      resetStoreAndPersistor();
      
      // Force reload to clean state
      window.location.href = '/signin';
      
      return true; // Error was handled
    }
    
    return false; // Error was not a token error
  }, []);

  // Set up global error handler for unhandled promise rejections
  useEffect(() => {
    const handleUnhandledRejection = (event) => {
      const error = event.reason;
      const errorMessage = error?.message || error?.toString() || '';
      
      if (isRevokedTokenError(errorMessage)) {
        console.warn('[AuthErrorHandler] Caught unhandled auth error:', errorMessage);
        handleAuthError(error);
        event.preventDefault(); // Prevent default error logging
      }
    };

    // Add global listener
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    // Amplify Hub: tokenRefresh_failure fires when refresh token is expired/revoked.
    // Without this, the app would keep making 401 requests silently.
    const hubUnsubscribe = Hub.listen('auth', ({ payload }) => {
      if (payload.event === 'tokenRefresh_failure') {
        console.warn('[AuthErrorHandler] Amplify tokenRefresh_failure — signing out');
        handleAuthError(payload.data?.error || new Error('NotAuthorizedException'));
      }
    });

    return () => {
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
      hubUnsubscribe();
    };
  }, [handleAuthError]);

  return { handleAuthError, isRevokedTokenError };
};

/**
 * Component version of the auth error handler
 * Add this to your App.jsx to enable global auth error handling
 */
export const AuthErrorHandler = () => {
  useAuthErrorHandler();
  return null; // This component doesn't render anything
};

export default useAuthErrorHandler;
