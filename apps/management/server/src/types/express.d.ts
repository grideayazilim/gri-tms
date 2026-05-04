import type { AuthUser, Scope } from '@timesheet/shared';

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
      scope?: Scope | null;
    }
  }
}
