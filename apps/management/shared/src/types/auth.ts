/* ========================================================================
   KİMLİK DOĞRULAMA TİP TANIMLARI
   JWT payload, oturum kullanıcısı ve kapsam tanımları
   ======================================================================== */

import type { UserRole, UserStatus } from '../constants/userConstants';

export interface JwtPayload {
  id: string;
  username: string;
  role: UserRole;
  locationId: string | null;
  unitId: string | null;
  /** true ise kullanıcı şifresini değiştirmeden hiçbir işlem yapamaz */
  mustChangePassword: boolean;
  /** Oturum iptali için sürüm damgası; DB'deki değerle eşleşmeyen token reddedilir */
  tokenVersion: number;
}

/* İstemcinin gördüğü oturum kullanıcısı. tokenVersion istemciye gitmez;
   buna karşılık login/getMe yanıtları status ve mustChangePassword taşır. */
export interface AuthUser {
  id: string;
  username: string;
  role: UserRole;
  locationId: string | null;
  unitId: string | null;
  status?: UserStatus;
  /** true ise arayüz zorunlu şifre değişimi modalını açar */
  mustChangePassword?: boolean;
}

export interface Scope {
  locationId: string | null;
  unitId: string | null;
}
