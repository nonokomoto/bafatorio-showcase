/**
 * @file rolesConfig.js
 * @description Grupos de utilizador para autorização. O gate por plano vive
 * nas Lambdas (autoridade) + useAuthz (UI) — planos em src/Utils/plans.js (fonte única).
 */

/**
 * User groups for authorization
 */
export const USER_GROUPS = {
    ADMIN: 'ADMIN',
    USER: 'USER'
};
