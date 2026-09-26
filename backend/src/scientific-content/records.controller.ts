import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Header,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { Permission } from '../identity/access-control';
import { CurrentAuth, RequirePermissions } from '../identity/access.decorators';
import { AuthContext } from '../identity/auth-context';
import { CreateRecordDto } from './dto/create-record.dto';
import { RecordListQueryDto } from './dto/record-list-query.dto';
import { UpdateRecordDto } from './dto/update-record.dto';
import { localePattern, UpsertRecordTranslationDto } from './dto/upsert-record-translation.dto';
import { RecordsService } from './records.service';

@Controller('records')
@RequirePermissions(Permission.MANAGE_SCIENTIFIC_CONTENT)
export class RecordsController {
  constructor(private readonly records: RecordsService) {}

  @Get()
  @Header('Cache-Control', 'private, no-store')
  list(@Query() query: RecordListQueryDto) {
    return this.records.list(
      parseInteger(query.limit, 50),
      parseInteger(query.offset, 0),
      query.status,
    );
  }

  @Post()
  create(@CurrentAuth() auth: AuthContext, @Body() input: CreateRecordDto) {
    return this.records.create(auth.user.id, input);
  }

  @Get(':id')
  @Header('Cache-Control', 'private, no-store')
  get(@Param('id', ParseUUIDPipe) recordId: string) {
    return this.records.get(recordId);
  }

  @Patch(':id')
  update(
    @CurrentAuth() auth: AuthContext,
    @Param('id', ParseUUIDPipe) recordId: string,
    @Body() input: UpdateRecordDto,
  ) {
    return this.records.update(auth.user.id, recordId, input);
  }

  @Put(':id/translations/:locale')
  upsertTranslation(
    @CurrentAuth() auth: AuthContext,
    @Param('id', ParseUUIDPipe) recordId: string,
    @Param('locale') locale: string,
    @Body() input: UpsertRecordTranslationDto,
  ) {
    if (!localePattern.test(locale)) throw new BadRequestException('Invalid locale.');
    return this.records.upsertTranslation(auth.user.id, recordId, locale, input);
  }

  @Post(':id/validate')
  validate(@Param('id', ParseUUIDPipe) recordId: string) {
    return this.records.validate(recordId);
  }

  @Post(':id/archive')
  archive(@CurrentAuth() auth: AuthContext, @Param('id', ParseUUIDPipe) recordId: string) {
    return this.records.archive(auth.user.id, recordId);
  }

  @Post(':id/restore')
  restore(@CurrentAuth() auth: AuthContext, @Param('id', ParseUUIDPipe) recordId: string) {
    return this.records.restore(auth.user.id, recordId);
  }

  @Get(':id/revisions')
  @Header('Cache-Control', 'private, no-store')
  revisions(@Param('id', ParseUUIDPipe) recordId: string) {
    return this.records.revisions(recordId);
  }
}

function parseInteger(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}
