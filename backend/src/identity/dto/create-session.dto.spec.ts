import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { describe, expect, it } from 'vitest';
import { CreateSessionDto } from './create-session.dto';

describe('session exchange input', () => {
  it('rejects a client-supplied role during public registration', async () => {
    const input = plainToInstance(CreateSessionDto, {
      idToken: 'x'.repeat(40),
      role: 'admin',
    });
    const errors = await validate(input, { whitelist: true, forbidNonWhitelisted: true });
    expect(errors.some((error) => error.property === 'role')).toBe(true);
  });
});
