import { describe, expect, it } from 'vitest';
import { Permission } from '../identity/access-control';
import { REQUIRED_PERMISSIONS_KEY } from '../identity/access.decorators';
import { RecordsController } from './records.controller';
import { SavedRecordsController } from './saved-records.controller';
import { ScientificStructureController } from './scientific-structure.controller';

describe('scientific content controller policies', () => {
  it('protects all scientific structure and draft record routes with the teacher permission', () => {
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, ScientificStructureController)).toEqual([
      Permission.MANAGE_SCIENTIFIC_CONTENT,
    ]);
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, RecordsController)).toEqual([
      Permission.MANAGE_SCIENTIFIC_CONTENT,
    ]);
  });

  it('limits saved-record routes to the signed-in user capability', () => {
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, SavedRecordsController)).toEqual([
      Permission.MANAGE_SAVED_RECORDS,
    ]);
  });
});
