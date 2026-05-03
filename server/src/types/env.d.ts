declare namespace NodeJS {
  interface ProcessEnv {
    readonly NODE_ENV?: 'development' | 'production' | 'test';
    readonly DB_HOST?: string;
    readonly DB_PORT?: string;
    readonly DB_NAME?: string;
    readonly DB_APP_USER?: string;
    readonly DB_APP_PASSWORD?: string;
    readonly DB_MIGRATION_USER?: string;
    readonly DB_MIGRATION_PASSWORD?: string;
    readonly DB_SUPER_USER?: string;
    readonly DB_SUPER_PASSWORD?: string;
    readonly DATABASE_URL?: string;
    readonly MIGRATION_DATABASE_URL?: string;
    readonly ACCESS_TOKEN_SECRET?: string;
    readonly REFRESH_TOKEN_SECRET?: string;
    readonly FRONTEND_URL?: string;
    readonly COOKIE_SECURE?: string;
    readonly PORT?: string;
  }
}
