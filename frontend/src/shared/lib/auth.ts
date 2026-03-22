export const REFRESH_TOKEN_ERROR = 'RefreshTokenError' as const;

export const DEV_TOKEN_PREFIX = 'dev-mock-';

export const DEV_USERS = {
    admin: { name: 'Dev Admin', email: 'dev-admin@dev.example.com' },
    commenter: { name: 'Dev Commenter', email: 'dev-commenter@dev.example.com' },
} as const;

export type DevRole = keyof typeof DEV_USERS;
