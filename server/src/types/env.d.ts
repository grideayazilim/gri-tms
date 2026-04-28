declare namespace NodeJS {
  interface ProcessEnv {
    readonly NODE_ENV?: 'development' | 'production' | 'test';
    readonly DB_HOST?: string;
    readonly DB_PORT?: string;
    readonly DB_NAME?: string;
    readonly DB_USER?: string;
    readonly DB_PASSWORD?: string;
    readonly MIGRATION_DATABASE_URL?: string;
    readonly JWT_ACCESS_SECRET?: string;
    readonly JWT_REFRESH_SECRET?: string;
    readonly FRONTEND_URL?: string;
    readonly COOKIE_SECURE?: string;
    readonly PORT?: string;
  }
}
