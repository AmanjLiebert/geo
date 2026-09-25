import { describe, expect, it } from 'vitest';
import { Permission } from './access-control';
import { PUBLIC_ENDPOINT_KEY, REQUIRED_PERMISSIONS_KEY } from './access.decorators';
import { AuthController } from './auth.controller';
import { UsersController } from './users.controller';

describe('identity controller policies', () => {
  it('marks only CSRF bootstrap and session exchange as unauthenticated auth routes', () => {
    expect(
      Reflect.getMetadata(PUBLIC_ENDPOINT_KEY, method(AuthController.prototype, 'getPreauthCsrf')),
    ).toBe(true);
    expect(
      Reflect.getMetadata(PUBLIC_ENDPOINT_KEY, method(AuthController.prototype, 'createSession')),
    ).toBe(true);
    expect(
      Reflect.getMetadata(PUBLIC_ENDPOINT_KEY, method(AuthController.prototype, 'getCurrentUser')),
    ).not.toBe(true);
    expect(
      Reflect.getMetadata(PUBLIC_ENDPOINT_KEY, method(AuthController.prototype, 'deleteSession')),
    ).not.toBe(true);
  });

  it('assigns an explicit permission to every protected auth and user route', () => {
    const expected = [
      [method(AuthController.prototype, 'getCurrentUser'), Permission.VIEW_OWN_ACCOUNT],
      [method(AuthController.prototype, 'reauthenticate'), Permission.VIEW_OWN_ACCOUNT],
      [method(AuthController.prototype, 'deleteSession'), Permission.VIEW_OWN_ACCOUNT],
      [method(UsersController.prototype, 'list'), Permission.MANAGE_USERS],
      [method(UsersController.prototype, 'listInvitations'), Permission.MANAGE_INVITATIONS],
      [method(UsersController.prototype, 'createInvitation'), Permission.MANAGE_INVITATIONS],
      [method(UsersController.prototype, 'revokeInvitation'), Permission.MANAGE_INVITATIONS],
      [method(UsersController.prototype, 'updateRole'), Permission.MANAGE_USERS],
      [method(UsersController.prototype, 'updateStatus'), Permission.MANAGE_USERS],
    ] as const;

    for (const [handler, permission] of expected) {
      expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, handler)).toContain(permission);
    }
  });
});

function method(prototype: object, name: string): object {
  const value = Object.getOwnPropertyDescriptor(prototype, name)?.value as unknown;
  if (typeof value !== 'function') throw new Error(`Missing controller method: ${name}`);
  return value;
}
