import { Body, Controller, Get, Header, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';
import { Permission } from '../identity/access-control';
import { CurrentAuth, RequirePermissions } from '../identity/access.decorators';
import { AuthContext } from '../identity/auth-context';
import { CreateStructureRequestDto } from './dto/create-structure-request.dto';
import { ActiveTemplateQueryDto, LocaleQueryDto } from './dto/structure-query.dto';
import { TemplateMigrationPreviewDto } from './dto/template-migration-preview.dto';
import { ScientificStructureService } from './scientific-structure.service';

@Controller('scientific-structure')
@RequirePermissions(Permission.MANAGE_SCIENTIFIC_CONTENT)
export class ScientificStructureController {
  constructor(private readonly structure: ScientificStructureService) {}

  @Get('categories')
  @Header('Cache-Control', 'private, no-store')
  listCategories(@Query() query: LocaleQueryDto) {
    return this.structure.listCategories(query.locale);
  }

  @Get('categories/:categoryId/record-types')
  @Header('Cache-Control', 'private, no-store')
  listRecordTypes(
    @Param('categoryId', ParseUUIDPipe) categoryId: string,
    @Query() query: LocaleQueryDto,
  ) {
    return this.structure.listRecordTypes(categoryId, query.locale);
  }

  @Get('templates/active')
  @Header('Cache-Control', 'private, no-store')
  getActiveTemplate(@Query() query: ActiveTemplateQueryDto) {
    return this.structure.getActiveTemplate(query.categoryId, query.recordTypeId, query.locale);
  }

  @Get('template-versions/:versionId')
  @Header('Cache-Control', 'private, no-store')
  getTemplateVersion(
    @Param('versionId', ParseUUIDPipe) versionId: string,
    @Query() query: LocaleQueryDto,
  ) {
    return this.structure.getTemplateVersion(versionId, query.locale);
  }

  @Post('template-migrations/preview')
  previewTemplateMigration(@Body() input: TemplateMigrationPreviewDto) {
    return this.structure.previewMigration(input.fromVersionId, input.toVersionId, input.mapping);
  }

  @Get('requests')
  @Header('Cache-Control', 'private, no-store')
  listStructureRequests(@Query('limit') limit?: string, @Query('offset') offset?: string) {
    return this.structure.listStructureRequests(parseInteger(limit, 50), parseInteger(offset, 0));
  }

  @Post('requests')
  createStructureRequest(
    @CurrentAuth() auth: AuthContext,
    @Body() input: CreateStructureRequestDto,
  ) {
    return this.structure.createStructureRequest(auth.user.id, input);
  }
}

function parseInteger(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}
