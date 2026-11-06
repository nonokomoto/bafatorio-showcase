import { fetchAuthSession } from 'aws-amplify/auth';

const BASE_URL = import.meta.env.VITE_BAFATORIO_API_URL || 'http://localhost:3000/api/v1';

/**
 * Get the current Cognito JWT access token and ID token.
 * Forces a refresh if the token is expired.
 */
async function getTokens() {
  const session = await fetchAuthSession({ forceRefresh: false });
  const accessToken = session.tokens?.accessToken?.toString();
  const idToken = session.tokens?.idToken?.toString();
  if (!accessToken) {
    throw new Error('No access token available — user may not be signed in');
  }
  return { accessToken, idToken };
}

/**
 * Handle API response — parse JSON and throw on error.
 *
 * No console logging here on purpose: callers decide whether a non-2xx is
 * a real user-facing error or an expected case with a fallback path (e.g.
 * the participants normalize → legacy upload chain). Logging here would
 * surface scary red errors in DevTools even when the fallback recovered
 * cleanly. Callers without a fallback should log on the catch side.
 */
async function handleResponse(response) {
  if (response.status === 204) {
    return { success: true };
  }

  const data = await response.json();

  if (!response.ok) {
    const error = new Error(data.error?.message || `Request failed with status ${response.status}`);
    error.status = response.status;
    error.code = data.error?.code || 'UNKNOWN_ERROR';
    error.details = data.error?.details;
    throw error;
  }

  return data;
}

/**
 * POST with multipart/form-data file upload.
 * Does NOT set Content-Type — browser sets it automatically with boundary.
 */
export async function postFile(path, file, { fieldName = 'file', signal } = {}) {
  const url = `${BASE_URL}${path}`;
  const { accessToken, idToken } = await getTokens();

  const headers = { 'Authorization': `Bearer ${accessToken}` };
  if (idToken) headers['X-Id-Token'] = idToken;

  const formData = new FormData();
  formData.append(fieldName, file);

  const response = await fetch(url, { method: 'POST', headers, body: formData, signal });

  // Retry once on 401 with a forced token refresh
  if (response.status === 401) {
    try {
      await fetchAuthSession({ forceRefresh: true });
    } catch {
      throw new Error('Session expired — please sign in again');
    }
    const { accessToken: newToken, idToken: newIdToken } = await getTokens();
    const retryHeaders = { 'Authorization': `Bearer ${newToken}` };
    if (newIdToken) retryHeaders['X-Id-Token'] = newIdToken;

    const retryFormData = new FormData();
    retryFormData.append(fieldName, file);

    const retryResponse = await fetch(url, { method: 'POST', headers: retryHeaders, body: retryFormData, signal });
    return handleResponse(retryResponse);
  }

  return handleResponse(response);
}
