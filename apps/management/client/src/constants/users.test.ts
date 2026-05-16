import { describe, it, expect } from 'vitest';
import { getRoleConfig, getUserStatusConfig, USER_ROLES, USER_STATUS_CONFIG } from './users';

describe('getRoleConfig', () => {
  it('gecerli ADMIN rolu icin dogru konfigurasyon donmeli', () => {
    const config = getRoleConfig('ADMIN');
    expect(config).toBe(USER_ROLES['ADMIN']);
  });

  it('gecerli RESPONSIBLE rolu icin dogru konfigurasyon donmeli', () => {
    const config = getRoleConfig('RESPONSIBLE');
    expect(config).toBe(USER_ROLES['RESPONSIBLE']);
  });

  it('null icin varsayilan konfigurasyon donmeli', () => {
    const config = getRoleConfig(null);
    expect(config.code).toBe('unknown');
    expect(config.label).toBe('-');
  });

  it('undefined icin varsayilan konfigurasyon donmeli', () => {
    const config = getRoleConfig(undefined);
    expect(config.code).toBe('unknown');
  });

  it('bilinmeyen rol icin varsayilan konfigurasyon donmeli', () => {
    const config = getRoleConfig('UNKNOWN_ROLE');
    expect(config.code).toBe('UNKNOWN_ROLE');
    expect(config.label).toBe('UNKNOWN_ROLE');
  });
});

describe('getUserStatusConfig', () => {
  it('ACTIVE status icin dogru konfigurasyon donmeli', () => {
    const config = getUserStatusConfig('ACTIVE');
    expect(config).toBe(USER_STATUS_CONFIG['ACTIVE']);
  });

  it('EXPIRED status icin dogru konfigurasyon donmeli', () => {
    const config = getUserStatusConfig('EXPIRED');
    expect(config).toBe(USER_STATUS_CONFIG['EXPIRED']);
  });

  it('PENDING status icin dogru konfigurasyon donmeli', () => {
    const config = getUserStatusConfig('PENDING');
    expect(config).toBe(USER_STATUS_CONFIG['PENDING']);
  });

  it('null status icin varsayilan konfigurasyon donmeli', () => {
    const config = getUserStatusConfig(null);
    expect(config.code).toBe('unknown');
    expect(config.label).toBe('-');
  });

  it('gecmis tarihli expiry ile ACTIVE status EXPIRED gibi gosterilmeli', () => {
    const pastDate = '2020-01-01';
    const config = getUserStatusConfig('ACTIVE', pastDate);
    expect(config).toBe(USER_STATUS_CONFIG['EXPIRED']);
  });

  it('gelecek tarihli expiry ile normal status donmeli', () => {
    const futureDate = '2099-12-31';
    const config = getUserStatusConfig('ACTIVE', futureDate);
    expect(config).toBe(USER_STATUS_CONFIG['ACTIVE']);
  });

  it('EXPIRED status ve gecmis tarih icin EXPIRED konfigurasyon donmeli', () => {
    const pastDate = '2020-01-01';
    const config = getUserStatusConfig('EXPIRED', pastDate);
    expect(config).toBe(USER_STATUS_CONFIG['EXPIRED']);
  });

  it('bilinmeyen status icin varsayilan konfigurasyon donmeli', () => {
    const config = getUserStatusConfig('UNKNOWN');
    expect(config.code).toBe('UNKNOWN');
  });
});
