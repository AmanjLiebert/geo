import { describe, expect, it } from 'vitest';
import { hasPermission, Permission, ROLE_PERMISSIONS, UserRole } from './access-control';

describe('fixed role bundles', () => {
  it('defines exactly visitor, teacher, and admin', () => {
    expect(Object.values(UserRole)).toEqual(['visitor', 'teacher', 'admin']);
    expect(Object.keys(ROLE_PERMISSIONS)).toHaveLength(3);
  });

  it('prevents a visitor from receiving editorial or account-management access', () => {
    expect(hasPermission(UserRole.VISITOR, Permission.MANAGE_SAVED_RECORDS)).toBe(true);
    expect(hasPermission(UserRole.VISITOR, Permission.MANAGE_SCIENTIFIC_CONTENT)).toBe(false);
    expect(hasPermission(UserRole.VISITOR, Permission.MANAGE_USERS)).toBe(false);
  });

  it('gives teachers the scientific workflow but not admin operations', () => {
    expect(hasPermission(UserRole.TEACHER, Permission.PUBLISH_SCIENTIFIC_CONTENT)).toBe(true);
    expect(hasPermission(UserRole.TEACHER, Permission.MANAGE_USERS)).toBe(false);
    expect(hasPermission(UserRole.TEACHER, Permission.MANAGE_NEWS)).toBe(false);
  });

  it('gives admins every teacher permission plus limited operational permissions', () => {
    for (const permission of ROLE_PERMISSIONS[UserRole.TEACHER]) {
      expect(hasPermission(UserRole.ADMIN, permission)).toBe(true);
    }
    expect(hasPermission(UserRole.ADMIN, Permission.MANAGE_USERS)).toBe(true);
    expect(hasPermission(UserRole.ADMIN, Permission.MANAGE_SITE_CONTENT)).toBe(true);
  });
});
