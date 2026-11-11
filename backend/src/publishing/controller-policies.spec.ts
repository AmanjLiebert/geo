import { describe, expect, it } from 'vitest';
import { Permission } from '../identity/access-control';
import { REQUIRED_PERMISSIONS_KEY } from '../identity/access.decorators';
import { ScientificTrustController } from './scientific-trust.controller';
import { ResearchController } from '../research/research.controller';

describe('Phase 4 controller policies', () => {
  it('protects scientific trust endpoints with teacher scientific permission', () => {
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, ScientificTrustController)).toEqual([
      Permission.MANAGE_SCIENTIFIC_CONTENT,
    ]);
  });

  it('requires restricted-location permission for exact geometry', () => {
    const handler: unknown = Object.getOwnPropertyDescriptor(
      ScientificTrustController.prototype,
      'listLocations',
    )?.value;
    expect(typeof handler).toBe('function');
    if (typeof handler !== 'function') throw new Error('Missing location handler.');
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, handler)).toEqual([
      Permission.MANAGE_SCIENTIFIC_CONTENT,
      Permission.READ_RESTRICTED_LOCATIONS,
    ]);
  });

  it('protects research endpoints with the research permission', () => {
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, ResearchController)).toEqual([
      Permission.MANAGE_RESEARCH,
    ]);
  });
});
