# ADR-006: Authentication & Authorization Architecture

**Status:** Accepted  
**Date:** 2026-01-23  
**Authors:** Bafatorio Development Team

## Context

O Bafatorio utiliza AWS Cognito para autenticação e autorização de utilizadores. A aplicação implementa um fluxo completo de autenticação incluindo email/password, Google OAuth, e gestão de sessões com tratamento de erros robusto.

## Decision

### Visão Geral da Arquitetura

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                        AUTHENTICATION FLOW OVERVIEW                             │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │                          FRONTEND (React)                                │   │
│  │  ┌───────────┐  ┌───────────┐  ┌───────────┐  ┌───────────────────┐    │   │
│  │  │  SignIn   │  │  SignUp   │  │  Forgot   │  │  AuthErrorHandler │    │   │
│  │  │  Screen   │  │  Screen   │  │ Password  │  │   (Global Hook)   │    │   │
│  │  └─────┬─────┘  └─────┬─────┘  └─────┬─────┘  └─────────┬─────────┘    │   │
│  │        │              │              │                  │               │   │
│  │        └──────────────┴──────────────┴──────────────────┘               │   │
│  │                                 │                                        │   │
│  │                                 ▼                                        │   │
│  │              ┌─────────────────────────────────────────┐                │   │
│  │              │        Redux userSlice                   │                │   │
│  │              │    (Async Thunks + State Machine)        │                │   │
│  │              └─────────────────────────────────────────┘                │   │
│  └───────────────────────────────────────│─────────────────────────────────┘   │
│                                          │                                      │
│                                          ▼                                      │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │                      AWS AMPLIFY AUTH (@aws-amplify/auth)                │   │
│  │   signIn, signUp, signOut, confirmSignUp, resetPassword, autoSignIn     │   │
│  │   fetchAuthSession, fetchUserAttributes, signInWithRedirect             │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                          │                                      │
│                                          ▼                                      │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │                           AWS COGNITO                                    │   │
│  │  ┌─────────────┐    ┌─────────────┐    ┌─────────────────────────────┐ │   │
│  │  │  User Pool  │    │  Identity   │    │       Lambda Triggers        │ │   │
│  │  │ (Auth Data) │    │    Pool     │    │  ┌─────────────────────────┐ │ │   │
│  │  │             │    │ (IAM Creds) │    │  │   Post-Confirmation     │ │ │   │
│  │  └─────────────┘    └─────────────┘    │  │   - Add to USER         │ │ │   │
│  │                                         │  │   - Send Welcome Email  │ │ │   │
│  │                                         │  └─────────────────────────┘ │ │   │
│  │                                         └─────────────────────────────┘ │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## 1. Cognito Configuration

### 1.1 Auth Resource Definition

```typescript
// amplify/auth/resource.ts
export const auth = defineAuth({
  loginWith: {
    email: true,              // Email-based authentication
  },
  userAttributes: {
    'custom:signup_language': {
      dataType: 'String',
      mutable: true,
    },
  },
  groups: ['USER', 'ADMIN'],
  triggers: {
    postConfirmation        // Lambda triggered after email verification
  }, 
  access: (allow) => [
    allow.resource(postConfirmation).to(["addUserToGroup"]),
  ],
});
```

### 1.2 User Groups & Roles

```
┌─────────────────────────────────────────────────────────────────┐
│                        USER GROUPS HIERARCHY                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│    ┌─────────────────────────────────────────────────────┐     │
│    │                     ADMIN                            │     │
│    │  • Full platform access                             │     │
│    │  • Can manage other users                           │     │
│    │  • Admin dashboard access                           │     │
│    └─────────────────────────────────────────────────────┘     │
│                           │                                     │
│                           ▼                                     │
│    ┌─────────────────────────────────────────────────────┐     │
│    │                     USER                             │     │
│    │  • Default group after signup                       │     │
│    │  • Standard platform access                         │     │
│    │  • Feature access controlled by subscription plan   │     │
│    └─────────────────────────────────────────────────────┘     │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 1.3 User Groups Constants

```javascript
// src/Utils/rolesConfig.js
export const USER_GROUPS = {
  ADMIN: 'ADMIN',       // Full admin/manager access
  USER: 'USER'          // Standard user (default after signup)
};
```

---

## 2. Post-Confirmation Lambda Trigger

### 2.1 Trigger Flow

```
User SignUp → Email Verification → Cognito Post-Confirmation Trigger
                                              │
                                              ▼
                                   ┌─────────────────────┐
                                   │ Lambda Handler      │
                                   │                     │
                                   │ 1. Add user to      │
                                   │    USER group       │
                                   │                     │
                                   │ 2. Send welcome     │
                                   │    email via SQS    │
                                   └─────────────────────┘
```

### 2.2 Handler Implementation

```typescript
// amplify/auth/post-confirmation/handler.ts
export const handler: PostConfirmationTriggerHandler = async (event) => {
  // 1. Add user to USER group
  const command = new AdminAddUserToGroupCommand({
    GroupName: process.env.GROUP_NAME,  // 'USER'
    Username: event.userName,
    UserPoolId: event.userPoolId
  });
  await client.send(command);

  // 2. Send welcome email
  const userAttributes = event.request.userAttributes;
  const lang = mapLanguageCode(userAttributes['custom:signup_language']);
  
  await sendEmail('welcome', {
    recipient: { 
      name: userAttributes.name, 
      email: userAttributes.email 
    },
    language: lang  // 'pt', 'en', or 'fr'
  });

  return event;
};
```

---

## 3. Authentication State Machine

### 3.1 Auth Steps

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         AUTH STATE MACHINE                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   INITIAL ──────────► SIGNING_IN ──────────► SIGNED_IN                     │
│      │                     │                      │                         │
│      │                     │ (error)              │                         │
│      │                     ▼                      │                         │
│      │                 SIGN_IN ◄─────────────────┘                         │
│      │                                        (signOut)                     │
│      │                                                                      │
│      └──────────────► SIGNING_UP ──────────► AWAITING_CONFIRMATION         │
│                            │                      │                         │
│                            │ (error)              │ (code submitted)        │
│                            ▼                      ▼                         │
│                        SIGN_UP              CONFIRMING                      │
│                                                   │                         │
│                                                   │ (success)               │
│                                                   ▼                         │
│                                           AUTO_SIGN_IN                      │
│                                                   │                         │
│                                                   │ (success)               │
│                                                   ▼                         │
│                                              SIGNED_IN                      │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 3.2 Auth Steps Enum

```javascript
// Possible authStep values in Redux state
const AUTH_STEPS = {
  INITIAL: 'INITIAL',
  SIGN_IN: 'SIGN_IN',
  SIGNING_IN: 'SIGNING_IN',
  SIGNED_IN: 'SIGNED_IN',
  SIGN_UP: 'SIGN_UP',
  SIGNING_UP: 'SIGNING_UP',
  AWAITING_CONFIRMATION: 'AWAITING_CONFIRMATION',
  CONFIRMING: 'CONFIRMING',
  CONFIRMATION_SUCCESS: 'CONFIRMATION_SUCCESS',
  AUTO_SIGN_IN: 'AUTO_SIGN_IN',
  AUTO_SIGNING_IN: 'AUTO_SIGNING_IN'
};
```

---

## 4. Redux Auth Slice

### 4.1 State Structure

```javascript
// src/Redux/Auth/userSlice.js
const initialState = {
  user: null,              // Cognito user attributes
  isAuthenticated: false,  // Auth status
  isLoading: false,        // Loading indicator
  error: null,             // Error message
  authStep: 'INITIAL',     // State machine step
  name: null,              // User display name
  groups: [],              // Cognito groups array
  providerName: null,      // 'Cognito' or 'Google'
  identityId: null,        // For S3 paths
  isManager: false         // Quick check for ADMIN group
};
```

### 4.2 Async Thunks

| Thunk | Description | API Call |
|-------|-------------|----------|
| `fetchCurrentUser` | Get current session & attributes | `fetchAuthSession()` + `fetchUserAttributes()` |
| `userSignIn` | Email/password sign in | `signIn({ username, password })` |
| `googleSignIn` | Google OAuth | `signInWithRedirect({ provider: 'Google' })` |
| `userSignUp` | Register new user | `signUp({ username, password, options })` |
| `confirmSignUpAndSignIn` | Verify email code | `confirmSignUp({ username, code })` |
| `completeAutoSignIn` | Auto sign in after confirm | `autoSignIn()` |
| `userSignOut` | Sign out user | `signOut()` |
| `userResetPassword` | Request password reset | `resetPassword({ username })` |
| `userConfirmResetPassword` | Confirm new password | `confirmResetPassword({ username, newPassword, code })` |
| `updateUserAttributeThunk` | Update profile | `updateUserAttribute({ userAttribute })` |
| `updateUserPasswordThunk` | Change password | `updatePassword({ oldPassword, newPassword })` |

---

## 5. Authentication Flows

### 5.1 Sign Up Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           SIGN UP FLOW                                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   User fills form (email, password, name, language)                        │
│                    │                                                        │
│                    ▼                                                        │
│   dispatch(userSignUp({ email, password, name, signupLanguage }))          │
│                    │                                                        │
│                    ▼                                                        │
│   ┌─────────────────────────────────────────┐                              │
│   │ Amplify signUp() with:                  │                              │
│   │ - username: email                       │                              │
│   │ - password                              │                              │
│   │ - userAttributes: {                     │                              │
│   │     email, name, picture,               │                              │
│   │     'custom:signup_language'            │                              │
│   │   }                                     │                              │
│   │ - autoSignIn: true                      │                              │
│   └─────────────────────────────────────────┘                              │
│                    │                                                        │
│                    ▼                                                        │
│   Cognito sends verification email                                         │
│   authStep = 'AWAITING_CONFIRMATION'                                       │
│                    │                                                        │
│                    ▼                                                        │
│   User enters 6-digit code                                                 │
│   dispatch(confirmSignUpAndSignIn({ email, code }))                        │
│                    │                                                        │
│                    ▼                                                        │
│   ┌─────────────────────────────────────────┐                              │
│   │ Cognito Post-Confirmation Trigger:      │                              │
│   │ 1. Add user to USER group               │                              │
│   │ 2. Send welcome email                   │                              │
│   └─────────────────────────────────────────┘                              │
│                    │                                                        │
│                    ▼                                                        │
│   dispatch(completeAutoSignIn())                                           │
│   authStep = 'SIGNED_IN'                                                   │
│   → Redirect to /app/events                                                │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 5.2 Sign In Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           SIGN IN FLOW                                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   User enters email & password                                             │
│                    │                                                        │
│                    ▼                                                        │
│   dispatch(userSignIn({ email, password }))                                │
│   authStep = 'SIGNING_IN'                                                  │
│                    │                                                        │
│                    ▼                                                        │
│   ┌─────────────────────────────────────────┐                              │
│   │ Amplify signIn({ username, password })   │                              │
│   │                                          │                              │
│   │ Returns: { isSignedIn, nextStep }        │                              │
│   └─────────────────────────────────────────┘                              │
│                    │                                                        │
│           ┌───────┴───────┐                                                │
│           │               │                                                │
│   isSignedIn = true   isSignedIn = false                                  │
│           │               │                                                │
│           ▼               ▼                                                │
│   dispatch(              Handle nextStep                                   │
│     fetchCurrentUser()   (MFA, etc.)                                       │
│   )                                                                        │
│           │                                                                 │
│           ▼                                                                 │
│   Extract from authSession:                                                │
│   - userAttributes (sub, email, name)                                      │
│   - groups (cognito:groups claim)                                          │
│   - identityId (for S3 paths)                                              │
│   - isManager check                                                        │
│           │                                                                 │
│           ▼                                                                 │
│   authStep = 'SIGNED_IN'                                                   │
│   isAuthenticated = true                                                   │
│   → Redirect to /app/events                                                │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 5.3 Password Reset Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        PASSWORD RESET FLOW                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   User clicks "Forgot Password"                                            │
│   → Enter email                                                            │
│                    │                                                        │
│                    ▼                                                        │
│   dispatch(userResetPassword(email))                                       │
│                    │                                                        │
│                    ▼                                                        │
│   Cognito sends reset code via email                                       │
│                    │                                                        │
│                    ▼                                                        │
│   User enters: code + new password                                         │
│                    │                                                        │
│                    ▼                                                        │
│   dispatch(userConfirmResetPassword({                                      │
│     email,                                                                 │
│     newPassword,                                                           │
│     confirmationCode                                                       │
│   }))                                                                      │
│                    │                                                        │
│                    ▼                                                        │
│   Password updated → Redirect to Sign In                                   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 6. Protected Routes

### 6.1 Route Protection

```jsx
// src/App.jsx
const ProtectedRoute = ({ children }) => {
  const isAuthenticated = useSelector(state => state.user.isAuthenticated);
  return isAuthenticated ? children : <Navigate to="/signin" replace />;
};

// Usage
<Route path="/app" element={
  <ProtectedRoute>
    <Layout />
  </ProtectedRoute>
}>
  <Route path="events" element={<EventsPage />} />
  <Route path="dashboard" element={<Dashboard />} />
  {/* ... more protected routes */}
</Route>
```

### 6.2 Route Structure

```
/                           ← Landing page (public)
/signin                     ← Sign in (public)
/signup                     ← Sign up (public)
/forgotpassword             ← Password reset (public)
/access-code                ← Verification code (public)

/app/*                      ← All protected routes
  /app/events               ← Event list
  /app/register-event       ← Create event
  /app/event/:id            ← Event details
  /app/participants         ← Participant list
  /app/confirm-presence     ← Check-in flow
  /app/dashboard            ← Analytics
  /app/suppliers            ← Supplier management
  /app/settings/*           ← User settings
  /app/plan-selection       ← Subscription plans
  /app/akili-chat           ← AI chatbot
```

---

## 7. Error Handling

### 7.1 Revoked Token Detection

```javascript
// Errors that require full logout
const REVOKED_TOKEN_ERRORS = [
  'Access Token has been revoked',
  'NotAuthorizedException',
  'Invalid access token',
  'Token expired',
  'Invalid Refresh Token',
  'Refresh Token has been revoked',
];

const isRevokedTokenError = (errorMessage) => {
  if (!errorMessage || typeof errorMessage !== 'string') return false;
  return REVOKED_TOKEN_ERRORS.some(error => 
    errorMessage.includes(error)
  );
};
```

### 7.2 Global Auth Error Handler

```jsx
// src/Hook/useAuthErrorHandler.js
export const useAuthErrorHandler = () => {
  const handleAuthError = useCallback(async (error) => {
    if (isRevokedTokenError(error?.message)) {
      // 1. Try clean signOut
      await signOut({ global: true }).catch(() => {});
      
      // 2. Clear local storage
      localStorage.clear();
      sessionStorage.clear();
      
      // 3. Reset Redux store
      resetStoreAndPersistor();
      
      // 4. Redirect to signin
      window.location.href = '/signin';
      
      return true;
    }
    return false;
  }, []);

  // Listen for unhandled promise rejections
  useEffect(() => {
    const handler = (event) => {
      if (isRevokedTokenError(event.reason?.message)) {
        handleAuthError(event.reason);
        event.preventDefault();
      }
    };
    window.addEventListener('unhandledrejection', handler);
    return () => window.removeEventListener('unhandledrejection', handler);
  }, [handleAuthError]);

  return { handleAuthError, isRevokedTokenError };
};

// Component wrapper - add to App.jsx
export const AuthErrorHandler = () => {
  useAuthErrorHandler();
  return null;
};
```

### 7.3 Usage in App

```jsx
// src/App.jsx
function App() {
  return (
    <Router>
      <ThemeInitializer />
      <AuthErrorHandler />  {/* ← Global error handler */}
      <Suspense fallback={<LoadingFallback />}>
        <Routes>
          {/* ... routes */}
        </Routes>
      </Suspense>
    </Router>
  );
}
```

---

## 8. Token Management

### 8.1 Token Storage

```
┌─────────────────────────────────────────────────────────────────┐
│                     TOKEN STORAGE                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   Amplify stores tokens automatically in:                       │
│                                                                 │
│   localStorage:                                                 │
│   ├── CognitoIdentityServiceProvider.{userPoolClientId}.{sub}  │
│   │   ├── accessToken    (JWT, short-lived ~1h)                │
│   │   ├── idToken        (JWT with user claims)                │
│   │   ├── refreshToken   (long-lived ~30 days)                 │
│   │   └── clockDrift     (for token expiry calculation)        │
│   │                                                             │
│   └── amplify-signin-with-hostedUI                             │
│       └── (OAuth state if using Google)                        │
│                                                                 │
│   Redux (persisted):                                            │
│   └── persist:root                                              │
│       └── user: { isAuthenticated, groups, identityId, ... }   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 8.2 Token Refresh

```
Amplify handles token refresh automatically:

1. accessToken expires (typically 1 hour)
2. Next API call triggers refresh
3. Amplify uses refreshToken to get new accessToken
4. If refreshToken expired/revoked → AuthErrorHandler triggers cleanup
```

---

## 9. Two-Layer Authorization Model

O Bafatorio implementa autorização em dois níveis complementares:

### 9.0.1 Layer 1: Subscription-based (Cognito Groups)

Controla o que o utilizador pode fazer **na plataforma** com base no plano/grupo:
- `USER` → Grupo padrão após signup (acesso controlado pelo plano de subscrição)
- `ADMIN` → Administração da plataforma
- Implementado via Cognito groups, `rolesConfig.js`, `useSubscriptionAccess`
- **Nota:** Os grupos antigos (REGISTERED, TEST, ACTIVE, MANAGER) foram migrados para USER/ADMIN — ver [ADR-017](ADR-017-cognito-groups-supplier-sharing.md)

### 9.0.2 Layer 2: Event-level (Event Roles) — ADR-015

Controla o que o utilizador pode fazer **num evento específico** com base no seu role:
- `OWNER` → Controlo total (criador do evento)
- `CO_MANAGER` → Quase todas as permissões
- `STAFF_CHECKIN` → Apenas check-in de participantes
- `STAFF_LOGISTICS` → Gestão de participantes, seleção de fornecedores

Implementado via:
- `eventRolesConfig.js` (25 permissões granulares, ROLE_PERMISSIONS matrix)
- `useEventRole` hook (determina role via `getEventAsCollaborator` Lambda)
- `EventRoleGuard` (component-level) e `EventRouteGuard` (route-level)
- 14 Lambda functions com role checks no backend

**Ver [ADR-015: Event Collaboration & Access Control](ADR-015-event-collaboration-access-control.md) para documentação completa.**

---

## 10. Authorization in GraphQL

### 9.1 Owner-Based Authorization

```typescript
// amplify/data/resource.ts
Event: a.model({
  eventTitle: a.string(),
  // ... fields
})
.authorization((rules) => [
  rules.owner(),  // Only owner can CRUD
])
```

### 9.2 Group-Based Authorization

```typescript
// Admin-only models
PricingPlan: a.model({
  name: a.string(),
  // ...
})
.authorization((rules) => [
  rules.group('admin'),
])
```

### 9.3 Public API Key (Webhooks)

```typescript
// Public endpoints
confirmParticipant: a.mutation()
  .authorization(allow => allow.publicApiKey())
  .handler(a.handler.function(confirmParticipant))

handleStripeWebhook: a.mutation()
  .authorization(allow => allow.publicApiKey())
  .handler(a.handler.function(handleStripeWebhook))
```

---

## 11. Custom User Attributes

### 10.1 Defined Attributes

| Attribute | Type | Purpose |
|-----------|------|---------|
| `email` | String | Primary identifier |
| `name` | String | Display name |
| `picture` | String | Profile picture URL |
| `custom:signup_language` | String | Preferred language (pt-PT, en-US, fr-FR) |

### 10.2 Update Attributes

```javascript
// Update single attribute
dispatch(updateUserAttributeThunk({
  attributeKey: 'name',
  value: 'New Name'
}));

// Backend
await updateUserAttribute({
  userAttribute: {
    attributeKey: 'name',
    value: 'New Name'
  }
});
```

---

## 12. Security Considerations

### 11.1 Implemented Security Measures

| Measure | Implementation |
|---------|----------------|
| **Password Policy** | Cognito default (8+ chars, mixed case, numbers, symbols) |
| **Email Verification** | Required before first sign in |
| **Token Rotation** | Auto-refresh via Amplify |
| **Revoked Token Handling** | Global error handler with cleanup |
| **HTTPS Only** | Enforced by Amplify/CloudFront |
| **Owner Authorization** | All user data scoped to owner |
| **Group Authorization** | Admin features restricted |

### 11.2 Session Cleanup

```javascript
// On sign out or revoked token
const cleanup = async () => {
  // 1. Server-side invalidation
  await signOut({ global: true });
  
  // 2. Client-side cleanup
  localStorage.clear();
  sessionStorage.clear();
  
  // 3. Redux cleanup
  resetStoreAndPersistor();
  
  // 4. Force reload
  window.location.href = '/signin';
};
```

---

## Consequences

### Positivas

1. **Managed Service**: Cognito handles security, MFA, password policies
2. **Scalable**: Serverless auth scales automatically
3. **Multi-Provider**: Easy to add OAuth providers (Google ready)
4. **Token Management**: Amplify handles refresh automatically
5. **Error Recovery**: Robust handling of expired/revoked tokens

### Negativas

1. **Vendor Lock-in**: Tightly coupled to AWS Cognito
2. **Complexity**: Multiple moving parts (Amplify, Redux, Cognito)
3. **Cold Start**: Post-confirmation Lambda may have cold start latency

### Riscos

| Risco | Mitigação |
|-------|-----------|
| Token theft | Short-lived tokens + HTTPS |
| Session hijacking | Revoked token detection |
| Brute force | Cognito built-in rate limiting |
| Data breach | Owner-based authorization |

---

## Related ADRs

- [ADR-001: Amplify Environments Architecture](ADR-001-amplify-environments-architecture.md)
- [ADR-004: Amplify Backend Complete Architecture](ADR-004-amplify-backend-complete-architecture.md)
- [ADR-005: Frontend API Architecture](ADR-005-frontend-api-architecture.md)
- [ADR-015: Event Collaboration & Access Control](ADR-015-event-collaboration-access-control.md) - **Event-level roles e permissions (Layer 2)**

---

## File References

| File | Purpose |
|------|---------|
| [amplify/auth/resource.ts](amplify/auth/resource.ts) | Cognito configuration |
| [amplify/auth/post-confirmation/handler.ts](amplify/auth/post-confirmation/handler.ts) | Post-confirmation trigger |
| [src/Redux/Auth/userSlice.js](src/Redux/Auth/userSlice.js) | Auth state management |
| [src/Hook/useAuthErrorHandler.js](src/Hook/useAuthErrorHandler.js) | Global error handler |
| [src/Components/Login/SignIn.jsx](src/Components/Login/SignIn.jsx) | Sign in UI |
| [src/Components/Login/SignUp.jsx](src/Components/Login/SignUp.jsx) | Sign up UI |
| [src/Utils/rolesConfig.js](src/Utils/rolesConfig.js) | Groups & roles config |
| [src/App.jsx](src/App.jsx) | Protected routes |

---

## Changelog

| Date | Author | Description |
|------|--------|-------------|
| 2026-01-23 | Dev Team | Initial version documenting authentication architecture |
| 2026-02-05 | Dev Team | Adicionado Two-Layer Authorization Model (Section 9) referenciando ADR-015 |
| 2026-03-20 | Ney Carvalho | Atualizado grupos Cognito (REGISTERED/TEST/ACTIVE/MANAGER → USER/ADMIN conforme ADR-017); corrigido postConfirmation handler |
