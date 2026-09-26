import { Controller, Delete, Get, Header, Param, ParseUUIDPipe, Put } from '@nestjs/common';
import { Permission } from '../identity/access-control';
import { CurrentAuth, RequirePermissions } from '../identity/access.decorators';
import { AuthContext } from '../identity/auth-context';
import { RecordsService } from './records.service';

@Controller('saved-records')
@RequirePermissions(Permission.MANAGE_SAVED_RECORDS)
export class SavedRecordsController {
  constructor(private readonly records: RecordsService) {}

  @Get()
  @Header('Cache-Control', 'private, no-store')
  list(@CurrentAuth() auth: AuthContext) {
    return this.records.listSaved(auth.user.id);
  }

  @Put(':recordId')
  save(@CurrentAuth() auth: AuthContext, @Param('recordId', ParseUUIDPipe) recordId: string) {
    return this.records.save(auth.user.id, recordId);
  }

  @Delete(':recordId')
  unsave(@CurrentAuth() auth: AuthContext, @Param('recordId', ParseUUIDPipe) recordId: string) {
    return this.records.unsave(auth.user.id, recordId);
  }
}
