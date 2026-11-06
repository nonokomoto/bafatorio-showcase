import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import {
  signIn, signUp, signOut, resetPassword, confirmResetPassword, confirmSignUp,
  fetchAuthSession, fetchUserAttributes, signInWithRedirect, updateUserAttribute, updatePassword, autoSignIn,
  resendSignUpCode,
} from 'aws-amplify/auth';

import { RESET_STORE } from '../../Api/actionType';
import 'aws-amplify/auth/enable-oauth-listener';
import { USER_GROUPS } from '../../Utils/rolesConfig';
import { getClient } from '../../Api/amplifyClient';
import { scheduleApi } from '../../Api/services/scheduleApi';
import { collaboratorApi } from '../../Api/services/collaboratorApi';

const SYNC_MY_DISPLAY_NAME = /* GraphQL */ `
  mutation SyncMyDisplayName {
    syncMyDisplayName {
      updatedCollaborations
      updatedEvents
    }
  }
`;

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
 * Handles revoked token errors by clearing local data and forcing re-login
 */
const handleRevokedToken = async () => {
  console.warn('[UserSlice] Detected revoked token, performing cleanup...');
  
  try {
    // Try to sign out (may fail if token is already invalid)
    await signOut({ global: true }).catch(() => {});
  } catch {
    // Ignore - we're cleaning up anyway
  }
  
  // Clear all local storage (removes the redux-persist 'persist:root' blob too)
  localStorage.clear();
  sessionStorage.clear();

  // Force reload to signin — a full reload drops in-memory store state
  window.location.href = '/signin';
};

// Async thunk for fetching the current user, auth session, and user groups
export const fetchCurrentUser = createAsyncThunk(
  'user/fetchCurrentUser',
  async (_, { rejectWithValue }) => {
    try {
      const authSession = await fetchAuthSession();
      const userAttributes = await fetchUserAttributes();

      let groups = [];
      let identityId = '';
      if (authSession.tokens?.accessToken) {
        const payload = authSession.tokens.accessToken.payload;
        groups = payload['cognito:groups'] || [];
      }
      identityId = authSession.identityId || '';

      return { 
        userAttributes,
        isSignedIn: authSession.tokens?.accessToken != null,
        groups,
        identityId
      };
    } catch (error) {
      // Check if this is a revoked token error
      if (isRevokedTokenError(error.message || error.name)) {
        handleRevokedToken();
      }
      return rejectWithValue(error.message);
    }
  }
);

// Async thunk for user sign in
export const userSignIn = createAsyncThunk(
  'user/signIn',
  async ({ email, password }, { dispatch, rejectWithValue }) => {
    try {
      const { isSignedIn, nextStep } = await signIn({ username: email, password });
      if (isSignedIn) {
        await dispatch(fetchCurrentUser());
      }
      return { isSignedIn, nextStep };
    } catch (error) {
      // If Amplify has a stale cached session, sign out and retry once
      if (error.message?.includes('already a signed in user')) {
        try {
          await signOut();
          const { isSignedIn, nextStep } = await signIn({ username: email, password });
          if (isSignedIn) {
            await dispatch(fetchCurrentUser());
          }
          return { isSignedIn, nextStep };
        } catch (retryError) {
          return rejectWithValue(retryError.message);
        }
      }
      return rejectWithValue(error.message);
    }
  }
);

// Async thunk for Google sign-in
export const googleSignIn = createAsyncThunk(
  'user/googleSignIn',
  async (_, { dispatch, rejectWithValue }) => {
    try {
      const { isSignedIn, nextStep } = await signInWithRedirect({ provider: 'Google' });
      if (isSignedIn) {
        await dispatch(fetchCurrentUser());
      }
      return { isSignedIn, nextStep };
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

// Async thunk for user sign up
export const userSignUp = createAsyncThunk(
  'user/signUp',
  async ({ email, password, name, picture, signupLanguage }, { rejectWithValue }) => {
    try {
      const { isSignUpComplete, nextStep } = await signUp({
        username: email,
        password,
        options: { 
          userAttributes: { 
            email, 
            name,
            picture,
            'custom:signup_language': signupLanguage
          },
          autoSignIn: true
        }
      });
      return { isSignUpComplete, nextStep };
    } catch (error) {
      // UsernameExistsException nem sempre é um conflito real: se a conta
      // ainda estiver por confirmar (ex.: o utilizador voltou atrás sem ter
      // mudado o email — era correto à partida — ou a página recarregou a
      // meio do fluxo), signUp() não pode ser chamado outra vez para essa
      // conta, mas resendSignUpCode() pode. Isto evita prender o utilizador
      // num erro "email já existe" sem saída quando só falta o código.
      if (error.name === 'UsernameExistsException') {
        try {
          await resendSignUpCode({ username: email });
          // resumedExistingAccount: a conta (e a password) são as da
          // primeira tentativa — o Cognito não deixa mudar a password de uma
          // conta por confirmar por esta via, por isso a password que o
          // utilizador acabou de escrever aqui foi ignorada. SignUp.jsx usa
          // esta flag para avisar, em vez de deixar isso descoberto só ao
          // falhar o login a seguir.
          return { isSignUpComplete: false, nextStep: { signUpStep: 'CONFIRM_SIGN_UP' }, resumedExistingAccount: true };
        } catch (resendError) {
          // InvalidParameterException aqui é o Cognito a recusar reenviar
          // porque a conta já está confirmada — aí sim é um conflito real
          // (outra conta já usa este email). Qualquer outro erro do reenvio
          // (ex.: LimitExceededException) tem de chegar tal como é, senão o
          // utilizador via sempre "email já existe" mesmo quando o problema
          // era só esperar um pouco.
          if (resendError.name && resendError.name !== 'Error' && resendError.name !== 'InvalidParameterException') {
            return rejectWithValue(resendError.name);
          }
          return rejectWithValue('UsernameExistsException');
        }
      }
      // O nome da exceção Cognito (ex.: "ExpiredCodeException") é mais
      // fiável para mapear para uma mensagem localizada do que error.message,
      // que vem sempre em inglês da AWS. Cai para a mensagem só quando não há
      // nome específico (ex.: falha de rede).
      return rejectWithValue(error.name && error.name !== 'Error' ? error.name : error.message);
    }
  }
);

// Async thunk for confirming sign up and auto sign-in
export const confirmSignUpAndSignIn = createAsyncThunk(
  'user/confirmSignUpAndSignIn',
  async ({ email, confirmationCode }, { rejectWithValue }) => {
    try {
     const { nextStep } =  await confirmSignUp({ username: email, confirmationCode });
      return { confirmationSuccess: true, nextStep };
    } catch (error) {
      return rejectWithValue(error.name && error.name !== 'Error' ? error.name : error.message);
    }
  }
);

// Async thunk for handling auto sign-in
export const completeAutoSignIn = createAsyncThunk(
  'user/completeAutoSignIn',
  async (_, { dispatch, rejectWithValue }) => {
    try {
      const { isSignedIn } = await autoSignIn();
      if (isSignedIn) {
        return dispatch(fetchCurrentUser());
      }
      return { isSignedIn };
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);



// Async thunk for user sign out
export const userSignOut = createAsyncThunk(
  'user/signOut',
  async (_, { dispatch, rejectWithValue }) => {
    try {
      await signOut();
      // RESET_STORE clears in-memory state and removes the persisted blob
      // (see rootReducer in Api/store.js). Avoids importing the store here,
      // which would create a store <-> userSlice import cycle.
      dispatch({ type: RESET_STORE });
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

// Async thunk for password reset
export const userResetPassword = createAsyncThunk(
  'user/resetPassword',
  async (email, { rejectWithValue }) => {
    try {
      const { nextStep } = await resetPassword({ username: email });
      return nextStep;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

// Async thunk for confirming password reset
export const userConfirmResetPassword = createAsyncThunk(
  'user/confirmResetPassword',
  async ({ email, newPassword, confirmationCode }, { rejectWithValue }) => {
    try {
      await confirmResetPassword({ username: email, newPassword, confirmationCode });
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

// Async thunk for updating user attributes
export const updateUserAttributeThunk = createAsyncThunk(
  'user/updateUserAttribute',
  async ({ attributeKey, value}, { dispatch, rejectWithValue }) => {
    try {
      await updateUserAttribute({
        userAttribute: {
          attributeKey,
          value
        }
      });

      // O nome está copiado em EventCollaborator.userName e Event.ownerName —
      // snapshots escritos no accept/create, que o Cognito não sabe notificar.
      // Sem isto, o avatar da agenda ficava com o nome antigo para sempre.
      // Fica aqui e não no ecrã de perfil: quem muda o nome propaga, venha de
      // onde vier.
      //
      // Best-effort de propósito: o nome JÁ mudou no Cognito, e falhar a
      // thunk diria ao utilizador que a gravação falhou quando não falhou.
      // Volta a tentar na gravação seguinte.
      if (attributeKey === 'name') {
        try {
          await getClient().graphql({ query: SYNC_MY_DISPLAY_NAME });
          // A Lambda reescreveu o DynamoDB, mas o RTK Query serve os authors/
          // colaboradores cacheados até ser invalidado — sem isto, o nome novo
          // só aparecia com F5. Invalidar o tagType inteiro refetcha apenas as
          // queries montadas (a agenda/equipa abertas), não todos os eventos.
          dispatch(scheduleApi.util.invalidateTags(['ScheduleEntry']));
          dispatch(collaboratorApi.util.invalidateTags(['Collaborator']));
        } catch (syncError) {
          console.error('[updateUserAttribute] nome não propagado aos eventos:', syncError);
        }
      }

      // Fetch updated user attributes
      const updatedAttributes = await fetchUserAttributes();
      return updatedAttributes;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

// Async thunk for updating user password
export const updateUserPasswordThunk = createAsyncThunk(
  'user/updateUserPassword',
  async ({ oldPassword, newPassword }, { rejectWithValue }) => {
    try {
      await updatePassword({ oldPassword, newPassword });
      return { success: true };
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

// Initial state for the user slice
const initialState = {
  user: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
  authStep: 'INITIAL',
  name: null,
  groups: [],
  providerName: null,
  identityId: null,
  isAdmin: false,
  // true quando userSignUp recuperou de um UsernameExistsException reenviando
  // o código em vez de criar conta nova — a password escrita neste passo foi
  // ignorada (fica a da tentativa original). Ver SignUp.jsx.
  resumedExistingAccount: false
};

// Create the user slice
const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    clearAuthState: (state) => {
      Object.assign(state, initialState);
    },
    updateUserProfile: (state, action) => {
      state.name = action.payload.name;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchCurrentUser.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(fetchCurrentUser.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = action.payload.userAttributes;
        state.isAuthenticated = action.payload.isSignedIn;
        state.name = action.payload.userAttributes.name;
        state.groups = action.payload.groups;
        state.identityId = action.payload.identityId;
        state.authStep = 'SIGNED_IN';
        state.isAdmin = action.payload.groups.includes(USER_GROUPS.ADMIN);
      
        let providerName = 'Cognito';
        if (action.payload.userAttributes.identities) {
          try {
            const identitiesArray = JSON.parse(action.payload.userAttributes.identities);
            if (identitiesArray && identitiesArray.length > 0) {
              providerName = identitiesArray[0].providerName || providerName;
            }
          } catch (error) {
            console.error('Error parsing identities:', error);
          }
        }
        state.providerName = providerName;
      })
      .addCase(fetchCurrentUser.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
        state.isAuthenticated = false;
        state.groups = [];
        state.authStep = 'SIGN_IN';
      })
      .addCase(userSignIn.pending, (state) => {
        state.isLoading = true;
        state.authStep = 'SIGNING_IN';
      })
      .addCase(userSignIn.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isAuthenticated = action.payload.isSignedIn;
        state.authStep = action.payload.isSignedIn ? 'SIGNED_IN' : 'SIGN_IN';
      })
      .addCase(userSignIn.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
        state.authStep = 'SIGN_IN';
      })
      .addCase(googleSignIn.pending, (state) => {
        state.isLoading = true;
        state.authStep = 'SIGNING_IN';
      })
      .addCase(googleSignIn.fulfilled, (state, action) => {
        state.isLoading = false;
        state.authStep = action.payload.isSignedIn ? 'SIGNED_IN' : 'SIGN_IN';
      })
      .addCase(googleSignIn.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
        state.authStep = 'SIGN_IN';
      })
      .addCase(userSignUp.pending, (state) => {
        state.isLoading = true;
        state.authStep = 'SIGNING_UP';
        state.resumedExistingAccount = false;
      })
      .addCase(userSignUp.fulfilled, (state, action) => {
        state.isLoading = false;
        state.resumedExistingAccount = Boolean(action.payload.resumedExistingAccount);
        if (action.payload.nextStep?.signUpStep === 'CONFIRM_SIGN_UP') {
          state.authStep = 'AWAITING_CONFIRMATION';
        }
      })
      .addCase(userSignUp.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
        state.authStep = 'SIGN_UP';
      })
      .addCase(confirmSignUpAndSignIn.pending, (state) => {
        state.isLoading = true;
        state.authStep = 'CONFIRMING';
      })
      .addCase(confirmSignUpAndSignIn.fulfilled, (state, action) => {
        state.isLoading = false;
        if (action.payload.confirmationSuccess) {
          if (action.payload.nextStep?.signUpStep === 'COMPLETE_AUTO_SIGN_IN') {
            state.authStep = 'AUTO_SIGN_IN';
          } else {
            state.authStep = 'CONFIRMATION_SUCCESS';
          }
        }
      })
      .addCase(confirmSignUpAndSignIn.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
        state.authStep = 'AWAITING_CONFIRMATION';
      })
      .addCase(completeAutoSignIn.pending, (state) => {
        state.isLoading = true;
        state.authStep = 'AUTO_SIGNING_IN';
      })
      .addCase(completeAutoSignIn.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isAuthenticated = action.payload.payload.isSignedIn;
        state.authStep = 'SIGNED_IN';
      })
      .addCase(completeAutoSignIn.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
        state.authStep = 'SIGN_IN';
      })
      .addCase(userSignOut.fulfilled, (state) => {
        Object.assign(state, initialState);
      })
      .addCase(userSignOut.rejected, (state) => {
        Object.assign(state, initialState);
      })
      .addCase(updateUserAttributeThunk.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(updateUserAttributeThunk.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = action.payload;
        state.name = action.payload.name;
      })
      .addCase(updateUserAttributeThunk.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      .addCase(updateUserPasswordThunk.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(updateUserPasswordThunk.fulfilled, (state) => {
        state.isLoading = false;
      })
      .addCase(updateUserPasswordThunk.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      });
  },
});

export const { clearAuthState, updateUserProfile } = userSlice.actions;
export default userSlice.reducer;