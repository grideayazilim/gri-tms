/* ========================================================================
   KİMLİK DOĞRULAMA TİP TANIMLARI
   JWT payload, oturum kullanıcısı ve kapsam tanımları
   ======================================================================== */

import type { UserRole } from '../constants/userConstants';

export interface JwtPayload {
  id: string;
  username: string;
  role: UserRole;
  locationId: string | null;
  unitId: string | null;
}

export type AuthUser = JwtPayload;

export interface Scope {
  locationId: string | null;
  unitId: string | null;
}
